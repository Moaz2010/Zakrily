from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.models.user import User
from app.curriculum import SUBJECTS
from app.schemas.common import SubjectSlugEnum, LessonStatusEnum
from app.schemas.subject import PathNode, SubjectOut

router = APIRouter(tags=["subjects"])

@router.get("/subjects", response_model=list[SubjectOut])
def list_subjects(current_user: User = Depends(get_current_user)):
    return [SubjectOut(**subject) for subject in SUBJECTS]


@router.get("/subjects/{slug}/path", response_model=list[PathNode])
def get_path(slug: SubjectSlugEnum, current_user: User = Depends(get_current_user)):
    subject = next(subject for subject in SUBJECTS if subject["slug"] == slug.value)
    return [
        PathNode(
            lesson_id=lesson["id"], order=lesson["order"], title=lesson["title"],
            status=LessonStatusEnum.unlocked if lesson["order"] == 1 else LessonStatusEnum.locked,
        )
        for lesson in subject["lessons"]
    ]
