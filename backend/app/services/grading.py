"""Grade approved questions on the server and save the evidence for statistics."""
from collections import defaultdict
import unicodedata
import re

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.attempt import Attempt, AttemptContext
from app.models.lesson import Lesson
from app.models.question import Question, QuestionType, ReviewStatus, SkillTag, SkillTagSlug
from app.schemas.quiz import QuestionPublic, QuestionResult, SkillBreakdownItem
from app.services.scoring import has_sufficient_data
from app.services.answer_ideas import matches_ideas
from app.services.math_interactions import grade_interaction, numeric_value


def approved_questions(db: Session, lesson_id: int | None = None, subject_id: int | None = None, include_unscored: bool = False, exclude_comprehension: bool = False):
    query = db.query(Question, SkillTag).join(SkillTag, Question.skill_tag_id == SkillTag.id).join(
        Lesson, Question.lesson_id == Lesson.id,
    ).filter(Question.review_status == ReviewStatus.approved, Lesson.is_published.is_(True))
    if lesson_id is not None:
        query = query.filter(Question.lesson_id == lesson_id)
    if subject_id is not None:
        query = query.filter(Lesson.subject_id == subject_id)
    if exclude_comprehension:
        query = query.filter(SkillTag.slug != SkillTagSlug.comprehension)
    return [(q, tag) for q, tag in query.order_by(Question.id).all()
            if include_unscored or (q.grading_data or {}).get("scored", True)]


def public_question(question, tag):
    return QuestionPublic(id=question.id, lesson_id=question.lesson_id, skill_tag=tag.slug.value,
                          qtype=question.qtype.value, body=question.body, options=question.options,
                          interaction=(question.grading_data or {}).get("interaction"))


def answer_matches(question: Question, answer: str) -> bool:
    def normalize(value):
        return " ".join(unicodedata.normalize("NFKC", value).casefold().split())
    if not answer.strip():
        return False
    if (question.grading_data or {}).get("interaction"):
        return grade_interaction(question.grading_data, answer)
    if question.qtype == QuestionType.numeric:
        actual, expected = numeric_value(answer), numeric_value(question.correct_answer)
        return actual is not None and expected is not None and actual == expected
    if question.qtype == QuestionType.short_answer:
        data = question.grading_data or {}
        candidates = [question.correct_answer, *data.get("accepted", [])]
        return any(matches_ideas(answer, expected, data.get("idea_rubric")) for expected in candidates)
    if (question.grading_data or {}).get("accepted"):
        normalized = lambda value: " ".join(re.findall(r"\w+", normalize(value)))
        return normalized(answer) in {normalized(value) for value in question.grading_data["accepted"]}
    return normalize(answer) == normalize(question.correct_answer)


def save_answers(db: Session, user_id: int, answers, questions, context: AttemptContext):
    by_id = {q.id: (q, tag) for q, tag in questions}
    ids = [a.question_id for a in answers]
    if not ids or len(ids) != len(set(ids)) or any(qid not in by_id for qid in ids):
        raise HTTPException(422, "Submit unique, approved questions from this activity")
    results = []
    totals = defaultdict(lambda: [0, 0])
    for answer in answers:
        question, tag = by_id[answer.question_id]
        correct = answer_matches(question, answer.answer)
        db.add(Attempt(user_id=user_id, question_id=question.id, given_answer=answer.answer,
                       is_correct=correct, context=context))
        totals[tag.slug.value][0] += int(correct)
        totals[tag.slug.value][1] += 1
        results.append(QuestionResult(question_id=question.id, given_answer=answer.answer,
                                      is_correct=correct, correct_answer=question.correct_answer,
                                      explanation=question.explanation, skill_tag=tag.slug.value))
    breakdown = [SkillBreakdownItem(skill_tag=tag, correct=correct, total=total,
                                   accuracy=correct / total, insufficient_data=not has_sufficient_data(total))
                 for tag, (correct, total) in totals.items()]
    return results, breakdown
