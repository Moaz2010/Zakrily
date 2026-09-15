from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.ai_service.math_check import check_math
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.math import MathSubmitResponse

router = APIRouter(tags=["math"])


@router.post("/math/submit", response_model=MathSubmitResponse)
async def submit_math(
    image: UploadFile = File(...),
    question_id: int = Form(...),
    current_user: User = Depends(get_current_user),
):
    image_bytes = await image.read()
    result = check_math(image_bytes=image_bytes, question_id=question_id)
    return MathSubmitResponse(**result)
