from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.models.user import User
from app.schemas.common import SubjectSlugEnum, LessonStatusEnum
from app.schemas.subject import PathNode, SubjectOut

router = APIRouter(tags=["subjects"])

_FIXTURE_SUBJECTS = [
    SubjectOut(id=1, slug=SubjectSlugEnum.english, name_ar="اللغة الإنجليزية", name_en="English"),
    SubjectOut(id=2, slug=SubjectSlugEnum.math, name_ar="الرياضيات", name_en="Math"),
    SubjectOut(id=3, slug=SubjectSlugEnum.science, name_ar="العلوم", name_en="Science"),
]

_FIXTURE_PATH = [
    PathNode(lesson_id=1, order=1, title="Lesson 1", status=LessonStatusEnum.unlocked, score=None),
    PathNode(lesson_id=2, order=2, title="Lesson 2", status=LessonStatusEnum.locked, score=None),
    PathNode(lesson_id=3, order=3, title="Lesson 3", status=LessonStatusEnum.locked, score=None),
]


@router.get("/subjects", response_model=list[SubjectOut])
def list_subjects(current_user: User = Depends(get_current_user)):
    return _FIXTURE_SUBJECTS


@router.get("/subjects/{slug}/path", response_model=list[PathNode])
def get_path(slug: SubjectSlugEnum, current_user: User = Depends(get_current_user)):
    return _FIXTURE_PATH
