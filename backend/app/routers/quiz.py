from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.attempt import AttemptContext, LessonProgress, LessonStatus
from app.models.user import User
from app.schemas.quiz import QuizSubmitRequest, QuizSubmitResponse
from app.services.grading import approved_questions, save_answers
from app.services.progress import accessible_lesson, lesson_path
from app.services.scoring import is_passing

router = APIRouter(tags=["quiz"])


@router.post("/lessons/{lesson_id}/quiz/submit", response_model=QuizSubmitResponse)
def submit_quiz(lesson_id: int, payload: QuizSubmitRequest,
                current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Serialize submissions for this learner, including first progress creation.
    db.query(User).filter(User.id == current_user.id).with_for_update().one()
    lesson = accessible_lesson(db, current_user.id, lesson_id)
    questions = approved_questions(db, lesson_id=lesson_id)
    if not questions or {a.question_id for a in payload.answers} != {q.id for q, _ in questions}:
        raise HTTPException(422, "Submit the complete current quiz")
    results, breakdown = save_answers(db, current_user.id, payload.answers, questions, AttemptContext.lesson_quiz)
    score = sum(r.is_correct for r in results) / len(results)
    before = lesson_path(db, current_user.id, lesson.subject_id)
    progress = db.get(LessonProgress, (current_user.id, lesson_id))
    if progress is None:
        progress = LessonProgress(user_id=current_user.id, lesson_id=lesson_id, status=LessonStatus.unlocked)
        db.add(progress)
    # Keep the best quiz score; all attempts still contribute to accuracy.
    progress.score = max(progress.score if progress.score is not None else 0, score)
    if is_passing(score):
        progress.status = LessonStatus.completed
        progress.completed_at = progress.completed_at or datetime.now(timezone.utc)
    db.flush()
    after = lesson_path(db, current_user.id, lesson.subject_id)
    unlocked_next = any(a.status == "unlocked" and b.status == "locked" for a, b in zip(after, before))
    db.commit()
    return QuizSubmitResponse(score=score, results=results, skill_breakdown=breakdown, unlocked_next=unlocked_next)
