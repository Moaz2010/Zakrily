import enum

from sqlalchemy import Enum, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SkillTagSlug(str, enum.Enum):
    memorization = "memorization"
    comprehension = "comprehension"
    application = "application"
    analysis = "analysis"


class QuestionType(str, enum.Enum):
    mcq = "mcq"
    short_answer = "short_answer"
    numeric = "numeric"


class ReviewStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class SkillTag(Base):
    __tablename__ = "skill_tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[SkillTagSlug] = mapped_column(Enum(SkillTagSlug), unique=True)
    label_ar: Mapped[str] = mapped_column(String(120))


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id"), index=True)
    skill_tag_id: Mapped[int] = mapped_column(ForeignKey("skill_tags.id"))
    qtype: Mapped[QuestionType] = mapped_column(Enum(QuestionType))
    body: Mapped[str] = mapped_column(Text)
    options: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    correct_answer: Mapped[str] = mapped_column(Text)
    explanation: Mapped[str] = mapped_column(Text, default="")
    source_chunk_id: Mapped[int | None] = mapped_column(ForeignKey("content_chunks.id"), nullable=True)
    review_status: Mapped[ReviewStatus] = mapped_column(Enum(ReviewStatus), default=ReviewStatus.pending)
