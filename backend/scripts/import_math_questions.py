"""Publish the prepared Math Unit 1 exercises into the existing question bank.

Run after ingestion:  python -m scripts.import_math_questions          (all lessons)
                      python -m scripts.import_math_questions 3        (one lesson)

Source and RAG chunks are never changed. Question IDs and prior attempts
survive reruns, because each question is keyed to the chunk it came from.

Grading policy, in order of preference:
1. The source already lists Options -> multiple choice, graded on the letter.
2. The answer is a single number -> numeric, graded by decimal comparison.
3. The answer is one short phrase -> short answer, with accepted variants.
4. Anything else (multi-part answers like "a. 4 b. 6", prose) -> saved as an
   unscored practice item. It still shows the model answer, but it does not
   feed accuracy statistics, because free-text grading cannot judge it fairly.
"""
import re
import sys

from app.core.database import SessionLocal
from app.models.attempt import Attempt
from app.models.content_chunk import ContentChunk
from app.models.lesson import Lesson
from app.models.question import Question, QuestionType, ReviewStatus, SkillTag

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

OPTION_LINE = re.compile(r"\*\s*([A-Z])\.\s*(.+)")
# "C. 5" -> C ;  "D" -> D
ANSWER_LETTER = re.compile(r"^\(?([A-Z])[\).\s]", re.M)
NUMERIC = re.compile(r"^-?[\d,]+(?:\.\d+)?$")
# "a. 80 b. 50,000" and friends: more than one labelled part in one answer.
MULTIPART = re.compile(r"(?:^|\s)[a-h][\.\)]\s")
UNDETERMINED = "cannot be determined"

SKILL_ALIASES = {
    "understanding": "comprehension",
    "problem solving": "application",
    "problem-solving": "application",
    "reasoning": "analysis",
}


def field(text: str, label: str) -> str | None:
    match = re.search(r"\*\*" + re.escape(label) + r":\*\*\s*(.*?)(?=\n\*\*[A-Z][^\n]*?:\*\*|\Z)", text, re.S)
    return match[1].strip().rstrip("-\n ") if match else None


# "a. 8 in the Tens place?  b. 5 in the Ten Thousands place?" -> [(a, ...), (b, ...)]
PART = re.compile(r"(?:^|\s)([a-h])[\.\)]\s+(.+?)(?=\s+[a-h][\.\)]\s|$)", re.S)


def split_parts(body: str, answer: str) -> list[tuple[str, str, str]]:
    """Split one worksheet question into its labelled sub-questions.

    The source writes these as a single item ("a. ... b. ..."), which cannot be
    graded as one free-text answer and reads badly next to the English and
    Science banks. Returns [] unless the parts line up one-to-one, so a
    mismatch never pairs a question with the wrong answer.
    """
    body_parts = PART.findall(" ".join(body.split()))
    answer_parts = PART.findall(" ".join(answer.split()))
    if len(body_parts) < 2 or len(body_parts) != len(answer_parts):
        return []
    if [key for key, _ in body_parts] != [key for key, _ in answer_parts]:
        return []
    stem = " ".join(body.split())[:PART.search(" ".join(body.split())).start()].strip()
    return [(key, f"{stem} {text}".strip() if stem else text, ans)
            for (key, text), (_, ans) in zip(body_parts, answer_parts)]


def map_skill(raw: str | None, tags: dict) -> str:
    key = (raw or "").strip().lower()
    key = SKILL_ALIASES.get(key, key)
    return key if key in tags else "comprehension"


def clean_number(value: str) -> str:
    return value.replace(",", "").strip()


def classify(answer: str, options_raw: str | None) -> tuple[QuestionType, dict | None, str, bool, list[str]]:
    """Return (qtype, options, correct_answer, scored, accepted_variants)."""
    flat = " ".join(answer.split())

    if UNDETERMINED in flat.lower():
        return QuestionType.short_answer, None, flat, False, []

    if options_raw:
        options = dict(OPTION_LINE.findall(options_raw))
        letter = ANSWER_LETTER.match(flat.strip())
        if options and letter and letter[1] in options:
            return QuestionType.mcq, options, letter[1], True, []
        if options:
            # The source lists choices but its answer names none of them, so we
            # cannot tell which is right. Show it, but never auto-score it.
            return QuestionType.short_answer, None, flat, False, []

    if MULTIPART.search(flat):
        return QuestionType.short_answer, None, flat, False, []

    if NUMERIC.match(flat.rstrip(".")):
        bare = clean_number(flat.rstrip("."))
        return QuestionType.numeric, None, bare, True, [flat.rstrip("."), bare]

    if len(flat) <= 60:
        variants = [flat, flat.rstrip(".")]
        if NUMERIC.match(flat.rstrip(".")):
            variants.append(clean_number(flat))
        return QuestionType.short_answer, None, flat, True, sorted(set(variants))

    return QuestionType.short_answer, None, flat, False, []


def run(lesson_order: int | None = None) -> None:
    with SessionLocal() as db:
        chunks = [c for c in db.query(ContentChunk).order_by(ContentChunk.id)
                  if (c.chunk_metadata or {}).get("subject") == "math"
                  and c.chunk_metadata.get("unit") == 1
                  and c.chunk_metadata.get("question_number")
                  and not c.chunk_metadata.get("retired")
                  and (lesson_order is None or c.chunk_metadata.get("lesson") == lesson_order)]
        if not chunks:
            target = "any lesson" if lesson_order is None else f"Lesson {lesson_order}"
            print(f"No ingested Math question chunks for {target}. Run scripts.ingest first.")
            return

        tags = {tag.slug.value: tag.id for tag in db.query(SkillTag)}
        counts = {"mcq": 0, "numeric": 0, "short": 0, "unscored": 0}
        touched_lessons = set()

        for chunk in chunks:
            text = chunk.text
            answer = field(text, "ANSWER")
            body = field(text, "Question")
            if not answer or not body:
                counts["unscored"] += 1
                continue

            number = chunk.chunk_metadata["question_number"]
            skill_tag_id = tags[map_skill(field(text, "Skill"), tags)]
            explanation = field(text, "MODEL ANSWER") or field(text, "Final Answer") or ""
            options_raw = field(text, "Options")

            # Worksheet items like "a. ... b. ..." become one question per part,
            # so Math reads like the English and Science banks instead of one
            # ungradable wall of text.
            parts = [] if options_raw else split_parts(body, answer)
            variants = ([(f"q{number}", body, answer)] if not parts
                        else [(f"q{number}{key}", part_body, part_answer)
                              for key, part_body, part_answer in parts])

            for source_key, part_body, part_answer in variants:
                qtype, options, correct, scored, accepted = classify(
                    part_answer, options_raw if len(variants) == 1 else None)

                question = next(
                    (q for q in db.query(Question).filter_by(source_chunk_id=chunk.id)
                     if (q.grading_data or {}).get("source_key") == source_key), None)
                if question is None:
                    question = Question(source_chunk_id=chunk.id, lesson_id=chunk.lesson_id)
                    db.add(question)

                question.body = part_body
                question.skill_tag_id = skill_tag_id
                question.qtype = qtype
                question.options = options
                question.correct_answer = correct
                question.explanation = explanation
                question.grading_data = {
                    "number": number,
                    "source_key": source_key,
                    "scored": scored,
                    **({"accepted": accepted} if accepted else {}),
                }
                question.review_status = ReviewStatus.approved
                touched_lessons.add(chunk.lesson_id)

                if not scored:
                    counts["unscored"] += 1
                elif qtype == QuestionType.mcq:
                    counts["mcq"] += 1
                elif qtype == QuestionType.numeric:
                    counts["numeric"] += 1
                else:
                    counts["short"] += 1

        # An earlier import stored one row per worksheet item, before questions
        # were split into parts. Drop those superseded rows, but never one a
        # student has already answered.
        superseded = [q for q in db.query(Question).filter(Question.lesson_id.in_(touched_lessons))
                      if not (q.grading_data or {}).get("source_key")]
        removed = 0
        for question in superseded:
            if db.query(Attempt).filter_by(question_id=question.id).count() == 0:
                db.delete(question)
                removed += 1
        if removed:
            print(f"Removed {removed} superseded question row(s) from an earlier import.")

        for lesson_id in touched_lessons:
            lesson = db.get(Lesson, lesson_id)
            if lesson and not lesson.is_published:
                lesson.is_published = True

        db.commit()
        total = sum(counts.values())
        print(f"Published {total} Math question(s) across {len(touched_lessons)} lesson(s).")
        print(f"  multiple choice: {counts['mcq']}")
        print(f"  numeric:         {counts['numeric']}")
        print(f"  short answer:    {counts['short']}")
        print(f"  unscored:        {counts['unscored']}  (shown for practice, excluded from accuracy)")


if __name__ == "__main__":
    run(int(sys.argv[1]) if len(sys.argv) > 1 else None)
