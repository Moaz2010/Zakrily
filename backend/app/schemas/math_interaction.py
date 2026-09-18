from typing import Literal

from pydantic import BaseModel, Field


class MathToken(BaseModel):
    id: str
    label: str


class MathSlot(BaseModel):
    id: str
    label: str
    shape: Literal["circle", "square", "underline"] | None = None


class MathInteraction(BaseModel):
    """Only presentation data. Expected placements and grading rules stay private."""
    kind: Literal["mark_digits", "slots", "order", "compare", "number_line", "fields"]
    instruction: str
    tokens: list[MathToken] = Field(default_factory=list)
    slots: list[MathSlot] = Field(default_factory=list)
    reusable: bool = False
    number: str | None = None
    left: str | None = None
    right: str | None = None
    lower: int | None = None
    upper: int | None = None
    value: int | None = None

