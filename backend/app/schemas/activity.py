from pydantic import BaseModel, Field
from app.schemas.quiz import QuestionPublic, QuestionResult, SkillBreakdownItem, AnswerSubmission


class ActivityQuestion(QuestionPublic):
    number: int
    scored: bool
    previous_attempt_id: int = 0


class ActivityState(BaseModel):
    questions: list[ActivityQuestion]
    total: int
    answered: int
    correct: int
    scored_total: int
    score: float | None
    skills: list[SkillBreakdownItem]
    weakest: list[str]
    learned_steps: list[int]
    drafts: dict[str, str]
    feedback: QuestionResult | None = None
    reflection_saved: bool = False


class ActivityAnswer(AnswerSubmission):
    answer: str = Field(min_length=1, max_length=4000)
    practice: bool = False
    previous_attempt_id: int = 0


class ActivityProgress(BaseModel):
    learned_steps: list[int] = Field(default_factory=list, max_length=500)
    learning_total: int | None = Field(default=None, ge=1, le=500)
    draft: AnswerSubmission | None = None
