"""Learner-owned generated quizzes and skill practice, separate from the exercise bank."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.ai_service.quiz_generator import MAX_QUESTIONS, MIN_QUESTIONS, generate
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.attempt import AttemptContext, LessonProgress, LessonStatus
from app.models.content_chunk import ContentChunk
from app.models.generated_quiz import GeneratedQuiz
from app.models.question import Question, QuestionType, ReviewStatus, SkillTag, SkillTagSlug
from app.models.subject import Subject
from app.models.user import User
from app.schemas.quiz import AnswerSubmission
from app.services.grading import public_question, save_answers
from app.services.progress import accessible_lesson
from app.services.scoring import is_passing
from app.services import rewards

router = APIRouter(tags=["generated-quiz"])
QUIZ_VERSION = "content-v2"


class StartRequest(BaseModel):
    skill: SkillTagSlug | None = None
    quiz_id: int | None = None


class SubmitRequest(BaseModel):
    answers: list[AnswerSubmission] = Field(min_length=MIN_QUESTIONS, max_length=MAX_QUESTIONS)


def bank(db, run):
    rows = db.query(Question, SkillTag).join(SkillTag).filter(Question.id.in_(run.question_ids)).all()
    by_id = {q.id: (q, tag) for q, tag in rows}
    return [by_id[qid] for qid in run.question_ids]


def public_run(db, run):
    return dict(id=run.id, skill=run.skill, attempt=int(run.slot.split(":")[-1]) if not run.skill else None,
                quiz_id=int(run.slot.split(":")[1]) if run.skill else None,
                questions=[public_question(q, tag) for q, tag in bank(db, run)], result=run.result)


def owned_run(db, user_id, lesson_id, run_id):
    run = db.query(GeneratedQuiz).filter_by(id=run_id, user_id=user_id, lesson_id=lesson_id).first()
    if run is None:
        raise HTTPException(404, "Quiz not found")
    return run


@router.get("/lessons/{lesson_id}/generated-quiz")
def state(lesson_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    accessible_lesson(db, current_user.id, lesson_id)
    all_runs = db.query(GeneratedQuiz).filter_by(user_id=current_user.id, lesson_id=lesson_id).order_by(GeneratedQuiz.id).all()
    runs = [r for r in all_runs if r.skill is not None or r.slot.startswith(f"quiz:{QUIZ_VERSION}:")]
    quizzes = [r for r in runs if r.skill is None]
    return dict(attempts_used=len(quizzes), max_attempts=3, runs=[public_run(db, r) for r in runs])


@router.post("/lessons/{lesson_id}/generated-quiz/start")
def start(lesson_id: int, payload: StartRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lesson = accessible_lesson(db, current_user.id, lesson_id)
    runs = db.query(GeneratedQuiz).filter_by(user_id=current_user.id, lesson_id=lesson_id).order_by(GeneratedQuiz.id).all()
    if payload.skill:
        parent = owned_run(db, current_user.id, lesson_id, payload.quiz_id)
        if parent.skill or parent.result is None:
            raise HTTPException(409, "Finish the quiz before starting skill practice")
        slot = f"practice:{parent.id}:{payload.skill.value}"
    else:
        quizzes = [r for r in runs if r.skill is None and r.slot.startswith(f"quiz:{QUIZ_VERSION}:")]
        active = next((r for r in quizzes if r.result is None), None)
        if active:
            return public_run(db, active)
        if len(quizzes) >= 3:
            raise HTTPException(409, "استخدمت المحاولات الثلاث لهذا الدرس. يمكنك متابعة تدريب المهارات.")
        slot = f"quiz:{QUIZ_VERSION}:{len(quizzes) + 1}"
    existing = next((r for r in runs if r.slot == slot), None)
    if existing:
        return public_run(db, existing)
    sources = [r for r in db.query(ContentChunk).filter_by(lesson_id=lesson_id, subject_id=lesson.subject_id).order_by(ContentChunk.id)
               if not (r.chunk_metadata or {}).get("retired")
               and (r.chunk_metadata or {}).get("content_type") != "exercise"]
    if not lesson.is_published:
        raise HTTPException(409, "محتوى الدرس غير جاهز بعد.")
    previous = [q.body for r in runs for q, _ in bank(db, r)]
    generated = generate(lesson, db.get(Subject, lesson.subject_id), sources,
                         skill=payload.skill.value if payload.skill else None, previous=previous)
    tags = {tag.slug: tag.id for tag in db.query(SkillTag)}
    # Generated questions remain outside the approved shared exercise bank.
    questions = [Question(lesson_id=lesson_id, skill_tag_id=tags[q.skill], qtype=QuestionType.mcq,
                          body=q.body, options=q.options, correct_answer=q.correct_answer,
                          explanation=q.explanation, source_chunk_id=q.source_id,
                          grading_data={"generated": True, "source_quote": q.source_quote},
                          review_status=ReviewStatus.pending) for q in generated]
    try:
        db.add_all(questions)
        db.flush()
        run = GeneratedQuiz(user_id=current_user.id, lesson_id=lesson_id, slot=slot,
                            skill=payload.skill.value if payload.skill else None,
                            question_ids=[q.id for q in questions])
        db.add(run)
        db.commit()
    except IntegrityError:
        # Simultaneous tabs share the same reserved slot; discard duplicate questions.
        db.rollback()
        run = db.query(GeneratedQuiz).filter_by(user_id=current_user.id, lesson_id=lesson_id, slot=slot).first()
        if run is None:
            raise
    return public_run(db, run)


@router.post("/lessons/{lesson_id}/generated-quiz/{run_id}/submit")
def submit(lesson_id: int, run_id: int, payload: SubmitRequest,
           current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    accessible_lesson(db, current_user.id, lesson_id)
    run = owned_run(db, current_user.id, lesson_id, run_id)
    if run.result is not None:
        return public_run(db, run)
    questions = bank(db, run)
    ids = [a.question_id for a in payload.answers]
    if len(ids) != len(set(ids)) or set(ids) != set(run.question_ids):
        raise HTTPException(422, "أجب عن جميع أسئلة الاختبار مرة واحدة.")
    options = {q.id: q.options for q, _ in questions}
    if any(a.answer not in options[a.question_id] for a in payload.answers):
        raise HTTPException(422, "اختر إجابة صالحة لكل سؤال.")
    # Atomic claim also works on SQLite, where SELECT FOR UPDATE is ignored.
    claimed = db.execute(update(GeneratedQuiz).where(GeneratedQuiz.id == run.id,
                         GeneratedQuiz.result.is_(None)).values(result={}).execution_options(synchronize_session=False))
    if not claimed.rowcount:
        db.rollback()
        db.refresh(run)
        return public_run(db, run)
    results, breakdown = save_answers(db, current_user.id, payload.answers, questions,
                                     AttemptContext.practice if run.skill else AttemptContext.lesson_quiz)
    score = sum(r.is_correct for r in results) / len(results)
    motivation_points = 20 if score >= 0.9 else 10 if score >= 0.8 else 0
    weakest = min(item.accuracy for item in breakdown)
    result = dict(score=score, correct=sum(r.is_correct for r in results), total=len(results),
                  results=[r.model_dump(mode="json") for r in results],
                  skill_breakdown=[b.model_dump(mode="json") for b in breakdown],
                  weakest_skills=[b.skill_tag.value for b in breakdown if b.accuracy == weakest and weakest < 1],
                  motivation_points=motivation_points,
                  motivation_message=("يا سلام! نتيجتك ٩٠٪ أو أكتر — ممتاز يا بطل! كسبت ٢٠ نقطة إضافية 🎉"
                                      if score >= 0.9 else
                                      "برافو! عديت ٨٠٪ — شاطر جدًا! كسبت ١٠ نقاط إضافية 👏"
                                      if score >= 0.8 else
                                      "كمّل المحاولة! راجع الإجابات وجرّب تاني 💪"))
    if motivation_points:
        rewards.award(db, rewards.locked_account(db, current_user.id),
                      f"generated-quiz:{run.id}:motivation", "motivation", motivation_points)
    run.result = result
    if not run.skill:
        db.query(User).filter_by(id=current_user.id).with_for_update().one()
        progress = db.get(LessonProgress, (current_user.id, lesson_id))
        if progress is None:
            progress = LessonProgress(user_id=current_user.id, lesson_id=lesson_id, status=LessonStatus.unlocked)
            db.add(progress)
        progress.score = max(progress.score or 0, score)
        if is_passing(score):
            progress.status = LessonStatus.completed
            progress.completed_at = progress.completed_at or datetime.now(timezone.utc)
    db.commit()
    return public_run(db, run)
