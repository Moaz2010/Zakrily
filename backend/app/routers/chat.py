from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.ai_service import providers
from app.ai_service.chat import converse, explain
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.chat import ChatMode, ChatSession, ChatMessage, ChatRole
from app.models.user import User
from app.schemas.chat import (
    ChatMessageRequest, ChatMessageResponse, ChatModelOption, ChatProvidersResponse,
    ChatSessionCreateRequest, ChatSessionCreateResponse,
)
from app.services.progress import accessible_lesson

router = APIRouter(tags=["chat"])


@router.get("/chat/providers", response_model=ChatProvidersResponse)
def list_providers(current_user: User = Depends(get_current_user)):
    available = providers.configured()
    options = [
        ChatModelOption(
            id=entry["id"], provider=entry["provider"], label=entry["label"], cost=entry["cost"],
            usd_per_mtok_input=entry["usd_per_mtok"][0], usd_per_mtok_output=entry["usd_per_mtok"][1],
        )
        for entry in providers.catalog(available)
    ]
    default_provider = available[0] if available else None
    return ChatProvidersResponse(
        available=available,
        default=default_provider,
        default_model=providers.model_for(default_provider) if default_provider else None,
        models=options,
    )



@router.post("/chat/sessions", response_model=ChatSessionCreateResponse)
def create_session(payload: ChatSessionCreateRequest, current_user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    lesson = accessible_lesson(db, current_user.id, payload.lesson_id)
    # Keep the existing stored enum compatible with deployed databases and sessions.
    mode = ChatMode.science_explain if payload.mode == "lesson_explain" else ChatMode(payload.mode)
    session = ChatSession(user_id=current_user.id, lesson_id=lesson.id, mode=mode)
    db.add(session)
    db.commit()
    db.refresh(session)
    return ChatSessionCreateResponse(session_id=session.id)


@router.post("/chat/sessions/{session_id}/message", response_model=ChatMessageResponse)
def send_message(session_id: int, payload: ChatMessageRequest, current_user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter_by(id=session_id, user_id=current_user.id).first()
    if session is None:
        raise HTTPException(404, "Chat session not found")
    accessible_lesson(db, current_user.id, session.lesson_id)
    content = payload.content.strip()
    if not content or len(content) > 4000:
        raise HTTPException(422, "Message must contain 1 to 4000 characters")
    message_query = db.query(ChatMessage).filter_by(session_id=session.id).order_by(ChatMessage.id.desc())
    messages = (message_query.limit(10) if session.mode == ChatMode.science_explain else message_query).all()
    history = [{"role": m.role.value, "content": m.content} for m in reversed(messages)]
    if session.mode == ChatMode.science_explain:
        # An explicit model implies its provider, so the picker only has to send one field.
        requested = payload.provider.value if payload.provider else None
        if payload.model:
            owner = providers.provider_of(payload.model)
            if owner is None:
                raise HTTPException(422, "Unknown model")
            requested = owner
        chosen = providers.resolve(requested)
        if chosen is not None and payload.model and providers.provider_of(payload.model) != chosen:
            raise HTTPException(503, "That model's provider is not configured on the server")
        result = ChatMessageResponse(
            reply=explain(session.lesson_id, content, history, db=db,
                          provider=requested, model=payload.model),
            provider=chosen,
            model=payload.model or (providers.model_for(chosen) if chosen else None),
        )
    else:
        response = converse(session.lesson_id, [*history, {"role": "user", "content": content}])
        result = ChatMessageResponse(**response)
    db.add_all([
        ChatMessage(session_id=session.id, role=ChatRole.user, content=content),
        ChatMessage(session_id=session.id, role=ChatRole.assistant, content=result.reply),
    ])
    db.commit()
    return result
