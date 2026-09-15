from pydantic import BaseModel

from app.schemas.common import MathVerdictEnum


class MathSubmitResponse(BaseModel):
    verdict: MathVerdictEnum
    feedback: str
    extracted: dict | None = None
