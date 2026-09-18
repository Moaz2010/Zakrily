from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai_service.math_check import check_math
from app.ai_service.math_tutor import MATH_TUTOR_MODEL, generate_question, review_handwritten_work
from app.ai_service.providers import ProviderError
from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.subject import Subject, SubjectSlug
from app.models.user import User
from app.schemas.math import MathSubmitResponse, MathTutorFeedbackResponse, MathTutorQuestionResponse
from app.services.grading import answer_matches, approved_questions
from app.services.progress import accessible_lesson

router = APIRouter(tags=["math"])

MAX_TUTOR_IMAGE_BYTES = 20 * 1024 * 1024
SUPPORTED_TUTOR_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


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
    return {"is_correct": answer_matches(question, payload.answer),
            "correct_answer": question.correct_answer, "explanation": question.explanation}


@router.post("/math/tutor/question", response_model=MathTutorQuestionResponse)
def tutor_question(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Start (or continue) a Unit 1–2-grounded Nawwara practice thread."""
    if not settings.groq_api_key:
        raise HTTPException(503, "نوارا مش متاحة دلوقتي. جرّبي تاني بعد شوية.")
    try:
        return MathTutorQuestionResponse(question=generate_question(db), model=MATH_TUTOR_MODEL)
    except ValueError as exc:
        raise HTTPException(503, str(exc)) from exc
    except ProviderError as exc:
        raise HTTPException(502, "نوارا مش قادرة تجهّز السؤال دلوقتي. جرّبي تاني.") from exc


@router.post("/math/tutor/feedback", response_model=MathTutorFeedbackResponse)
async def tutor_feedback(
    image: UploadFile = File(...),
    question: str = Form(..., min_length=1, max_length=2000),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send one handwritten solution directly to Groq Qwen vision for feedback."""
    if not settings.groq_api_key:
        raise HTTPException(503, "نوارا مش متاحة دلوقتي. جرّبي تاني بعد شوية.")
    mime_type = (image.content_type or "").lower()
    if mime_type not in SUPPORTED_TUTOR_IMAGE_TYPES:
        raise HTTPException(422, "اختاري صورة واضحة للحل بصيغة JPG أو PNG أو WebP.")
    image_bytes = await image.read(MAX_TUTOR_IMAGE_BYTES + 1)
    if len(image_bytes) > MAX_TUTOR_IMAGE_BYTES:
        raise HTTPException(413, "اختاري صورة حجمها ٢٠ ميجابايت أو أقل.")
    try:
        feedback = review_handwritten_work(db, question.strip(), image_bytes, mime_type)
        return MathTutorFeedbackResponse(feedback=feedback, model=MATH_TUTOR_MODEL)
    except ValueError as exc:
        raise HTTPException(503, str(exc)) from exc
    except ProviderError as exc:
        raise HTTPException(502, "نوارا مش قادرة تقرأ الصورة دلوقتي. جرّبي ترفعيها تاني.") from exc


@router.post("/math/submit", response_model=MathSubmitResponse)
async def submit_math(
    image: UploadFile = File(...),
    question_id: int = Form(...),
    current_user: User = Depends(get_current_user),
):
    image_bytes = await image.read()
    result = check_math(image_bytes=image_bytes, question_id=question_id)
    return MathSubmitResponse(**result)
