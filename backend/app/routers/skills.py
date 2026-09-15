from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.models.user import User
from app.schemas.common import SkillTagEnum, SubjectSlugEnum
from app.schemas.quiz import SkillBreakdownItem

router = APIRouter(tags=["skills"])


@router.get("/me/skills", response_model=list[SkillBreakdownItem])
def my_skills(subject: SubjectSlugEnum, current_user: User = Depends(get_current_user)):
    return [
        SkillBreakdownItem(skill_tag=tag, correct=0, total=0, accuracy=None, insufficient_data=True)
        for tag in SkillTagEnum
    ]
