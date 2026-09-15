"""AI-05: validation pass over pending questions.

For each pending question, a (stubbed) second model call checks whether it's
supported by its source_chunk and whether the answer is correct. Anything
failing is auto-rejected. Survivors still require human review (FE-09)
before review_status can become 'approved' — this script only ever writes
'pending' or 'rejected'.

Usage:
    python -m scripts.validate_content --lesson-id 1
"""

import argparse

from app.core.database import SessionLocal
from app.models.question import Question, ReviewStatus


def validate(question: Question) -> tuple[bool, bool, str]:
    """Stub validator — replace with a real LLM call.

    Returns (is_supported, is_answer_correct, reason).
    """
    if not question.source_chunk_id:
        return False, False, "No source_chunk_id — cannot verify grounding."
    return True, True, "[stub] assumed supported and correct."


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--lesson-id", type=int, required=True)
    args = parser.parse_args()

    db = SessionLocal()
    try:
        pending = (
            db.query(Question)
            .filter(Question.lesson_id == args.lesson_id, Question.review_status == ReviewStatus.pending)
            .all()
        )
        rejected = 0
        for q in pending:
            is_supported, is_correct, reason = validate(q)
            if not (is_supported and is_correct):
                q.review_status = ReviewStatus.rejected
                rejected += 1
                print(f"Rejected question {q.id}: {reason}")
        db.commit()
        print(f"Validated {len(pending)} questions, rejected {rejected}. Survivors remain 'pending' for human review.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
