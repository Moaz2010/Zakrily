from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.models.user import User
from app.schemas.common import QuestionTypeEnum, SkillTagEnum
from app.schemas.lesson import LessonDetail, LessonOut, LessonSectionOut
from app.schemas.quiz import QuestionPublic, QuizOut

router = APIRouter(tags=["lessons"])


@router.get("/lessons/{lesson_id}", response_model=LessonDetail)
def get_lesson(lesson_id: int, current_user: User = Depends(get_current_user)):
    lesson = LessonOut(
        id=lesson_id,
        subject_id=1,
        order_index=1,
        title=f"Lesson {lesson_id}",
        objective="Sample objective for prototype fixture.",
    )
    sections = [
        LessonSectionOut(id=1, order_index=1, heading="Introduction", body_md="Sample lesson content."),
        LessonSectionOut(id=2, order_index=2, heading="Key Points", body_md="- Point one\n- Point two"),
    ]
    return LessonDetail(lesson=lesson, sections=sections)


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
