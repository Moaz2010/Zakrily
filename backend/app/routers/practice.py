from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.attempt import AttemptContext
from app.models.subject import Subject
from app.models.user import User
from app.schemas.common import SubjectSlugEnum
from app.schemas.practice import PracticeSetOut, PracticeSubmitRequest, PracticeSubmitResponse
from app.services.grading import approved_questions, public_question, save_answers
from app.services.progress import accessible_lesson, lesson_path

router = APIRouter(tags=["practice"])


@router.get("/practice/next", response_model=PracticeSetOut)
def practice_next(subject: SubjectSlugEnum, n: int = Query(5, ge=1, le=50), lesson_id: int | None = None,
                  current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.query(Subject).filter(Subject.slug == subject.value).first()
    if row is None:
        raise HTTPException(404, "Subject not found")
    if lesson_id is not None:
        lesson = accessible_lesson(db, current_user.id, lesson_id)
        if lesson.subject_id != row.id:
            raise HTTPException(422, "Lesson does not belong to subject")
    allowed = {node.lesson_id for node in lesson_path(db, current_user.id, row.id) if node.status != "locked"}
    questions = approved_questions(db, lesson_id=lesson_id, subject_id=row.id)
    return PracticeSetOut(questions=[public_question(q, tag) for q, tag in questions if q.lesson_id in allowed][:n])


@router.post("/practice/submit", response_model=PracticeSubmitResponse)
def practice_submit(payload: PracticeSubmitRequest, current_user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    ids = {a.question_id for a in payload.answers}
    questions = [(q, tag) for q, tag in approved_questions(db) if q.id in ids]
    for lesson_id in {q.lesson_id for q, _ in questions}:
        accessible_lesson(db, current_user.id, lesson_id)
    results, breakdown = save_answers(db, current_user.id, payload.answers, questions, AttemptContext.practice)
    db.commit()
    return PracticeSubmitResponse(results=results, skill_breakdown=breakdown)
