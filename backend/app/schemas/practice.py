from pydantic import BaseModel

from app.schemas.quiz import QuestionPublic, QuestionResult, SkillBreakdownItem


class PracticeSetOut(BaseModel):
    questions: list[QuestionPublic]


class PracticeSubmitRequest(BaseModel):
    answers: list[dict]


class PracticeSubmitResponse(BaseModel):
    results: list[QuestionResult]
    skill_breakdown: list[SkillBreakdownItem]
