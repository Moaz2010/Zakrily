from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, JSON, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class GeneratedQuiz(Base):
    __tablename__ = "generated_quizzes"
    __table_args__ = (UniqueConstraint("user_id", "lesson_id", "slot", name="uq_generated_quiz_slot"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id"), index=True)
    slot: Mapped[str] = mapped_column(String(100))
    skill: Mapped[str | None] = mapped_column(String(30), nullable=True)
    question_ids: Mapped[list] = mapped_column(JSON)
    result: Mapped[dict | None] = mapped_column(JSON(none_as_null=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
