from enum import Enum

from pydantic import BaseModel

from app.schemas.common import ChatModeEnum


class ChatProviderEnum(str, Enum):
    anthropic = "anthropic"
    openai = "openai"
    groq = "groq"


class ChatSessionCreateRequest(BaseModel):
    lesson_id: int
    mode: ChatModeEnum


class ChatSessionCreateResponse(BaseModel):
    session_id: int


class ChatMessageRequest(BaseModel):
    content: str
    provider: ChatProviderEnum | None = None
    model: str | None = None


class ChatMessageResponse(BaseModel):
    reply: str
    done: bool = False
    feedback: str | None = None
    provider: str | None = None
    model: str | None = None


class ChatModelOption(BaseModel):
    id: str
    provider: ChatProviderEnum
    label: str
    cost: str  # "low" | "high" — shown in the picker so testers see the tradeoff
    usd_per_mtok_input: float
    usd_per_mtok_output: float


class ChatProvidersResponse(BaseModel):
    """Which models the server can actually reach, and which it picks by default."""

    available: list[ChatProviderEnum]
    default: ChatProviderEnum | None
    default_model: str | None
    models: list[ChatModelOption]
