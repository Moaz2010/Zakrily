"""AI-06/AI-07: grounded science explainer + scripted-but-flexible English conversation.

Stub implementations so BE-08 (chat routes) can be built and tested without
waiting on real model integration. Swap the body of each function for a real
Anthropic call grounded in retrieve()'s chunks; keep the same signatures.
"""

from app.ai_service.retrieval import retrieve
from app.core.config import settings

OFF_SYLLABUS_MESSAGE = (
    "This looks outside Unit 1 for this subject — let's stick to what's in the lesson. "
    "Try asking about a concept from the current lesson."
)


def explain(lesson_id: int, question: str, history: list[dict]) -> str:
    """Science explainer: answer grounded in the lesson's chunks, refuse off-syllabus."""
    chunks = retrieve(question, lesson_id=lesson_id, k=settings.retrieval_k)
    if not chunks:
        return OFF_SYLLABUS_MESSAGE
    return f"[stub explanation for lesson {lesson_id}] Re-explaining: {question}"


def converse(lesson_id: int, history: list[dict]) -> dict:
    """English conversation practice: lesson-scoped scenario with a hard turn limit."""
    turn_count = len([m for m in history if m.get("role") == "user"])
    done = turn_count >= settings.chat_turn_limit
    if done:
        return {
            "reply": "Great practice! Here's a quick feedback summary.",
            "done": True,
            "feedback": "[stub feedback summary]",
        }
    return {"reply": "[stub conversational reply]", "done": False, "feedback": None}
