from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.lesson import Lesson
from app.models.subject import Subject, SubjectSlug
from app.models.user import User
from app.schemas.lesson import LessonDetail
from app.schemas.quiz import QuizOut
from app.services.grading import approved_questions, public_question
from app.services.progress import accessible_lesson
from app.services import lesson_activity
from app.schemas.activity import ActivityState, ActivityAnswer, ActivityProgress
from app.services import rewards
from app.services.learning_cards import card_count as count_learning_cards
from app.models.attempt import LessonProgress

router = APIRouter(tags=["lessons"])


@router.get("/lessons/{lesson_id}/learning")
def get_learning(lesson_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lesson = accessible_lesson(db, current_user.id, lesson_id)
    progress = db.get(LessonProgress, (current_user.id, lesson_id))
    return dict(learned_steps=(progress.learning_state or {}).get("learned_steps", []) if progress else [],
                learning_total=count_learning_cards(db, lesson))


@router.put("/lessons/{lesson_id}/learning")
def save_learning(lesson_id: int, payload: ActivityProgress,
                  current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lesson = accessible_lesson(db, current_user.id, lesson_id)
    count = count_learning_cards(db, lesson)
    if any(step not in range(count) for step in payload.learned_steps):
        raise HTTPException(422, "Unknown learning stop")
    account = rewards.locked_account(db, current_user.id)
    progress = lesson_activity.ensure_progress(db, current_user.id, lesson_id,
                                               db.get(LessonProgress, (current_user.id, lesson_id)))
    saved = dict(progress.learning_state or {})
    saved["learning_total"] = count
    saved["learned_steps"] = sorted(set(saved.get("learned_steps", [])) | set(payload.learned_steps))
    progress.learning_state = saved
    for step in set(payload.learned_steps):
        rewards.award(db, account, f"card:{lesson_id}:{step}", "card", 10)
    db.commit()
    return dict(learned_steps=saved["learned_steps"], learning_total=count)


@router.get("/lessons/{lesson_id}/activity", response_model=ActivityState)
def get_activity(lesson_id: int, practice: bool = False, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return lesson_activity.state(db, current_user.id, lesson_id, practice)


@router.post("/lessons/{lesson_id}/activity/answer", response_model=ActivityState)
def answer_activity(lesson_id: int, payload: ActivityAnswer, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return lesson_activity.submit(db, current_user.id, lesson_id, payload)


@router.post("/lessons/{lesson_id}/activity/restart", response_model=ActivityState)
def restart_activity(lesson_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return lesson_activity.restart(db, current_user.id, lesson_id)


@router.put("/lessons/{lesson_id}/activity/progress", response_model=ActivityState)
def save_activity_progress(lesson_id: int, payload: ActivityProgress, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lesson, bank, progress = lesson_activity.load(db, current_user.id, lesson_id, lock=True)
    card_count = count_learning_cards(db, lesson)
    if any(step not in range(card_count) for step in payload.learned_steps):
        raise HTTPException(422, "Unknown learning stop")
    progress = lesson_activity.ensure_progress(db, current_user.id, lesson_id, progress)
    account = rewards.locked_account(db, current_user.id)
    for step in set(payload.learned_steps):
        rewards.award(db, account, f"card:{lesson_id}:{step}", "card", 10)
    saved = dict(progress.learning_state or {})
    saved["learning_total"] = card_count
    saved["learned_steps"] = sorted(set(saved.get("learned_steps", [])) | set(payload.learned_steps))
    if payload.draft:
        if payload.draft.question_id not in {q.id for q, _ in bank} or len(payload.draft.answer) > 4000:
            raise HTTPException(422, "Invalid draft")
        latest, _ = lesson_activity.evidence(db, current_user.id, bank)
        if payload.draft.question_id not in latest:
            saved["drafts"] = {**saved.get("drafts", {}), str(payload.draft.question_id): payload.draft.answer}
    progress.learning_state = saved
    db.commit()
    return lesson_activity.state(db, current_user.id, lesson_id)


@router.get("/lessons/{lesson_id}", response_model=LessonDetail)
def get_lesson(lesson_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        raise HTTPException(404, "Lesson not found")
    return dict(lesson=lesson, sections=lesson.sections if lesson.is_published else [])


@router.get("/lessons/{lesson_id}/quiz", response_model=QuizOut)
def get_quiz(lesson_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    accessible_lesson(db, current_user.id, lesson_id)
    return QuizOut(questions=[public_question(q, tag) for q, tag in approved_questions(db, lesson_id=lesson_id)])
