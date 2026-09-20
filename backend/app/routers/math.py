from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.ai_service.math_check import check_math
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.math import MathSubmitResponse

router = APIRouter(tags=["math"])

from fastapi import HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.subject import Subject, SubjectSlug
from app.services.progress import accessible_lesson
from app.services.grading import approved_questions, save_answers
from app.models.attempt import AttemptContext


class MathCheckRequest(BaseModel):
    question_id: int
    answer: str = Field(min_length=1, max_length=2000)


@router.post("/math/lessons/{lesson_id}/check")
def check_answer(lesson_id: int, payload: MathCheckRequest,
                 current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lesson = accessible_lesson(db, current_user.id, lesson_id)
    if db.get(Subject, lesson.subject_id).slug != SubjectSlug.math:
        raise HTTPException(422, "هذا النشاط خاص بالرياضيات.")
    question = next((q for q, _ in approved_questions(db, lesson_id=lesson_id)
                     if q.id == payload.question_id), None)
    if question is None or not payload.answer.strip():
        raise HTTPException(422, "اختار سؤال من الدرس واكتب إجابتك.")
    bank = [(q, tag) for q, tag in approved_questions(db, lesson_id=lesson_id) if q.id == question.id]
    results, _ = save_answers(db, current_user.id, [payload], bank, AttemptContext.practice)
    db.commit()
    return {"is_correct": results[0].is_correct,
            "correct_answer": question.correct_answer, "explanation": question.explanation}


@router.post("/math/submit", response_model=MathSubmitResponse)
async def submit_math(
    image: UploadFile = File(...),
    question_id: int = Form(...),
    current_user: User = Depends(get_current_user),
):
    image_bytes = await image.read()
    result = check_math(image_bytes=image_bytes, question_id=question_id)
    return MathSubmitResponse(**result)
