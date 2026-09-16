from pydantic import BaseModel

from app.schemas.common import LessonStatusEnum, SubjectSlugEnum


class SubjectOut(BaseModel):
    id: int
    slug: SubjectSlugEnum
    name_ar: str
    name_en: str

    model_config = {"from_attributes": True}


class PathNode(BaseModel):
    lesson_id: int
    order: int
    title: str
    status: LessonStatusEnum
    score: float | None = None
    progress: float = 0
