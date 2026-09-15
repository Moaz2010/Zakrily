from pydantic import BaseModel

from app.schemas.common import QuestionTypeEnum, SkillTagEnum


class QuestionPublic(BaseModel):
    """Question as served to a student — correct_answer is never included."""

    id: int
    lesson_id: int
    skill_tag: SkillTagEnum
    qtype: QuestionTypeEnum
    body: str
    options: dict | None = None


class QuizOut(BaseModel):
    questions: list[QuestionPublic]


class AnswerSubmission(BaseModel):
    question_id: int
    answer: str


class QuizSubmitRequest(BaseModel):
    answers: list[AnswerSubmission]


class QuestionResult(BaseModel):
    question_id: int
    given_answer: str
    is_correct: bool
    correct_answer: str
    explanation: str
    skill_tag: SkillTagEnum


class SkillBreakdownItem(BaseModel):
    skill_tag: SkillTagEnum
    correct: int
    total: int
    accuracy: float | None = None
    insufficient_data: bool = False


class QuizSubmitResponse(BaseModel):
    score: float
    results: list[QuestionResult]
    skill_breakdown: list[SkillBreakdownItem]
    unlocked_next: bool
