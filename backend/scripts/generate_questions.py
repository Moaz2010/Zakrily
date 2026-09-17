"""AI-04: generate skill-tagged questions grounded in a lesson's content chunks.

Every generated question cites the chunk it came from, so scripts/validate_content.py
can check it is actually supported. Questions land with review_status=pending and
are never served to students until a human approves them.

Usage:
    python -m scripts.generate_questions --lesson-id 12 --per-skill-tag 3
    python -m scripts.generate_questions --lesson-id 12 --provider openai --dry-run
"""

import argparse
import json
import re
import sys

from app.ai_service import providers

# Lesson titles and generated questions may be Arabic; the default Windows
# console codec cannot encode them.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from app.core.database import SessionLocal
from app.models.content_chunk import ContentChunk
from app.models.lesson import Lesson
from app.models.question import Question, QuestionType, ReviewStatus, SkillTag
from app.models.subject import Subject

# What each skill tag is supposed to measure, so the model does not produce four
# rewordings of the same recall question.
SKILL_BRIEFS = {
    "memorization": "recall of a specific fact, term, or definition stated in the source",
    "comprehension": "explaining an idea in the student's own words, or identifying a meaning",
    "application": "using the idea on a fresh, concrete example not copied from the source",
    "analysis": "comparing, classifying, or reasoning about why something is the case",
}

SYSTEM = (
    "You write quiz questions for Egyptian Grade 4 students (age ~9-10).\n"
    "You are given source passages from ONE lesson. Write questions answerable "
    "using ONLY those passages. Never rely on outside knowledge.\n\n"
    "Rules:\n"
    "- Keep the language of the source: English sources get English questions, "
    "Arabic sources get Arabic questions. Keep technical vocabulary intact.\n"
    "- Age-appropriate: short sentences, concrete wording, no trick questions.\n"
    "- PREFER mcq. Grading is automatic, and a short_answer only grades correctly "
    "when the expected answer is one or two words with no valid paraphrase. "
    "If an answer could be phrased several ways, make it an mcq instead.\n"
    "- For mcq, give exactly 4 options keyed a-d, with exactly one correct. "
    "Wrong options must be plausible but clearly wrong from the source.\n"
    "- correct_answer is the option key for mcq, or the exact expected text for "
    "short_answer, or the number alone for numeric.\n"
    "- Each question must test something DIFFERENT. Do not re-ask the same fact "
    "with different wording, and do not repeat a question from an earlier batch.\n"
    "- Every question must cite the source_id it came from.\n"
    "- explanation states why the answer is right, in one or two sentences.\n\n"
    "Return ONLY a JSON array, no prose or code fences. Each element:\n"
    '{"body": str, "qtype": "mcq"|"short_answer"|"numeric", '
    '"options": {"a": str, "b": str, "c": str, "d": str} or null, '
    '"correct_answer": str, "explanation": str, "source_id": int}'
)


def parse_questions(raw: str) -> list[dict]:
    """Pull the JSON array out of a model reply, tolerating code fences."""
    text = raw.strip()
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.S)
    if fence:
        text = fence.group(1).strip()
    if not text.startswith("["):
        start, end = text.find("["), text.rfind("]")
        if start == -1 or end <= start:
            raise ValueError("No JSON array found in the model reply")
        text = text[start:end + 1]
    data = json.loads(text)
    if not isinstance(data, list):
        raise ValueError("Model reply was not a JSON array")
    return data


def normalize_body(body: str) -> str:
    """Strip an inline option list from an mcq stem.

    Models often repeat the choices inside the question text as well as in the
    options object, which would render them twice in the UI.
    """
    return re.sub(r"\s*(?:\(?[a-d][\).]\s+.+?){2,}$", "", body.strip()).strip()


def fingerprint(body: str) -> str:
    """Loose identity for duplicate detection: lowercase alphanumeric words only."""
    return " ".join(re.findall(r"\w+", body.lower()))


def validate_item(item: dict, allowed_ids: set[int]) -> str | None:
    """Return a rejection reason, or None when the item is structurally usable."""
    if not isinstance(item, dict):
        return "not an object"
    for field in ("body", "qtype", "correct_answer", "explanation", "source_id"):
        if not item.get(field) and item.get(field) != 0:
            return f"missing {field}"
    if item["qtype"] not in {"mcq", "short_answer", "numeric"}:
        return f"unknown qtype {item['qtype']!r}"
    try:
        source_id = int(item["source_id"])
    except (TypeError, ValueError):
        return "source_id is not an integer"
    if source_id not in allowed_ids:
        return f"source_id {source_id} is not a chunk of this lesson"
    item["source_id"] = source_id
    if item["qtype"] == "mcq":
        options = item.get("options")
        if not isinstance(options, dict) or len(options) < 2:
            return "mcq needs an options object"
        if str(item["correct_answer"]) not in options:
            return "correct_answer is not one of the options"
        item["body"] = normalize_body(item["body"])
    else:
        item["options"] = None
    if item["qtype"] == "numeric":
        try:
            float(str(item["correct_answer"]).strip())
        except ValueError:
            return "numeric answer is not a number"
    return None


def build_prompt(lesson, subject, chunks, skill, count, avoid: list[str] | None = None) -> str:
    sources = "\n\n".join(
        f"[source_id: {chunk.id}] ({(chunk.chunk_metadata or {}).get('section', 'section')})\n{chunk.text}"
        for chunk in chunks
    )
    already = ""
    if avoid:
        listed = "\n".join(f"- {body}" for body in avoid)
        already = ("\nQuestions already written for this lesson — ask about something "
                   f"else entirely:\n{listed}\n")
    return (
        f"Subject: {subject.name_en}\n"
        f"Lesson {lesson.order_index}: {lesson.title}\n"
        f"Skill to target: {skill} — {SKILL_BRIEFS[skill]}\n"
        f"Write exactly {count} question(s) targeting that skill.\n"
        f"{already}\n"
        f"Source passages:\n{sources}"
    )


def generate(db, lesson_id: int, per_skill_tag: int, provider: str | None,
             skills: list[str] | None = None, model: str | None = None) -> tuple[list[dict], list[str]]:
    """Return (accepted items, rejection notes). Does not write to the database."""
    lesson = db.get(Lesson, lesson_id)
    if lesson is None:
        raise SystemExit(f"Lesson {lesson_id} not found.")
    subject = db.get(Subject, lesson.subject_id)

    # Ground on explanation chunks: exercise chunks are existing questions, and
    # generating from them mostly reproduces the question bank we already have.
    chunks = db.query(ContentChunk).filter(ContentChunk.lesson_id == lesson_id).all()
    explanations = [c for c in chunks
                    if (c.chunk_metadata or {}).get("content_type") == "explanation"] or chunks
    if not explanations:
        raise SystemExit(f"No content chunks for lesson {lesson_id}. Run scripts.ingest first.")

    if model and provider is None:
        provider = providers.provider_of(model)
    chosen = providers.resolve(provider)
    if chosen is None:
        raise SystemExit("No chat provider configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY or GROQ_API_KEY.")
    using = model or providers.model_for(chosen)
    print(f"Lesson {lesson_id} ({subject.name_en} L{lesson.order_index}: {lesson.title}) "
          f"· {len(explanations)} source chunks · provider={chosen} ({using})")

    allowed = {c.id for c in explanations}
    wanted = skills or list(SKILL_BRIEFS)
    accepted, notes = [], []
    existing = [q.body for q in db.query(Question).filter(Question.lesson_id == lesson_id)]
    seen = {fingerprint(body) for body in existing}
    for skill in wanted:
        prompt = build_prompt(lesson, subject, explanations, skill, per_skill_tag,
                              avoid=existing + [item["body"] for item in accepted])
        try:
            raw = providers.complete(chosen, SYSTEM, [{"role": "user", "content": prompt}],
                                     max_tokens=4000, timeout=120.0, model=model)
            items = parse_questions(raw)
        except (providers.ProviderError, ValueError, json.JSONDecodeError) as exc:
            notes.append(f"{skill}: generation failed — {exc}")
            continue
        for item in items:
            reason = validate_item(item, allowed)
            if reason:
                notes.append(f"{skill}: rejected — {reason}")
                continue
            mark = fingerprint(item["body"])
            if mark in seen:
                notes.append(f"{skill}: rejected — duplicate of an existing question")
                continue
            seen.add(mark)
            item["skill"] = skill
            accepted.append(item)
        print(f"  {skill}: {sum(1 for i in accepted if i['skill'] == skill)} accepted")
    return accepted, notes


def save(db, lesson_id: int, items: list[dict]) -> int:
    tags = {tag.slug.value: tag.id for tag in db.query(SkillTag)}
    for item in items:
        db.add(Question(
            lesson_id=lesson_id,
            skill_tag_id=tags[item["skill"]],
            qtype=QuestionType(item["qtype"]),
            body=item["body"],
            options=item["options"],
            correct_answer=str(item["correct_answer"]),
            explanation=item["explanation"],
            source_chunk_id=item["source_id"],
            grading_data={"generated": True, "skill": item["skill"]},
            review_status=ReviewStatus.pending,
        ))
    db.commit()
    return len(items)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lesson-id", type=int, required=True)
    parser.add_argument("--per-skill-tag", type=int, default=3)
    parser.add_argument("--provider", choices=providers.PROVIDERS, default=None,
                        help="Defaults to CHAT_PROVIDER, then whichever key is configured.")
    parser.add_argument("--model", default=None,
                        help="Specific model id, e.g. gpt-4o-mini. Implies its provider.")
    parser.add_argument("--skill", action="append", choices=list(SKILL_BRIEFS), dest="skills",
                        help="Limit to one or more skill tags. Repeatable.")
    parser.add_argument("--dry-run", action="store_true", help="Print results without writing to the database.")
    args = parser.parse_args()

    with SessionLocal() as db:
        items, notes = generate(db, args.lesson_id, args.per_skill_tag, args.provider,
                                args.skills, args.model)
        for note in notes:
            print(f"  ! {note}")
        if not items:
            print("Nothing generated.")
            return
        if args.dry_run:
            print(json.dumps(items, ensure_ascii=False, indent=2))
            print(f"\nDry run: {len(items)} question(s) would be saved as pending.")
            return
        saved = save(db, args.lesson_id, items)
        print(f"\nSaved {saved} question(s) for lesson {args.lesson_id} as review_status=pending.")
        print("They are NOT served to students until approved. "
              "Review with: python -m scripts.review_questions --lesson-id "
              f"{args.lesson_id}")


if __name__ == "__main__":
    main()
