from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.progress import LearnerStats
from app.services.progress import learner_stats

router = APIRouter(tags=["progress"])


@router.get("/me/stats", response_model=LearnerStats)
def stats(timezone: str = Query(default="Africa/Cairo", max_length=100),
          current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        tz = ZoneInfo(timezone)
    except (ZoneInfoNotFoundError, ValueError):
        raise HTTPException(422, "Unknown timezone")
    return learner_stats(db, current_user.id, tz)
