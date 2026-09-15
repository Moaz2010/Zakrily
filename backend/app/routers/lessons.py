from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user
from app.models.user import User
from app.curriculum import LESSONS
from app.schemas.common import QuestionTypeEnum, SkillTagEnum
from app.schemas.lesson import LessonDetail, LessonOut
from app.schemas.quiz import QuestionPublic, QuizOut

router = APIRouter(tags=["lessons"])


@router.get("/lessons/{lesson_id}", response_model=LessonDetail)
def get_lesson(lesson_id: int, current_user: User = Depends(get_current_user)):
    item = LESSONS.get(lesson_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Lesson not found")
    lesson = LessonOut(
        id=lesson_id,
        subject_id=item["subject_id"],
        order_index=item["order"],
        title=item["title"],
        objective="",
    )
    return LessonDetail(lesson=lesson, sections=[])


@router.get("/lessons/{lesson_id}/quiz", response_model=QuizOut)
def get_quiz(lesson_id: int, current_user: User = Depends(get_current_user)):
    questions = [
        QuestionPublic(
            id=1,
            lesson_id=lesson_id,
            skill_tag=SkillTagEnum.memorization,
            qtype=QuestionTypeEnum.mcq,
            body="Sample MCQ question?",
            options={"a": "Option A", "b": "Option B", "c": "Option C"},
        ),
        QuestionPublic(
            id=2,
            lesson_id=lesson_id,
            skill_tag=SkillTagEnum.application,
            qtype=QuestionTypeEnum.short_answer,
            body="Sample short-answer question?",
            options=None,
        ),
    ]
    return QuizOut(questions=questions)
