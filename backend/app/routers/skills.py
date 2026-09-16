from fastapi import APIRouter, Depends
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.attempt import Attempt
from app.models.lesson import Lesson
from app.models.question import Question, SkillTag
from app.models.subject import Subject
from app.models.user import User
from app.schemas.common import SkillTagEnum, SubjectSlugEnum
from app.schemas.quiz import SkillBreakdownItem
from app.services.scoring import accuracy, has_sufficient_data

router = APIRouter(tags=["skills"])


@router.get("/me/skills", response_model=list[SkillBreakdownItem])
def my_skills(subject: SubjectSlugEnum | None = None, current_user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    query = db.query(SkillTag.slug, func.sum(case((Attempt.is_correct.is_(True), 1), else_=0)),
                     func.count(Attempt.id)).select_from(Attempt).join(Question).join(SkillTag).join(
                         Lesson, Question.lesson_id == Lesson.id).join(Subject).filter(Attempt.user_id == current_user.id)
    if subject is not None:
        query = query.filter(Subject.slug == subject.value)
    counts = {tag.value: (correct, total) for tag, correct, total in query.group_by(SkillTag.slug)}
    result = []
    for tag in SkillTagEnum:
        correct, total = counts.get(tag.value, (0, 0))
        result.append(SkillBreakdownItem(skill_tag=tag, correct=correct, total=total,
                                        accuracy=accuracy(correct, total), insufficient_data=not has_sufficient_data(total)))
    return result
