from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.models.user import User
from app.schemas.common import SkillTagEnum
from app.schemas.quiz import (
    QuestionResult,
    QuizSubmitRequest,
    QuizSubmitResponse,
    SkillBreakdownItem,
)

router = APIRouter(tags=["quiz"])


@router.post("/lessons/{lesson_id}/quiz/submit", response_model=QuizSubmitResponse)
def submit_quiz(lesson_id: int, payload: QuizSubmitRequest, current_user: User = Depends(get_current_user)):
    results = [
        QuestionResult(
            question_id=a.question_id,
            given_answer=a.answer,
            is_correct=True,
            correct_answer=a.answer,
            explanation="Sample explanation.",
            skill_tag=SkillTagEnum.memorization,
        )
        for a in payload.answers
    ]
    breakdown = [
        SkillBreakdownItem(skill_tag=tag, correct=1, total=1, accuracy=1.0, insufficient_data=True)
        for tag in SkillTagEnum
    ]
    return QuizSubmitResponse(score=1.0, results=results, skill_breakdown=breakdown, unlocked_next=True)
