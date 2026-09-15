"""AI-03: retrieval over content_chunks, always filtered by lesson_id first.

Stub implementation — swap in real embedding similarity search once AI-02
(ingest.py) has populated content_chunks for a lesson.
"""

from dataclasses import dataclass


@dataclass
class Chunk:
    id: int
    lesson_id: int
    text: str
    source_ref: str


def retrieve(query: str, lesson_id: int, k: int = 5) -> list[Chunk]:
    """Return up to k chunks belonging ONLY to lesson_id, ranked by relevance to query.

    Stub: returns a single placeholder chunk. Real implementation embeds `query`,
    filters content_chunks by lesson_id, then orders by cosine distance.
    """
    return [
        Chunk(
            id=1,
            lesson_id=lesson_id,
            text=f"[stub content for lesson {lesson_id}]",
            source_ref=f"lesson-{lesson_id}#stub",
        )
    ][:k]
