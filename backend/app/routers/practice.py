from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.models.user import User
from app.schemas.common import QuestionTypeEnum, SkillTagEnum, SubjectSlugEnum
from app.schemas.practice import PracticeSetOut, PracticeSubmitRequest, PracticeSubmitResponse
from app.schemas.quiz import QuestionPublic, QuestionResult, SkillBreakdownItem

router = APIRouter(tags=["practice"])


@router.get("/practice/next", response_model=PracticeSetOut)
def practice_next(subject: SubjectSlugEnum, n: int = 5, current_user: User = Depends(get_current_user)):
    questions = [
        QuestionPublic(
            id=i,
            lesson_id=1,
            skill_tag=SkillTagEnum.analysis,
            qtype=QuestionTypeEnum.mcq,
            body=f"Practice question {i}?",
            options={"a": "A", "b": "B"},
        )
        for i in range(1, n + 1)
    ]
    return PracticeSetOut(questions=questions)


@router.post("/practice/submit", response_model=PracticeSubmitResponse)
def practice_submit(payload: PracticeSubmitRequest, current_user: User = Depends(get_current_user)):
    results = [
        QuestionResult(
            question_id=a.get("question_id"),
            given_answer=a.get("answer", ""),
            is_correct=True,
            correct_answer=a.get("answer", ""),
            explanation="Sample explanation.",
            skill_tag=SkillTagEnum.analysis,
        )
        for a in payload.answers
    ]
    breakdown = [
        SkillBreakdownItem(skill_tag=tag, correct=1, total=1, accuracy=1.0, insufficient_data=True)
        for tag in SkillTagEnum
    ]
    return PracticeSubmitResponse(results=results, skill_breakdown=breakdown)
