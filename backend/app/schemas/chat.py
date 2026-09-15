from pydantic import BaseModel

from app.schemas.common import ChatModeEnum


class ChatSessionCreateRequest(BaseModel):
    lesson_id: int
    mode: ChatModeEnum


class ChatSessionCreateResponse(BaseModel):
    session_id: int


class ChatMessageRequest(BaseModel):
    content: str


class ChatMessageResponse(BaseModel):
    reply: str
    done: bool = False
    feedback: str | None = None
