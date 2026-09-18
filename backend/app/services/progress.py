"""Learner statistics derived from saved attempts and quiz progress."""
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models.attempt import Attempt, LessonProgress, LessonStatus
from app.models.lesson import Lesson
from app.models.question import Question, ReviewStatus
from app.models.subject import Subject
from app.schemas.subject import PathNode


def lesson_path(db: Session, user_id: int, subject_id: int) -> list[PathNode]:
    rows = db.query(Lesson, LessonProgress).outerjoin(
        LessonProgress,
        (LessonProgress.lesson_id == Lesson.id) & (LessonProgress.user_id == user_id),
    ).filter(Lesson.subject_id == subject_id).order_by(Lesson.order_index, Lesson.id).all()
    previous_completed = True
    nodes = []
    # Count distinct work, so practice and review never inflate or erase progress.
    question_ids = defaultdict(set)
    for lesson_id, question_id in db.query(Question.lesson_id, Question.id).join(
        Lesson, Question.lesson_id == Lesson.id,
    ).filter(Lesson.subject_id == subject_id, Question.review_status == ReviewStatus.approved):
        question_ids[lesson_id].add(question_id)
    attempted = {qid for (qid,) in db.query(Attempt.question_id).join(
        Question, Attempt.question_id == Question.id,
    ).join(Lesson, Question.lesson_id == Lesson.id).filter(
        Attempt.user_id == user_id, Lesson.subject_id == subject_id).distinct()}
    subject = db.get(Subject, subject_id)
    for lesson, progress in rows:
        completed = progress is not None and progress.status == LessonStatus.completed
        status = "completed" if completed else "unlocked" if previous_completed else "locked"
        saved = (progress.learning_state or {}) if progress else {}
        parts = []
        learning_total = saved.get("learning_total")
        if subject.slug.value == "science":
            learning_total = {1: 20, 2: 11}.get(lesson.order_index, learning_total)
        if learning_total:
            parts.append(len({s for s in saved.get("learned_steps", []) if 0 <= s < learning_total}) / learning_total)
        ids = question_ids[lesson.id]
        if ids:
            reflections = {int(qid) for qid in saved.get("reflections", {})}
            parts.append(len(ids & (attempted | reflections)) / len(ids))
        fraction = 1.0 if completed else sum(parts) / len(parts) if parts else 0.0
        nodes.append(PathNode(lesson_id=lesson.id, order=lesson.order_index,
                              title=lesson.title, status=status,
                              progress=fraction,
                              score=progress.score if progress else None))
        previous_completed = completed
    return nodes


def accessible_lesson(db: Session, user_id: int, lesson_id: int) -> Lesson:
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(404, "Lesson not found")
    node = next(n for n in lesson_path(db, user_id, lesson.subject_id) if n.lesson_id == lesson_id)
    if node.status == "locked":
        raise HTTPException(403, "أكمل الدرس السابق الأول علشان تفتح أسئلة الدرس ده.")
    return lesson


def current_streak(days: set, today) -> int:
    cursor = today if today in days else today - timedelta(days=1)
    streak = 0
    while cursor in days:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def learner_stats(db: Session, user_id: int, tz: ZoneInfo, now: datetime | None = None):
    now = now or datetime.now(timezone.utc)
    today = now.astimezone(tz).date()
    counts = {
        subject_id: (int(correct), int(total))
        for subject_id, correct, total in db.query(
            Lesson.subject_id,
            func.sum(case((Attempt.is_correct.is_(True), 1), else_=0)),
            func.count(Attempt.id),
        ).join(Question, Attempt.question_id == Question.id).join(
            Lesson, Question.lesson_id == Lesson.id,
        ).filter(Attempt.user_id == user_id).group_by(Lesson.subject_id).all()
    }
    activity = defaultdict(lambda: defaultdict(int))
    for created_at, subject_id in db.query(Attempt.created_at, Lesson.subject_id).join(
        Question, Attempt.question_id == Question.id,
    ).join(Lesson, Question.lesson_id == Lesson.id).filter(Attempt.user_id == user_id):
        # SQLite returns naive timestamps; persisted timestamps represent UTC.
        day = created_at.replace(tzinfo=timezone.utc).astimezone(tz).date() if created_at.tzinfo is None else created_at.astimezone(tz).date()
        if day <= today:
            activity[day][subject_id] += 1
    subjects = []
    for subject in db.query(Subject).order_by(Subject.id):
        nodes = lesson_path(db, user_id, subject.id)
        correct, total = counts.get(subject.id, (0, 0))
        next_lesson = next((n for n in nodes if n.status == "unlocked"), None)
        completed = sum(n.status == "completed" for n in nodes)
        subjects.append(dict(
            id=subject.id, slug=subject.slug, name_ar=subject.name_ar, name_en=subject.name_en,
            correct=correct, total_attempts=total, accuracy=correct / total if total else None,
            completed_lessons=completed, total_lessons=len(nodes),
            next_lesson=next_lesson, lessons=nodes,
        ))
    correct = sum(s[0] for s in counts.values())
    total = sum(s[1] for s in counts.values())
    week = []
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        week.append(dict(date=day, total=sum(activity[day].values()), subjects=[
            dict(subject_id=s["id"], count=activity[day].get(s["id"], 0)) for s in subjects
        ]))
    # Only dates with actual attempts count; zero-filled chart days do not.
    active_days = {day for day, values in activity.items() if sum(values.values()) > 0}
    return dict(timezone=tz.key, streak_days=current_streak(active_days, today),
                correct=correct, total_attempts=total, accuracy=correct / total if total else None,
                week=week, subjects=subjects)
