"""AI-04: generate questions grounded in a lesson's content chunks, tagged by skill.

Stub — wire in a real LLM call. Every generated question must carry a
source_chunk_id so validate_content.py can check it's actually supported by
the cited chunk. Generated questions land with review_status=pending; only
scripts/validate_content.py + human review (FE-09) can move them to approved.

Usage:
    python -m scripts.generate_questions --lesson-id 1 --per-skill-tag 3
"""

import argparse

from app.core.database import SessionLocal
from app.models.content_chunk import ContentChunk
from app.models.question import Question, QuestionType, ReviewStatus, SkillTag


def generate_for_chunk(chunk: ContentChunk, skill_tag_id: int) -> Question:
    """Stub generator — replace with a real grounded LLM call returning
    {body, options, correct_answer, explanation}."""
    return Question(
        lesson_id=chunk.lesson_id,
        skill_tag_id=skill_tag_id,
        qtype=QuestionType.short_answer,
        body=f"[stub question grounded in chunk {chunk.id}]",
        options=None,
        correct_answer="[stub answer]",
        explanation="[stub explanation]",
        source_chunk_id=chunk.id,
        review_status=ReviewStatus.pending,
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--lesson-id", type=int, required=True)
    parser.add_argument("--per-skill-tag", type=int, default=3)
    args = parser.parse_args()

    db = SessionLocal()
    try:
        chunks = db.query(ContentChunk).filter(ContentChunk.lesson_id == args.lesson_id).all()
        skill_tags = db.query(SkillTag).all()
        if not chunks:
            print(f"No content_chunks found for lesson {args.lesson_id}. Run ingest.py first.")
            return

        created = 0
        for tag in skill_tags:
            for i in range(args.per_skill_tag):
                chunk = chunks[i % len(chunks)]
                db.add(generate_for_chunk(chunk, tag.id))
                created += 1
        db.commit()
        print(f"Generated {created} pending questions for lesson {args.lesson_id}.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
