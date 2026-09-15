import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class MathVerdict(str, enum.Enum):
    correct = "correct"
    incorrect = "incorrect"
    unreadable = "unreadable"


class MathSubmission(Base):
    __tablename__ = "math_submissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"))
    image_url: Mapped[str] = mapped_column(String(500))
    extracted: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    verdict: Mapped[MathVerdict] = mapped_column(Enum(MathVerdict))
    feedback: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
