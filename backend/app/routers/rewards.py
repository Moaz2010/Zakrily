from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.reward import RewardEvent
from app.models.user import User
from app.services import rewards

router = APIRouter(prefix="/me/rewards", tags=["rewards"])


@router.get("")
def get_rewards(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    account = rewards.locked_account(db, user.id)
    db.commit()
    return rewards.summary(account)


@router.get("/history")
def history(before: int | None = Query(default=None, ge=1),
            user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(RewardEvent).filter_by(user_id=user.id)
    if before is not None:
        query = query.filter(RewardEvent.id < before)
    rows = query.order_by(RewardEvent.id.desc()).limit(31).all()
    return dict(events=[dict(id=r.id, kind=r.kind, points=r.points, created_at=r.created_at)
                        for r in rows[:30]], next_cursor=rows[29].id if len(rows) > 30 else None)


class StudyPulse(BaseModel):
    active: bool


@router.post("/study")
def study(payload: StudyPulse, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    account = rewards.locked_account(db, user.id)
    rewards.pulse(db, account, payload.active)
    db.commit()
    return rewards.summary(account)
