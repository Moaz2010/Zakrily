"""Account-owned rewards. Callers commit points together with the learning action."""
from datetime import datetime, timezone

from sqlalchemy import update

from app.models.attempt import Attempt, LessonProgress
from app.models.reward import RewardAccount, RewardEvent
from app.models.user import User


def award(db, account, source, kind, points, created_at=None):
    if db.query(RewardEvent.id).filter_by(user_id=account.user_id, source=source).first():
        return False
    event = RewardEvent(user_id=account.user_id, source=source, kind=kind, points=points)
    if created_at is not None:
        event.created_at = created_at
    db.add(event)
    account.points += points
    db.flush()
    return True


def answer_reward(db, account, question_id, correct, created_at=None):
    # A solved question cannot be replayed to farm points or streak bonuses.
    source = f"question:{question_id}"
    if db.query(RewardEvent.id).filter_by(user_id=account.user_id, source=source).first():
        if not correct:
            account.correct_streak = 0
        return
    if not correct:
        account.correct_streak = 0
        return
    award(db, account, source, "answer", 5, created_at)
    account.correct_streak += 1
    if account.correct_streak % 5 == 0:
        award(db, account, f"streak:{question_id}", "streak", 10, created_at)


def locked_account(db, user_id):
    # A write lock serializes first creation and rewards on SQLite as well as Postgres.
    db.execute(update(User).where(User.id == user_id).values(name=User.name))
    account = db.get(RewardAccount, user_id, populate_existing=True)
    if account is None:
        account = RewardAccount(user_id=user_id, points=0, correct_streak=0, study_ms=0)
        db.add(account)
        db.flush()
        # Preserve already saved learning when enabling rewards for an existing account.
        for progress in db.query(LessonProgress).filter_by(user_id=user_id):
            for step in set((progress.learning_state or {}).get("learned_steps", [])):
                award(db, account, f"card:{progress.lesson_id}:{step}", "card", 10)
        for attempt in db.query(Attempt).filter_by(user_id=user_id).order_by(Attempt.id):
            answer_reward(db, account, attempt.question_id, attempt.is_correct, attempt.created_at)
    return account


def summary(account):
    points = account.points if account else 0
    badges = points // 300
    return dict(points=points, badges=badges, points_to_badge=300 - points % 300,
                discounts=badges // 10, discount_percent=10,
                badges_to_discount=10 - badges % 10,
                correct_streak=account.correct_streak if account else 0,
                study_seconds=(account.study_ms // 1000) if account else 0)


def pulse(db, account, active, now=None):
    now = now or datetime.now(timezone.utc)
    if active and account.last_pulse is not None:
        previous = account.last_pulse.replace(tzinfo=timezone.utc)
        elapsed = max(0, int((now - previous).total_seconds() * 1000))
        # No credit for offline gaps, hidden tabs, or time claimed by a client clock.
        if elapsed <= 45_000:
            old_blocks = account.study_ms // 300_000
            account.study_ms += elapsed
            new_blocks = account.study_ms // 300_000
            for block in range(old_blocks + 1, new_blocks + 1):
                award(db, account, f"study:{block}", "study", 10)
    account.last_pulse = now if active else None
