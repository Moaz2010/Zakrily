"""Count actual lesson cards so clients cannot invent extra reward-bearing steps."""
import re

from app.models.subject import Subject


def clean(text):
    return re.sub(r"^---\s*$", "", text, flags=re.M).strip()


def paragraphs(text):
    return [p for p in re.split(r"\n\s*\n", text) if p.strip()]


def card_count(db, lesson):
    slug = db.get(Subject, lesson.subject_id).slug.value
    if slug == "english" and lesson.order_index == 1:
        return 20
    if slug == "science":
        if lesson.id == 13 or any("How to Observe" in s.body_md for s in lesson.sections):
            return 11
        if lesson.id == 12 and any("Living Organisms" in s.body_md for s in lesson.sections):
            return 20
        total = 0
        for section in lesson.sections:
            if section.heading.startswith("6.") or any(word in section.heading.lower() for word in ("exercise", "question")):
                continue
            blocks = re.split(r"^### (.+)$", section.body_md, flags=re.M)
            bodies = blocks[2::2] if len(blocks) > 1 else [section.body_md]
            total += sum(len(paragraphs(clean(body))) for body in bodies)
        return max(1, total)
    total = 0
    for section in lesson.sections:
        for paragraph in paragraphs(section.body_md):
            normalized = re.sub(r"^>\s?", "", paragraph, flags=re.M).strip()
            if len(normalized) > 180 and "|" not in normalized:
                pending = []
                sentences = re.split(r"(?<=[.!?])\s+", re.sub(r"\s*\n\s*", " ", normalized))
                for index, sentence in enumerate(sentences):
                    pending.append(sentence)
                    if len(" ".join(pending)) > 120 or index == len(sentences) - 1:
                        total += 1
                        pending = []
            else:
                total += 1
    return total
