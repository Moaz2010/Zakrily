"""Resumable lesson questions using the existing question/attempt/progress tables."""
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import HTTPException

from app.models.attempt import Attempt, AttemptContext, LessonProgress, LessonStatus
from app.models.subject import Subject
from app.models.user import User
from app.schemas.activity import ActivityQuestion, ActivityState
from app.schemas.quiz import QuestionResult, SkillBreakdownItem
from app.services.grading import approved_questions, public_question, save_answers
from app.services.progress import accessible_lesson
from app.services.scoring import has_sufficient_data, is_passing


def load(db, user_id, lesson_id, lock=False):
    if lock:
        db.query(User).filter_by(id=user_id).with_for_update().one()
    lesson = accessible_lesson(db, user_id, lesson_id)
    subject = db.get(Subject, lesson.subject_id)
    if subject.slug.value not in {"science", "english", "math"}:
        raise HTTPException(422, "This activity is available for Science, English, and Math lessons")
    bank = [(q, tag) for q, tag in approved_questions(db, lesson_id=lesson_id, include_unscored=True)
            if (q.grading_data or {}).get("number") is not None]
    progress = db.get(LessonProgress, (user_id, lesson_id))
    return lesson, bank, progress


def ensure_progress(db, user_id, lesson_id, progress):
    if progress is None:
        progress = LessonProgress(user_id=user_id, lesson_id=lesson_id, status=LessonStatus.unlocked, learning_state={})
        db.add(progress)
        db.flush()
    return progress


def evidence(db, user_id, bank, since=0):
    ids = [q.id for q, _ in bank]
    latest, first = {}, {}
    for attempt in db.query(Attempt).filter(Attempt.user_id == user_id, Attempt.question_id.in_(ids)).order_by(Attempt.id):
        latest[attempt.question_id] = attempt
        if attempt.context == AttemptContext.lesson_quiz and attempt.id > since:
            first.setdefault(attempt.question_id, attempt)
    return latest, first


def state(db, user_id, lesson_id, practice=False):
    _, bank, progress = load(db, user_id, lesson_id)
    saved = (progress.learning_state or {}) if progress else {}
    latest, first = evidence(db, user_id, bank, saved.get("review_after", 0))
    reflections = saved.get("review_reflections" if saved.get("review_active") else "reflections", {})
    totals = defaultdict(lambda: [0, 0])
    for q, tag in bank:
        if q.id in latest and q.grading_data.get("scored", True):
            totals[tag.slug.value][0] += int(latest[q.id].is_correct)
            totals[tag.slug.value][1] += 1
    skills = [SkillBreakdownItem(skill_tag=tag, correct=c, total=t, accuracy=c/t,
                                insufficient_data=not has_sufficient_data(t)) for tag, (c, t) in totals.items()]
    minimum = min((s.accuracy for s in skills if s.accuracy < 1), default=None)
    weakest = [s.skill_tag.value for s in skills if s.accuracy == minimum]
    candidates = []
    for q, tag in bank:
        if practice:
            if q.id not in latest or latest[q.id].is_correct or tag.slug.value not in weakest:
                continue
        elif q.id in first or str(q.id) in reflections:
            continue
        candidates.append(ActivityQuestion(**public_question(q, tag).model_dump(),
                                          number=q.grading_data["number"], scored=q.grading_data.get("scored", True),
                                          previous_attempt_id=latest[q.id].id if q.id in latest else 0))
    candidates.sort(key=lambda q: q.number)
    correct = sum(s.correct for s in skills)
    attempted = sum(s.total for s in skills)
    return ActivityState(questions=candidates, total=len(bank), answered=len(first) + len(reflections),
                         correct=correct, scored_total=sum(q.grading_data.get("scored", True) for q, _ in bank),
                         score=correct / attempted if attempted else None, skills=skills, weakest=weakest,
                         learned_steps=saved.get("learned_steps", []), drafts=saved.get("drafts", {}))


def submit(db, user_id, lesson_id, payload):
    _, bank, progress = load(db, user_id, lesson_id, lock=True)
    match = next(((q, tag) for q, tag in bank if q.id == payload.question_id), None)
    if match is None or not payload.answer.strip():
        raise HTTPException(422, "Answer a question from this lesson")
    q, tag = match
    progress = ensure_progress(db, user_id, lesson_id, progress)
    saved = dict(progress.learning_state or {})
    latest, first = evidence(db, user_id, bank, saved.get("review_after", 0))
    feedback = None
    if not q.grading_data.get("scored", True):
        if payload.practice:
            raise HTTPException(422, "Reflections are not scored practice")
        reflection_key = "review_reflections" if saved.get("review_active") else "reflections"
        saved[reflection_key] = {**saved.get(reflection_key, {}), str(q.id): payload.answer}
    elif not payload.practice and q.id in first:
        old = first[q.id]
        feedback = QuestionResult(question_id=q.id, given_answer=old.given_answer, is_correct=old.is_correct,
                                  correct_answer=q.correct_answer, explanation=q.explanation, skill_tag=tag.slug.value)
    else:
        previous = latest.get(q.id)
        if payload.practice:
            # Compare-and-save prevents network retries from creating extra attempts.
            if not previous or previous.id != payload.previous_attempt_id or previous.is_correct:
                raise HTTPException(409, "This practice question has changed. Reload to continue.")
            eligible = state(db, user_id, lesson_id, practice=True)
            if q.id not in {item.id for item in eligible.questions}:
                raise HTTPException(422, "Choose a question from your current weakest skills")
        if q.qtype.value == "mcq" and payload.answer not in (q.options or {}):
            raise HTTPException(422, "Choose one of the supplied options")
        results, _ = save_answers(db, user_id, [payload], [match],
                                  AttemptContext.practice if payload.practice else AttemptContext.lesson_quiz)
        feedback = results[0]
    drafts = dict(saved.get("drafts", {}))
    drafts.pop(str(q.id), None)
    saved["drafts"] = drafts
    progress.learning_state = saved
    db.flush()
    result = state(db, user_id, lesson_id, payload.practice)
    if result.total and result.answered == result.total:
        score = result.correct / result.scored_total if result.scored_total else 0
        progress.score = max(progress.score or 0, score)
        if is_passing(score):
            progress.status = LessonStatus.completed
            progress.completed_at = progress.completed_at or datetime.now(timezone.utc)
    db.commit()
    result.feedback = feedback
    result.reflection_saved = not q.grading_data.get("scored", True)
    return result


def restart(db, user_id, lesson_id):
    """Start a resumable review round; never erase attempts, best scores or learning."""
    _, bank, progress = load(db, user_id, lesson_id, lock=True)
    current = state(db, user_id, lesson_id)
    if not bank:
        raise HTTPException(422, "No questions available")
    if current.answered != current.total:
        # Repeated clicks or retries resume the already-started round.
        return current
    latest, _ = evidence(db, user_id, bank)
    progress = ensure_progress(db, user_id, lesson_id, progress)
    progress.learning_state = {**(progress.learning_state or {}), "review_active": True,
                               "review_after": max((a.id for a in latest.values()), default=0),
                               "review_reflections": {}, "drafts": {}}
    db.commit()
    return state(db, user_id, lesson_id)
