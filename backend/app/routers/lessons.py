from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.lesson import Lesson
from app.models.user import User
from app.schemas.lesson import LessonDetail
from app.schemas.quiz import QuizOut
from app.services.grading import approved_questions, public_question
from app.services.progress import accessible_lesson

router = APIRouter(tags=["lessons"])


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
