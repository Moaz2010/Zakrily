from pydantic import BaseModel


class LessonSectionOut(BaseModel):
    id: int
    order_index: int
    heading: str
    body_md: str

    model_config = {"from_attributes": True}


class LessonOut(BaseModel):
    id: int
    subject_id: int
    order_index: int
    title: str
    objective: str

    model_config = {"from_attributes": True}


class LessonDetail(BaseModel):
    lesson: LessonOut
    sections: list[LessonSectionOut]
