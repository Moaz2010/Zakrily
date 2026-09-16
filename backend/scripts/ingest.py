"""Ingest the prepared Science / Unit 1 / Lesson 1 into the existing tables.

Run from backend: python -m scripts.ingest
Re-running updates matching source chunks in place, retaining question references.
"""
import argparse
import re
from dataclasses import dataclass
from pathlib import Path

from app.ai_service.embeddings import EMBEDDING_MODEL, embed
from app.core.database import SessionLocal
from app.models.content_chunk import ContentChunk
from app.models.lesson import Lesson, LessonSection
from app.models.subject import Subject, SubjectSlug

SOURCE = Path(__file__).resolve().parents[2] / "content/science/unit 1/lesson_1.md"
SOURCE_REF = "science/unit 1/lesson_1.md"
CHUNK_MAX_WORDS = 500


@dataclass
class SourceChunk:
    text: str
    metadata: dict
    source_ref: str


def sections(text: str) -> list[tuple[str, str]]:
    parts = re.split(r"^## (.+)$", text, flags=re.MULTILINE)
    return [(parts[i].strip(), parts[i + 1].strip()) for i in range(1, len(parts), 2)]


def chunk_text(text: str, lesson_order: int = 1, source_ref_base: str = SOURCE_REF) -> list[SourceChunk]:
    chunks = []
    for section_number, (heading, body) in enumerate(sections(text), 1):
        kind = "exercise" if heading.startswith(("6.", "7.")) else "explanation"
        blocks = re.split(r"(?=^### )", body, flags=re.MULTILINE)
        for block_number, block in enumerate(blocks, 1):
            block = block.strip().strip("-\n ")
            if not block:
                continue
            pieces = [block]
            if kind == "explanation" and len(block.split()) > CHUNK_MAX_WORDS:
                pieces = []
                current = []
                for paragraph in block.split("\n\n"):
                    if current and len(("\n\n".join(current) + paragraph).split()) > CHUNK_MAX_WORDS:
                        pieces.append("\n\n".join(current))
                        current = []
                    current.append(paragraph)
                if current:
                    pieces.append("\n\n".join(current))
            for part_number, piece in enumerate(pieces, 1):
                question = re.match(r"### Question (\d+)", block)
                metadata = dict(subject="science", unit=1, lesson=lesson_order, content_type=kind,
                                section=heading, embedding_model=EMBEDDING_MODEL)
                if question:
                    metadata["question_number"] = int(question[1])
                chunks.append(SourceChunk(f"## {heading}\n\n{piece}", metadata,
                                          f"{source_ref_base}#s{section_number}-b{block_number}-p{part_number}"))
    return chunks


def ingest_file(path: Path = SOURCE, subject_id: int | None = None, lesson_id: int | None = None, allow_other: bool = False):
    if path.resolve() != SOURCE.resolve() and not allow_other:
        raise ValueError("Only the prepared Science Unit 1 Lesson 1 source is supported.")
    text = path.read_text(encoding="utf-8")
    match = re.search(r"lesson_(\d+)\.md", path.name)
    lesson_order = int(match.group(1)) if match else 1
    source_ref_base = f"science/unit 1/lesson_{lesson_order}.md"

    chunks = chunk_text(text, lesson_order=lesson_order, source_ref_base=source_ref_base)
    if not chunks or {c.metadata["content_type"] for c in chunks} != {"explanation", "exercise"}:
        raise ValueError("Source must contain explanations and exercises; nothing was written.")
    with SessionLocal() as db:
        lesson = db.query(Lesson).join(Subject).filter(
            Subject.slug == SubjectSlug.science, Lesson.order_index == lesson_order,
        ).one_or_none()
        if (lesson_id is not None and lesson_id != lesson.id) or (subject_id is not None and subject_id != lesson.subject_id):
            raise ValueError("Provided IDs do not identify this lesson.")

        existing = {c.source_ref: c for c in db.query(ContentChunk).filter(ContentChunk.lesson_id == lesson.id)}
        for chunk in chunks:
            row = existing.get(chunk.source_ref)
            if row is None:
                row = ContentChunk(lesson_id=lesson.id, subject_id=lesson.subject_id, source_ref=chunk.source_ref)
                db.add(row)
            row.text, row.chunk_metadata, row.embedding = chunk.text, chunk.metadata, embed(chunk.text)
        refs = {c.source_ref for c in chunks}
        for ref, row in existing.items():
            if ref.startswith(source_ref_base + "#") and ref not in refs:
                row.chunk_metadata = {**row.chunk_metadata, "retired": True}
        for index, (heading, body) in enumerate(sections(text), 1):
            row = db.query(LessonSection).filter_by(lesson_id=lesson.id, order_index=index).one_or_none()
            if row is None:
                row = LessonSection(lesson_id=lesson.id, order_index=index)
                db.add(row)
            row.heading, row.body_md = heading, body
        lesson.is_published = True
        db.commit()
        print(f"Ingested {len(chunks)} typed chunks for Science Unit 1 Lesson {lesson_order} (id={lesson.id}).")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", nargs="?", type=Path, default=SOURCE)
    parser.add_argument("--subject-id", type=int)
    parser.add_argument("--lesson-id", type=int)
    args = parser.parse_args()
    ingest_file(args.path, args.subject_id, args.lesson_id)


if __name__ == "__main__":
    main()
