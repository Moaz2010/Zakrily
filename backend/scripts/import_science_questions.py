"""Publish the user's prepared Science Lesson 1 questions in the existing bank.

Run after ingestion: python -m scripts.import_science_questions
Source and RAG chunks are never changed. IDs and prior attempts survive reruns.
Open-ended questions use answer choices so grading needs no external AI service.
"""
import re

from app.core.database import SessionLocal
from app.models.content_chunk import ContentChunk
from app.services.answer_ideas import observation_rubric
from app.models.question import Question, QuestionType, ReviewStatus, SkillTag

# Distractors are presentation choices, not new lesson facts or RAG knowledge.
DISTRACTORS = {
    2: ["Trees and frogs", "Birds and ants", "Plants and animals"],
    3: ["Color, shape, and size", "Flying, swimming, and running", "Food, rocks, and sunlight"],
    5: ["Clouds; water", "Trees; air", "Water; clouds"],
    10: ["Because they have the same shape.", "Because they are both green.", "Because they cannot grow."],
    11: ["Because there is no food there.", "Because these places have no shelter.", "Because all organisms live in one place."],
    12: ["Because these places are hot and dry.", "Because they are in the full heat of the Sun.", "Because there is no water there."],
    13: ["Because all habitats provide exactly the same things.", "Because organisms have no needs.", "Because all organisms live in one place."],
    15: ["Record, Search, Guess", "Search, Record, Guess", "Guess, Record, Search"],
    16: ["Only in the middle of hot sand", "Only in water", "Only on trees"],
    17: ["All four live only in open, hot sand.", "Grasshopper: underground; ant: on trees; sparrow: under stones; lizard: in water.", "All four live only in water."],
    18: ["(1) damp (2) rocks (3) grass", "(1) rocks (2) grass (3) damp", "(1) grass (2) rocks (3) damp"],
    21: ["(1) heat; fly (2) dryness", "(1) water; swim (2) sunlight", "(1) rocks; grow (2) grass"],
    22: ["Because they can feed, grow, and breathe.", "Because they are both animals.", "Because they are both plants."],
    23: ["Because it cannot breathe.", "Because it is a non-living thing.", "Because it never needs food."],
    24: ["Because all habitats offer the same things.", "Because living organisms do not need shelter.", "Because every organism must live in a desert."],
    25: ["Because they cannot find food there.", "Because there is nowhere to hide.", "Because all birds live underground."],
    26: ["Because these places are hot and dry.", "Because these places have no shade.", "Because these places have no water."],
    27: ["The food a living organism eats.", "A characteristic of non-living things.", "The name of a living organism."],
    29: ["Pictures: (1) Guess (2) Search (3) Record. Order: Record, Search, Guess.", "Pictures: (1) Search (2) Record (3) Guess. Order: Search, Record, Guess.", "Pictures: (1) Record (2) Guess (3) Search. Order: Guess, Record, Search."],
    30: ["By staying in the full heat of the Sun.", "By living only on open, hot sand.", "By avoiding all shade."],
    31: ["Hot and dry, in full sunlight.", "Bright and without water.", "Always hot and sandy."],
}


def field(text, label):
    match = re.search(r"\*\*" + re.escape(label) + r":\*\*\s*(.*?)(?=\n\*\*[A-Z][^\n]*?:\*\*|\Z)", text, re.S)
    if not match:
        raise ValueError(f"Missing {label}")
    return match[1].strip().rstrip("-\n ")


def run(lesson_order: int = 1):
    with SessionLocal() as db:
        chunks = [c for c in db.query(ContentChunk).order_by(ContentChunk.id)
                  if c.chunk_metadata.get("subject") == "science" and c.chunk_metadata.get("unit") == 1
                  and c.chunk_metadata.get("lesson") == lesson_order and c.chunk_metadata.get("question_number")
                  and not c.chunk_metadata.get("retired")]
        if not chunks:
            print(f"No chunks found for Science Lesson {lesson_order}.")
            return
        tags = {tag.slug.value: tag.id for tag in db.query(SkillTag)}
        for chunk in chunks:
            number = chunk.chunk_metadata["question_number"]
            text = chunk.text
            try:
                skill_raw = field(text, "Skill").lower().replace("understanding", "comprehension")
                skill = skill_raw if skill_raw in tags else "comprehension"
            except Exception:
                skill = "comprehension"

            question = db.query(Question).filter_by(source_chunk_id=chunk.id).one_or_none()
            if question is None:
                question = Question(source_chunk_id=chunk.id, lesson_id=chunk.lesson_id)
                db.add(question)

            try:
                question.body = field(text, "Question")
            except Exception:
                question.body = text[:200]

            question.skill_tag_id = tags.get(skill, tags["comprehension"])
            try:
                question.correct_answer = field(text, "ANSWER")
            except Exception:
                question.correct_answer = ""

            try:
                question.explanation = field(text, "MODEL ANSWER")
            except Exception:
                question.explanation = ""

            question.grading_data = {"number": number, "scored": True}
            question.qtype = QuestionType.short_answer
            question.options = None

            if lesson_order == 1:
                question.grading_data = {"number": number, "scored": number != 14}
                question.qtype = QuestionType.mcq
                if number in (1, 4, 19, 28, 14):
                    question.qtype, question.options = QuestionType.short_answer, None
                    aliases = {1: ["living organisms", "living things"], 4: ["habitat", "a habitat"],
                               19: ["habitat", "habitats"], 28: ["tree", "trees"]}
                    question.grading_data = {**question.grading_data, "accepted": aliases.get(number, [])}
                elif number in (6, 7, 8, 9):
                    question.options = {"true": "True", "false": "False"}
                    question.correct_answer = question.correct_answer.lower()
                elif number == 20:
                    question.options = dict(re.findall(r"\* ([A-C])\. (.+)", field(text, "Options")))
                    question.correct_answer = "B"
                    question.grading_data = {**question.grading_data, "accepted": ["B", "C"]}
                else:
                    if number in DISTRACTORS:
                        choices = [question.correct_answer, *DISTRACTORS[number]]
                        offset = number % len(choices)
                        choices = choices[offset:] + choices[:offset]
                        question.options = {str(i): value for i, value in enumerate(choices)}
                        question.correct_answer = next(key for key, value in question.options.items() if value == question.correct_answer)
            else:
                # Lesson 2 processing
                if question.correct_answer.lower() in ("true", "false") or "True/False" in text:
                    question.qtype = QuestionType.mcq
                    question.options = {"true": "True", "false": "False"}
                    question.correct_answer = question.correct_answer.lower()
                else:
                    question.qtype = QuestionType.short_answer
                    question.options = None
                    question.grading_data = {**question.grading_data, "accepted": [question.correct_answer]}

            if lesson_order == 2 and question.qtype == QuestionType.short_answer:
                question.grading_data = {**question.grading_data, "idea_rubric": observation_rubric(number)}
            question.review_status = ReviewStatus.approved
        db.commit()
        print(f"Published {len(chunks)} source questions for Science Lesson {lesson_order}.")


if __name__ == "__main__":
    import sys
    order = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    run(order)
