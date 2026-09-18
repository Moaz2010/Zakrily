from pydantic import BaseModel

from app.schemas.common import MathVerdictEnum


class MathSubmitResponse(BaseModel):
    verdict: MathVerdictEnum
    feedback: str
    extracted: dict | None = None


class MathTutorQuestionResponse(BaseModel):
    question: str
    model: str


class MathTutorFeedbackResponse(BaseModel):
    feedback: str
    model: str
