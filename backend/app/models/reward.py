from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class RewardAccount(Base):
    __tablename__ = "reward_accounts"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    points: Mapped[int] = mapped_column(Integer, default=0)
    correct_streak: Mapped[int] = mapped_column(Integer, default=0)
    study_ms: Mapped[int] = mapped_column(BigInteger, default=0)
    last_pulse: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class RewardEvent(Base):
    __tablename__ = "reward_events"
    __table_args__ = (UniqueConstraint("user_id", "source", name="uq_reward_source"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    source: Mapped[str] = mapped_column(String(160))
    kind: Mapped[str] = mapped_column(String(30))
    points: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
