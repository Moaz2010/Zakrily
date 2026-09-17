"""Publish English Lesson 1 exercises into the existing question bank.

Run after ingestion: python -m scripts.import_english_questions
Source chunks are not rewritten. Question IDs and attempts survive reruns.
Each item keeps the source skill tag, mapped onto memorization / comprehension /
application / analysis so weak-skill practice can target the student.
"""
import re
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[2] / "content/english/unit 1/lesson1_five_senses.md"

ITEM = re.compile(
    r"\*\*Q(\d+):\*\*\s*(.*?)\n\*\*Skill:\*\*\s*(.+?)\n\*\*A\1:\*\*\s*(.*?)(?=\n\*\*Q\d+:|\n### |\n---|\n\*\*(?!A\d+:|Q\d+:|Skill:)|\Z)",
    re.S,
)
CHOICES = re.compile(r"(?<![A-Za-z])([a-d])\.\s+(.+?)(?=\s+(?<![A-Za-z])[a-d]\.\s+|$)")


def map_skill(raw: str) -> str:
    text = raw.lower()
    if "analy" in text:
        return "analysis"
    if "memoriz" in text:
        return "memorization"
    if any(word in text for word in ("application", "mechanics", "grammar", "production", "writing")):
        return "application"
    return "comprehension"


def split_stem_options(raw: str):
    lines = [line.rstrip() for line in raw.strip().splitlines() if line.strip()]
    index = next((i for i, line in enumerate(lines) if CHOICES.search(line)), None)
    if index is None:
        return raw.strip(), None
    stem = "\n".join(lines[:index]).strip()
    found = CHOICES.findall(" ".join(lines[index:]))
    if len(found) < 2:
        return raw.strip(), None
    return stem, {letter: choice.strip().rstrip(".") for letter, choice in found}


def answer_key(text: str, options: dict | None):
    stripped = text.strip()
    letter = re.match(r"([a-d])\.\s*", stripped, re.I)
    if options and letter:
        return letter.group(1).lower()
    if re.match(r"^(true|t)\b", stripped, re.I):
        return "true"
    if re.match(r"^(false|f)\b", stripped, re.I):
        return "false"
    return None


def explanation_of(text: str) -> str:
    cleaned = re.sub(r"\n\*\(.*", "", text.strip()).strip()
    parts = re.split(r"\s+[—-]\s+", cleaned, maxsplit=1)
    return parts[1].strip() if len(parts) > 1 else cleaned


def extract_items(text: str) -> list[dict]:
    start = text.find("## 5. Exercises")
    end = text.find("## 6. Lesson Summary")
    body = text[start:end if end > start else None]
    items = []
    for match in ITEM.finditer(body):
        stem, options = split_stem_options(match[2])
        answer = match[4].strip()
        key = answer_key(answer, options)
        skill = map_skill(match[3])
        if key in {"true", "false"}:
            options = {"true": "True", "false": "False"}
        item = {
            "source_key": f"q{len(items) + 1}",
            "body": stem,
            "skill": skill,
            "skill_label": match[3].strip(),
            "explanation": explanation_of(answer),
            "scored": True,
        }
        if options and key in options:
            item.update(qtype="mcq", options=options, correct_answer=key)
        elif key in {"true", "false"}:
            item.update(qtype="mcq", options={"true": "True", "false": "False"}, correct_answer=key)
        else:
            correct = re.split(r"\s+[—-]\s+", answer, maxsplit=1)[0].strip()
            correct = re.sub(r"\n\*\(.*", "", correct).strip()
            item.update(qtype="short_answer", options=None, correct_answer=correct)
        items.append(item)

    cloze = re.search(
        r"Word box:\s*(.+?)\n\s*>\s*(.+?)\n\n\*\*Skill:\*\*\s*(.+?)\n+\*\*A:\*\*\s*(.+?)(?=\n### |\n---|\Z)",
        body, re.S,
    )
    if cloze:
        words = [word.strip() for word in re.split(r"\s*[–-]\s*", cloze[1]) if word.strip()]
        passage = " ".join(cloze[2].split())
        skill = map_skill(cloze[3])
        blanks = re.findall(r"(\d+)\.\s*(\w+)\s+[—-]\s*(.+)", cloze[4])
        for number, word, why in blanks:
            items.append({
                "source_key": f"cloze-{number}",
                "body": f"{passage}\n\nBlank [{number}]: choose the missing word.",
                "skill": skill,
                "skill_label": cloze[3].strip(),
                "explanation": why.strip(),
                "scored": True,
                "qtype": "mcq",
                "options": {str(i): option for i, option in enumerate(words)},
                "correct_answer": next(str(i) for i, option in enumerate(words) if option == word),
            })

    writing = re.search(
        r"\*\*Q:\*\*\s*(.+?)\n\*\*Skill:\*\*\s*(.+?)\n+\*\*A \(model answer\):\*\*\s*>\s*(.+?)(?=\n\n\*|\n---|\Z)",
        body, re.S,
    )
    if writing:
        items.append({
            "source_key": "writing",
            "body": " ".join(writing[1].split()),
            "skill": map_skill(writing[2]),
            "skill_label": writing[2].strip(),
            "explanation": " ".join(writing[3].split()),
            "scored": False,
            "qtype": "short_answer",
            "options": None,
            "correct_answer": " ".join(writing[3].split()),
        })
    for index, item in enumerate(items, 1):
        item["number"] = index
    return items


def run():
    from app.core.database import SessionLocal
    from app.models.lesson import Lesson
    from app.models.question import Question, QuestionType, ReviewStatus, SkillTag
    from app.models.subject import Subject

    items = extract_items(SOURCE.read_text(encoding="utf-8"))
    if not items:
        raise ValueError("No English Lesson 1 exercises were found")
    with SessionLocal() as db:
        lesson = db.query(Lesson).join(Subject).filter(Subject.slug == "english", Lesson.order_index == 1).one()
        tags = {tag.slug.value: tag.id for tag in db.query(SkillTag)}
        existing = {
            (question.grading_data or {}).get("source_key"): question
            for question in db.query(Question).filter_by(lesson_id=lesson.id)
        }
        for item in items:
            question = existing.get(item["source_key"])
            if question is None:
                question = Question(lesson_id=lesson.id)
                db.add(question)
            question.skill_tag_id = tags[item["skill"]]
            question.qtype = QuestionType(item["qtype"])
            question.body = item["body"]
            question.options = item["options"]
            question.correct_answer = item["correct_answer"]
            question.explanation = f"{item['skill_label']}. {item['explanation']}".strip()
            question.grading_data = {"number": item["number"], "scored": item["scored"], "source_key": item["source_key"]}
            if item["qtype"] == "short_answer" and item["scored"]:
                question.grading_data["accepted"] = [item["correct_answer"]]
            question.review_status = ReviewStatus.approved
        lesson.is_published = True
        db.commit()
        print(f"Published {len(items)} skill-tagged questions for English Lesson 1 (id={lesson.id}).")


if __name__ == "__main__":
    run()
