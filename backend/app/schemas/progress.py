from datetime import date

from pydantic import BaseModel

from app.schemas.subject import PathNode, SubjectOut


class SubjectActivity(BaseModel):
    subject_id: int
    count: int


class ActivityDay(BaseModel):
    date: date
    total: int
    subjects: list[SubjectActivity]


class SubjectProgress(SubjectOut):
    correct: int
    total_attempts: int
    accuracy: float | None
    completed_lessons: int
    total_lessons: int
    next_lesson: PathNode | None
    lessons: list[PathNode]


class LearnerStats(BaseModel):
    timezone: str
    streak_days: int
    correct: int
    total_attempts: int
    accuracy: float | None
    week: list[ActivityDay]
    subjects: list[SubjectProgress]
