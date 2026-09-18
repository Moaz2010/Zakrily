"""Grounded Grade 4 math-practice generation and handwritten-work feedback."""
import base64
from functools import lru_cache

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.ai_service import providers
from app.ai_service.embeddings import EMBEDDING_MODEL, embed
from app.models.content_chunk import ContentChunk
from app.models.lesson import Lesson
from app.models.subject import Subject, SubjectSlug

MATH_TUTOR_MODEL = "qwen/qwen3.8-27b"

# Keep these lines exact: they are the product's non-negotiable tutor voice.
TONE_RULES = """- Egyptian Arabic (اللهجة المصرية), not Modern Standard Arabic
- Warm and encouraging, like a caring tutor — never cold or purely evaluative
- Point to the specific step where a mistake happened, don't just say "wrong"
- Keep responses short — 2-4 sentences, not paragraphs"""


@lru_cache(maxsize=512)
def _current_embedding(text: str) -> list[float]:
    return embed(text)


def retrieve_unit_chunks(db: Session, query: str, k: int = 6) -> list[ContentChunk]:
    """Run the Unit 1–2 scoped similarity search against ``content_chunks``."""
    if k <= 0 or not query.strip():
        return []
    vector = embed(query)
    rows = db.query(ContentChunk).join(Lesson).join(Subject, Lesson.subject_id == Subject.id).filter(
        Subject.slug == SubjectSlug.math,
        ContentChunk.subject_id == Subject.id,
        Lesson.is_published.is_(True),
        ContentChunk.chunk_metadata["unit"].as_integer().in_([1, 2]),
        or_(ContentChunk.chunk_metadata["retired"].as_boolean().is_(None),
            ContentChunk.chunk_metadata["retired"].as_boolean().is_(False)),
    )
    if db.get_bind().dialect.name == "postgresql":
        model = ContentChunk.chunk_metadata["embedding_model"].as_string()
        current = rows.filter(model == EMBEDDING_MODEL).order_by(
            ContentChunk.embedding.cosine_distance(vector), ContentChunk.id,
        ).limit(k).all()
        candidates = current + rows.filter(or_(model.is_(None), model != EMBEDDING_MODEL)).all()
    else:
        candidates = rows.all()

    def score(row: ContentChunk) -> tuple[float, int]:
        # Older ingestions remain usable without comparing incompatible vectors
        # or silently publishing/modifying content during a learner request.
        embedding = (row.embedding if row.chunk_metadata.get("embedding_model") == EMBEDDING_MODEL
                     else _current_embedding(row.text))
        return sum(float(a) * b for a, b in zip(embedding, vector)), -row.id

    return sorted(candidates, key=score, reverse=True)[:k]


def _context(chunks: list[ContentChunk]) -> str:
    return "\n\n".join(f"[Source: {chunk.source_ref}]\n{chunk.text}" for chunk in chunks)


def generate_question(db: Session) -> str:
    chunks = retrieve_unit_chunks(
        db,
        "Grade 4 math Unit 1 Unit 2 place value numbers comparing rounding addition subtraction practice",
    )
    if not chunks:
        raise ValueError("محتوى الرياضيات لسه مش جاهز. جرّبي تاني بعد شوية.")
    system = f"""You are Nawwara, a caring Grade 4 math tutor.

{TONE_RULES}

Generate exactly ONE short, solvable Grade 4 math question. It must be grounded only in the retrieved curriculum below. Do not introduce topics that do not appear in this context. Write the question in Egyptian Arabic. Return only the question: no title, answer, solution, choices, or extra coaching.

RETRIEVED CURRICULUM:
{_context(chunks)}"""
    return providers.complete(
        providers.GROQ, system, [{"role": "user", "content": "هات سؤال تدريب واحد."}],
        max_tokens=300, timeout=60, model=MATH_TUTOR_MODEL, reasoning_effort="none",
    )


def review_handwritten_work(db: Session, question: str, image_bytes: bytes, mime_type: str) -> str:
    chunks = retrieve_unit_chunks(db, question)
    if not chunks:
        raise ValueError("محتوى الرياضيات لسه مش جاهز. جرّبي تاني بعد شوية.")
    image_data_url = f"data:{mime_type};base64,{base64.b64encode(image_bytes).decode('ascii')}"
    system = f"""You are Nawwara, a caring Grade 4 math tutor reviewing a child's handwritten solution.

{TONE_RULES}

Look carefully at the photo before responding. Base every comment on working that is actually visible in the photo and on the question below. Mention a correct step by name when visible; if there is an error, gently identify the exact visible step where it happens and explain the fix. Do not claim to see a step that is not visible. If the handwriting or photo is too unclear to assess, say so warmly and ask for a clearer photo instead of guessing. Do not give generic feedback.

QUESTION:
{question}

RETRIEVED CURRICULUM:
{_context(chunks)}"""
    return providers.complete(
        providers.GROQ,
        system,
        [{"role": "user", "content": [
            {"type": "text", "text": "راجعي الحل المكتوب في الصورة للسؤال ده."},
            {"type": "image_url", "image_url": {"url": image_data_url}},
        ]}],
        max_tokens=450, timeout=90, model=MATH_TUTOR_MODEL, reasoning_effort="none",
    )
