"""Human review gate for generated questions.

Nothing reaches a student until someone approves it here. Shows each pending
question next to the source chunk it cites, so you can check it is actually
supported before approving.

Usage:
    python -m scripts.review_questions --lesson-id 12            # interactive
    python -m scripts.review_questions --lesson-id 12 --list     # just show them
    python -m scripts.review_questions --lesson-id 12 --approve-all
"""

import argparse
import sys
import textwrap

from app.core.database import SessionLocal

# Lesson content is Arabic/English with arrows and dashes; the default Windows
# console codec cannot encode it and would crash mid-review.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from app.models.content_chunk import ContentChunk
from app.models.lesson import Lesson
from app.models.question import Question, ReviewStatus, SkillTag


def show(db, question: Question, index: int, total: int) -> None:
    tag = db.get(SkillTag, question.skill_tag_id)
    chunk = db.get(ContentChunk, question.source_chunk_id) if question.source_chunk_id else None
    print("=" * 72)
    print(f"[{index}/{total}]  id={question.id}  skill={tag.slug.value}  type={question.qtype.value}")
    print("-" * 72)
    print(textwrap.fill(question.body, 72))
    if question.options:
        for key, value in question.options.items():
            marker = "*" if str(key) == str(question.correct_answer) else " "
            print(f"   {marker} {key}) {value}")
    else:
        print(f"   answer: {question.correct_answer}")
    print(f"\n   why: {question.explanation}")
    if chunk:
        section = (chunk.chunk_metadata or {}).get("section", "?")
        print(f"\n   source [{chunk.source_ref}] ({section}):")
        print(textwrap.fill(chunk.text[:600], 68, initial_indent="     ", subsequent_indent="     "))
    else:
        print("\n   source: MISSING — cannot verify grounding, reject unless you check manually")
    print()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lesson-id", type=int, required=True)
    parser.add_argument("--list", action="store_true", help="Display pending questions and exit.")
    parser.add_argument("--approve-all", action="store_true",
                        help="Approve every pending question without prompting. Use only after reviewing with --list.")
    args = parser.parse_args()

    with SessionLocal() as db:
        lesson = db.get(Lesson, args.lesson_id)
        if lesson is None:
            raise SystemExit(f"Lesson {args.lesson_id} not found.")
        pending = (db.query(Question)
                   .filter(Question.lesson_id == args.lesson_id,
                           Question.review_status == ReviewStatus.pending)
                   .order_by(Question.id).all())
        if not pending:
            print(f"No pending questions for lesson {args.lesson_id} ({lesson.title}).")
            return

        print(f"{len(pending)} pending question(s) for lesson {args.lesson_id}: {lesson.title}\n")
        for i, question in enumerate(pending, 1):
            show(db, question, i, len(pending))

        if args.list:
            print("Read-only. Re-run without --list to approve or reject.")
            return

        if args.approve_all:
            for question in pending:
                question.review_status = ReviewStatus.approved
            db.commit()
            print(f"Approved {len(pending)} question(s). They are now served to students.")
            return

        approved = rejected = 0
        for i, question in enumerate(pending, 1):
            show(db, question, i, len(pending))
            while True:
                choice = input("   [a]pprove  [r]eject  [s]kip  [q]uit > ").strip().lower()
                if choice in {"a", "r", "s", "q"}:
                    break
            if choice == "q":
                break
            if choice == "a":
                question.review_status = ReviewStatus.approved
                approved += 1
            elif choice == "r":
                question.review_status = ReviewStatus.rejected
                rejected += 1
        db.commit()
        remaining = len(pending) - approved - rejected
        print(f"\nApproved {approved}, rejected {rejected}, left pending {remaining}.")


if __name__ == "__main__":
    main()
