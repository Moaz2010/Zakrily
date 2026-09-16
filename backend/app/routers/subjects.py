from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.subject import Subject
from app.models.user import User
from app.schemas.common import SubjectSlugEnum
from app.schemas.subject import PathNode, SubjectOut
from app.services.progress import lesson_path

router = APIRouter(tags=["subjects"])


@router.get("/subjects", response_model=list[SubjectOut])
def list_subjects(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Subject).order_by(Subject.id).all()


@router.get("/subjects/{slug}/path", response_model=list[PathNode])
def get_path(slug: SubjectSlugEnum, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.slug == slug.value).first()
    if subject is None:
        raise HTTPException(404, "Subject not found")
    return lesson_path(db, current_user.id, subject.id)
