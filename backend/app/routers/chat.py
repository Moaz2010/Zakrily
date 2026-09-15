from fastapi import APIRouter, Depends

from app.ai_service.chat import converse, explain
from app.core.security import get_current_user
from app.models.chat import ChatMode
from app.models.user import User
from app.schemas.chat import (
    ChatMessageRequest,
    ChatMessageResponse,
    ChatSessionCreateRequest,
    ChatSessionCreateResponse,
)

router = APIRouter(tags=["chat"])

_NEXT_SESSION_ID = {"value": 1}
_SESSIONS: dict[int, ChatSessionCreateRequest] = {}


@router.post("/chat/sessions", response_model=ChatSessionCreateResponse)
def create_session(payload: ChatSessionCreateRequest, current_user: User = Depends(get_current_user)):
    session_id = _NEXT_SESSION_ID["value"]
    _NEXT_SESSION_ID["value"] += 1
    _SESSIONS[session_id] = payload
    return ChatSessionCreateResponse(session_id=session_id)


@router.post("/chat/sessions/{session_id}/message", response_model=ChatMessageResponse)
def send_message(session_id: int, payload: ChatMessageRequest, current_user: User = Depends(get_current_user)):
    session = _SESSIONS.get(session_id)
    mode = session.mode if session else ChatMode.science_explain

    if mode == ChatMode.science_explain:
        result = explain(lesson_id=session.lesson_id if session else 0, question=payload.content, history=[])
        return ChatMessageResponse(reply=result, done=False)

    result = converse(lesson_id=session.lesson_id if session else 0, history=[{"role": "user", "content": payload.content}])
    return ChatMessageResponse(reply=result["reply"], done=result["done"], feedback=result.get("feedback"))
