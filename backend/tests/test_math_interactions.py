import json
import re
from collections import Counter

import pytest
from sqlalchemy.orm import sessionmaker

from app.core.security import create_access_token
from app.models.attempt import Attempt, LessonProgress, LessonStatus
from app.models.lesson import Lesson
from app.models.question import Question, ReviewStatus
from app.models.subject import Subject
from app.models.user import User
from app.services.grading import answer_matches, public_question
from app.services.math_interactions import numeric_value
from scripts import ingest, import_math_questions
from scripts.math_interactions import number_value


@pytest.fixture
def math_bank(db, monkeypatch):
    factory = sessionmaker(bind=db.get_bind(), autoflush=False)
    monkeypatch.setattr(ingest, "SessionLocal", factory)
    monkeypatch.setattr(import_math_questions, "SessionLocal", factory)
    for path in sorted((ingest.CONTENT_ROOT / "math/unit 1").glob("*.md")):
        ingest.ingest_file(path)
    import_math_questions.run()
    db.expire_all()
    return db.query(Question).all()


def item(db, lesson, key):
    return next(q for q in db.query(Question).join(Lesson).join(Subject).filter(
        Subject.slug == "math", Lesson.order_index == lesson) if q.grading_data.get("source_key") == key)


def sign_in(client, db):
    user = User(name="Math tester", email="math-interactive@example.com", password_hash="unused")
    db.add(user)
    db.commit()
    client.headers["Authorization"] = f"Bearer {create_access_token(str(user.id))}"
    return user


def test_all_worksheets_import_without_lost_parts_or_guessed_diagrams(db, math_bank):
    assert len(math_bank) > 320
    assert all(item(db, 1, f"q7{letter}") for letter in "abcdefghijklmnop")
    assert item(db, 1, "q6").review_status == ReviewStatus.rejected
    counts = Counter(q.grading_data.get("interaction", {}).get("kind") for q in math_bank)
    assert all(counts[kind] > 0 for kind in ["mark_digits", "slots", "order", "compare", "number_line", "fields"])
    for q in math_bank:
        rule = q.grading_data.get("math_rule")
        if rule and rule["kind"] == "exact":
            assert answer_matches(q, json.dumps(rule["expected"])), q.grading_data["source_key"]
            assert not answer_matches(q, "{}")
            assert not answer_matches(q, "not-json")
            wrong = {key: "wrong" for key in rule["expected"]}
            assert not answer_matches(q, json.dumps(wrong))


def test_source_answers_agree_with_rounding_and_digit_positions(db, math_bank):
    assert item(db, 1, "q1a").grading_data["math_rule"]["expected"] == {"underline": "4", "circle": "2", "square": "0"}
    expected = {"q1a": (85721, 85500, 86000), "q2a": (423, 425, 420),
                "q5d": (7435026353, 7435025000, 7435030000), "q10a": (6700, 6500, 7000),
                "q11a": (250000, 250000, 300000), "q11d": (36951, 36950, 37000),
                "q27": (735462, 735000, 740000)}
    for key, (value, midpoint, rounded) in expected.items():
        data = item(db, 8, key).grading_data
        assert data["interaction"]["value"] == value, key
        assert data["math_rule"]["expected"] == {"midpoint": str(midpoint), "rounded": str(rounded)}, key


def test_alternative_valid_digits_and_open_numbers_are_accepted(db, math_bank):
    q = item(db, 5, "q4l")
    assert answer_matches(q, '{"digit":"9"}')
    assert not answer_matches(q, '{"digit":"8"}')
    q = item(db, 5, "q5a")
    assert answer_matches(q, '{"number":"123456"}')
    assert answer_matches(q, '{"number":"793820"}')
    assert not answer_matches(q, '{"number":"893820"}')


def test_every_number_line_matches_the_supplied_answer(db, math_bank):
    for q in math_bank:
        data = q.grading_data
        if data.get("interaction", {}).get("kind") == "number_line":
            expected = re.findall(r"\d[\d,]*", q.correct_answer)[-1].replace(",", "")
            assert data["math_rule"]["expected"]["rounded"] == expected, data["source_key"]


def test_valid_ranges_and_pairs_not_just_example_answer(db, math_bank):
    q = item(db, 8, "q12")
    assert answer_matches(q, json.dumps({str(i): str(311501+i) for i in range(5)}))
    assert not answer_matches(q, json.dumps({str(i): "312000" for i in range(5)}))
    q = item(db, 3, "q6")
    assert answer_matches(q, '{"first":"500,000,000","second":"501,000,000"}')
    assert not answer_matches(q, '{"first":"5","second":"1000005"}')


def test_numeric_grading_supports_arabic_digits_and_grouping():
    assert numeric_value("٦٠٬٠٠٠٬٠٠٠") == 60_000_000
    assert numeric_value("60000000.0") == 60_000_000
    assert numeric_value("1,2") is None
    assert numeric_value("NaN") is None


def test_quiz_returns_questions_and_no_solutions_then_unlocks_lesson_three(client, db, math_bank):
    user = sign_in(client, db)
    lessons = db.query(Lesson).join(Subject).filter(Subject.slug == "math").order_by(Lesson.order_index).all()
    assert client.get(f"/lessons/{lessons[2].id}/quiz").status_code == 403
    for lesson in lessons[:2]:
        db.add(LessonProgress(user_id=user.id, lesson_id=lesson.id, status=LessonStatus.completed))
    db.commit()
    path = client.get("/subjects/math/path").json()
    assert path[2]["status"] == "unlocked"
    response = client.get(f"/lessons/{lessons[2].id}/quiz")
    assert response.status_code == 200 and len(response.json()["questions"]) > 20
    for q in response.json()["questions"]:
        assert "correct_answer" not in q
        assert "math_rule" not in json.dumps(q)
        assert "expected" not in json.dumps(q)
    assert client.get(f"/lessons/{lessons[3].id}/quiz").status_code == 403


def test_interactive_submission_drafts_and_import_repeatability(client, db, math_bank):
    user = sign_in(client, db)
    q = item(db, 1, "q1a")
    prefix = f"/lessons/{q.lesson_id}/activity"
    answer = json.dumps(q.grading_data["math_rule"]["expected"])
    assert client.put(prefix + "/progress", json={"draft": {"question_id": q.id, "answer": answer}}).status_code == 200
    assert client.get(prefix).json()["drafts"][str(q.id)] == answer
    result = client.post(prefix + "/answer", json={"question_id": q.id, "answer": answer})
    assert result.status_code == 200 and result.json()["feedback"]["is_correct"]
    ids = {row.grading_data["source_key"] + f"-{row.lesson_id}": row.id for row in math_bank}
    import_math_questions.run()
    db.expire_all()
    assert ids == {row.grading_data["source_key"] + f"-{row.lesson_id}": row.id for row in db.query(Question)}
    assert db.query(Attempt).filter_by(user_id=user.id, question_id=q.id).count() == 1
    assert client.get(prefix).json()["answered"] == 1


@pytest.mark.parametrize("text,value", [("Ten", 10), ("Hundred Thousand", 100000), ("Seven hundred million, eighty-four", 700000084),
                                       ("(4 × 100,000) + (6 × 10)", 400060), ("5 million and 7 hundred thousand", 5700000)])
def test_mathematical_forms_parser(text, value):
    assert number_value(text) == value
