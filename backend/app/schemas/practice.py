from pydantic import BaseModel

from app.schemas.quiz import AnswerSubmission, QuestionPublic, QuestionResult, SkillBreakdownItem


class PracticeSetOut(BaseModel):
    questions: list[QuestionPublic]


class PracticeSubmitRequest(BaseModel):
    answers: list[AnswerSubmission]


class PracticeSubmitResponse(BaseModel):
    results: list[QuestionResult]
    skill_breakdown: list[SkillBreakdownItem]
