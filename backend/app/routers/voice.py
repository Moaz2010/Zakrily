from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.ai_service import voice
from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_current_user
from app.models.chat import ChatSession, ChatMessage, ChatMode, ChatRole
from app.models.subject import Subject, SubjectSlug
from app.models.user import User
from app.services.progress import accessible_lesson

router = APIRouter(prefix="/voice", tags=["voice"])
MAX_AUDIO = 10 * 1024 * 1024
FORMATS = {"audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg", "audio/wav": "wav", "audio/mpeg": "mp3"}


def english_lesson(db, user, lesson_id):
    lesson = accessible_lesson(db, user.id, lesson_id)
    if db.get(Subject, lesson.subject_id).slug != SubjectSlug.english:
        raise HTTPException(422, "المحادثة الصوتية خاصة بدروس الإنجليزي.")
    return lesson


def output(session_id, reply, transcript="", done=False):
    try:
        audio, error = voice.synthesize(reply), None
    except HTTPException as exc:
        audio, error = [], exc.detail
    return dict(session_id=session_id, reply=reply, transcript=transcript, audio=audio, audio_error=error, done=done)


class PronunciationRequest(BaseModel):
    text: str = Field(min_length=1, max_length=240)

    @field_validator("text")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Text must not be blank")
        return value


@router.post("/lessons/{lesson_id}/pronounce")
def pronounce(lesson_id: int, request: PronunciationRequest,
              db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    english_lesson(db, user, lesson_id)
    return {"audio": voice.synthesize(request.text)}


@router.post("/lessons/{lesson_id}/start")
def start(lesson_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lesson = english_lesson(db, user, lesson_id)
    answer = voice.reply(lesson, [], "Start our English speaking practice.", db, first_turn=True)
    session = ChatSession(user_id=user.id, lesson_id=lesson.id, mode=ChatMode.english_convo)
    db.add(session)
    db.flush()
    db.add(ChatMessage(session_id=session.id, role=ChatRole.assistant, content=answer))
    db.commit()
    return output(session.id, answer)


@router.post("/sessions/{session_id}/turn")
def turn(session_id: int, audio: UploadFile = File(...), db: Session = Depends(get_db),
         user: User = Depends(get_current_user)):
    session = db.query(ChatSession).filter_by(id=session_id, user_id=user.id, mode=ChatMode.english_convo).with_for_update().first()
    if session is None:
        raise HTTPException(404, "Conversation not found")
    lesson = english_lesson(db, user, session.lesson_id)
    turns = db.query(ChatMessage).filter_by(session_id=session.id, role=ChatRole.user).count()
    if turns >= settings.chat_turn_limit:
        raise HTTPException(409, "المحادثة خلصت. ابدأ محادثة جديدة للتدريب.")
    mime = (audio.content_type or "").split(";")[0]
    if mime not in FORMATS:
        raise HTTPException(415, "صيغة التسجيل مش مدعومة.")
    data = audio.file.read(MAX_AUDIO + 1)
    if not data or len(data) > MAX_AUDIO:
        raise HTTPException(413, "سجّل مقطع قصير، بحد أقصى 10 ميجابايت.")
    transcript = voice.transcribe(data, "recording." + FORMATS[mime], mime)
    rows = db.query(ChatMessage).filter_by(session_id=session.id).order_by(ChatMessage.id.desc()).limit(10).all()
    history = [{"role": m.role.value, "content": m.content} for m in reversed(rows)]
    done = turns + 1 >= settings.chat_turn_limit
    answer = voice.reply(lesson, history, transcript, db)
    if done:
        answer += " كمّلنا النهارده! أشطر واحد."
    db.add_all([ChatMessage(session_id=session.id, role=ChatRole.user, content=transcript),
                ChatMessage(session_id=session.id, role=ChatRole.assistant, content=answer)])
    db.commit()
    return output(session.id, answer, transcript, done)

