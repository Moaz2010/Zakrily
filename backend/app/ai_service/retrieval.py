"""Lesson- and content-type-scoped retrieval from the existing vector store."""
import re
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.ai_service.embeddings import EMBEDDING_MODEL, embed, tokens
from app.core.database import SessionLocal
from app.models.content_chunk import ContentChunk
from app.models.lesson import Lesson
from app.models.subject import Subject, SubjectSlug


@dataclass
class Chunk:
    id: int
    lesson_id: int
    text: str
    source_ref: str
    metadata: dict = field(default_factory=dict)


def requested_type(query: str) -> str:
    return "exercise" if re.search(
        r"\b(exercises?|questions?|answers?|quiz|practice|solve|options?|true|false|blank)\b|\bq\.?\s*\d+|سؤال|السؤال|أسئلة|اسئلة|تمرين|تدريب|اجابة|إجابة|حل",
        query, re.IGNORECASE,
    ) else "explanation"


def retrieve(query: str, lesson_id: int, k: int = 5, *,
             content_type: str | None = None, db: Session | None = None) -> list[Chunk]:
    if k <= 0 or not query.strip():
        return []
    if db is None:
        with SessionLocal() as session:
            return retrieve(query, lesson_id, k, content_type=content_type, db=session)
    kind = content_type or requested_type(query)
    if kind not in {"explanation", "exercise"}:
        raise ValueError("Unknown content type")
    rows = db.query(ContentChunk).join(Lesson).join(Subject, Lesson.subject_id == Subject.id).filter(
        ContentChunk.lesson_id == lesson_id,
        ContentChunk.subject_id == Subject.id,
        Lesson.is_published.is_(True),
        ContentChunk.chunk_metadata["subject"].as_string() == "science",
        ContentChunk.chunk_metadata["content_type"].as_string() == kind,
        ContentChunk.chunk_metadata["embedding_model"].as_string() == EMBEDDING_MODEL,
    )
    number = re.search(r"(?:\bquestion|\bq\.?|السؤال|سؤال)\s*(?:number|رقم)?\s*(\d+)", query, re.IGNORECASE)
    if number and kind == "exercise":
        rows = rows.filter(ContentChunk.chunk_metadata["question_number"].as_integer() == int(number[1]))
    vector = embed(query)
    if db.get_bind().dialect.name == "postgresql":
        rows = rows.order_by(ContentChunk.embedding.cosine_distance(vector), ContentChunk.id)
    candidates = [row for row in rows.all() if not row.chunk_metadata.get("retired")]
    ranked = sorted(candidates, key=lambda row: (
        sum(float(a) * b for a, b in zip(row.embedding, vector)), -row.id,
    ), reverse=True)
    query_tokens = set(tokens(query))
    general = bool(re.search(r"\b(lesson|summary|summarize|overview|revise|practice|exercises)\b|الدرس|ملخص|اشرح|تدريبات", query, re.I))
    ranked = [row for row in ranked if number or general or query_tokens.intersection(tokens(row.text))]
    return [Chunk(row.id, row.lesson_id, row.text, row.source_ref, row.chunk_metadata) for row in ranked[:k]]
