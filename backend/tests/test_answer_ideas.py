import pytest
from app.models.question import Question, QuestionType
from app.services.grading import answer_matches
from app.services.answer_ideas import observation_rubric


@pytest.mark.parametrize("answer,correct", [
    ("glass and shose", True), ("using the glass and shoes", True),
    ("shoes and glass", True), ("glass", False), ("shoes", False),
    ("glass but not shoes", False), ("grass and shoes", False), ("", False),
])
def test_same_ideas_without_sentence_scaffolding(answer, correct):
    q = Question(qtype=QuestionType.short_answer, correct_answer="By using the glass and the proper shoes.", grading_data={})
    assert answer_matches(q, answer) is correct


@pytest.mark.parametrize("number,answer,correct", [
    (1, "magnifer", True), (2, "glass and face", True), (2, "glass", False),
    (5, "colour and size", True), (5, "shape and color", False),
    (10, "size, colour, shape, and where it is found", True),
    (10, "size color shape place", True), (10, "size color", False),
    (12, "glass near my eye, move my face back and forth", True),
    (12, "glass far from my eye, move face back and forth", False),
    (13, "glass near eye and move the leaf back and forth", True),
    (19, "the title", True), (19, "not the title", False),
    (20, "date name, drawing, sentences describing", True),
    (21, "thin clear lines without shading", True),
    (21, "thin clear shaded lines", False),
])
def test_lesson_two_required_ideas(number, answer, correct):
    q = Question(qtype=QuestionType.short_answer, correct_answer="Reviewed source answer",
                 grading_data={"idea_rubric": observation_rubric(number)})
    assert answer_matches(q, answer) is correct


def test_choice_and_numbers_still_need_correct_values():
    assert not answer_matches(Question(qtype=QuestionType.mcq, correct_answer="B", grading_data={}), "by using B")
    assert not answer_matches(Question(qtype=QuestionType.numeric, correct_answer="2", grading_data={}), "3")
    assert answer_matches(Question(qtype=QuestionType.numeric, correct_answer="2", grading_data={}), "2.0")


def test_original_answer_with_qualified_negative_is_still_accepted():
    expected = "Since a rock cannot be moved, hold the glass close to your eye and move your face back and front."
    question = Question(qtype=QuestionType.short_answer, correct_answer=expected,
                        grading_data={"idea_rubric": observation_rubric(12)})
    assert answer_matches(question, expected)
