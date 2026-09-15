"""AI-02: chunk Unit 1 source content and load content_chunks with embeddings.

Reads content/{subject}/unit1/*.md, splits into ~400-600 token chunks that
never cross a lesson boundary, embeds each chunk, and inserts into
content_chunks with the correct lesson_id.

Usage:
    python -m scripts.ingest --subject english --lesson-id 1 content/english/unit1/lesson1.md

This is a stub for the chunking/embedding call — wire in the real embedding
API before running against real content. Do not run against unreviewed
content; ingestion only feeds question generation (AI-04), not students
directly.
"""

import argparse
from pathlib import Path

from app.core.database import SessionLocal
from app.models.content_chunk import ContentChunk, EMBEDDING_DIM

CHUNK_MIN_TOKENS = 400
CHUNK_MAX_TOKENS = 600


def chunk_text(text: str) -> list[str]:
    """Naive whitespace-based chunker. Replace with a token-aware splitter."""
    words = text.split()
    words_per_chunk = CHUNK_MAX_TOKENS
    return [
        " ".join(words[i : i + words_per_chunk])
        for i in range(0, len(words), words_per_chunk)
    ]


def embed(text: str) -> list[float]:
    """Stub embedding — replace with a real embedding API call."""
    return [0.0] * EMBEDDING_DIM


def ingest_file(path: Path, subject_id: int, lesson_id: int):
    text = path.read_text(encoding="utf-8")
    chunks = chunk_text(text)

    db = SessionLocal()
    try:
        for i, chunk in enumerate(chunks):
            db.add(
                ContentChunk(
                    lesson_id=lesson_id,
                    subject_id=subject_id,
                    source_ref=f"{path.name}#chunk-{i}",
                    text=chunk,
                    embedding=embed(chunk),
                )
            )
        db.commit()
        print(f"Ingested {len(chunks)} chunks from {path} into lesson {lesson_id}.")
    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("path", type=Path)
    parser.add_argument("--subject-id", type=int, required=True)
    parser.add_argument("--lesson-id", type=int, required=True)
    args = parser.parse_args()

    ingest_file(args.path, subject_id=args.subject_id, lesson_id=args.lesson_id)


if __name__ == "__main__":
    main()
