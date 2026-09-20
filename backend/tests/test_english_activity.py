from collections import Counter

from sqlalchemy.orm import sessionmaker

from app.core.security import create_access_token
from app.models.question import Question
from app.models.lesson import Lesson
from app.models.subject import Subject
from app.models.user import User
from scripts.import_english_questions import SOURCE, extract_items, run as import_english


def test_source_keeps_skill_tags_and_unique_numbers():
    items = extract_items(SOURCE.read_text(encoding="utf-8"))
    assert len(items) == 24
    assert [item["number"] for item in items] == list(range(1, 25))
    assert {item["skill"] for item in items} == {"memorization", "application", "analysis"}
    assert Counter(item["skill"] for item in items)["memorization"] == 6
    assert items[0]["qtype"] == "mcq" and items[0]["correct_answer"] == "a" and items[0]["skill"] == "application"
    assert items[-1]["source_key"] == "writing" and items[-1]["scored"] is False and items[-1]["skill"] == "application"
    assert sum(item["qtype"] == "mcq" for item in items) == 21
    assert all(item["skill_label"] for item in items)


def test_english_activity_resumes_and_targets_weak_skills(db, client, monkeypatch):
    monkeypatch.setattr("app.core.database.SessionLocal", sessionmaker(bind=db.get_bind()))
    import_english()
    import_english()
    lesson = db.query(Lesson).join(Subject).filter(Subject.slug == "english", Lesson.order_index == 1).one()
    assert db.query(Question).filter_by(lesson_id=lesson.id).count() == 24
    user = User(name="Learner", email="english-activity@example.com", password_hash="unused")
    db.add(user)
    db.commit()
    client.headers["Authorization"] = f"Bearer {create_access_token(str(user.id))}"
    url = f"/lessons/{lesson.id}/activity"
    initial = client.get(url).json()
    assert initial["total"] == 24 and initial["scored_total"] == 23
    assert all(q["skill_tag"] in {"memorization", "comprehension", "application", "analysis"} for q in initial["questions"])
    first = initial["questions"][0]
    assert first["number"] == 1 and first["skill_tag"] == "application" and "a" in first["options"]
    payload = {"question_id": first["id"], "answer": "a"}
    result = client.post(url + "/answer", json=payload)
    assert result.status_code == 200, result.text
    assert result.json()["feedback"]["is_correct"]
    assert client.post(url + "/answer", json=payload).status_code == 200
    restored = client.get(url).json()
    assert restored["answered"] == 1 and restored["questions"][0]["id"] != first["id"]

    second = restored["questions"][0]
    wrong = next(key for key in second["options"] if key != db.get(Question, second["id"]).correct_answer)
    result = client.post(url + "/answer", json={"question_id": second["id"], "answer": wrong}).json()
    assert result["feedback"]["is_correct"] is False
    assert second["skill_tag"] in result["weakest"]
    practice = client.get(url + "?practice=true").json()
    assert [q["id"] for q in practice["questions"]] == [second["id"]]
    body = {
        "question_id": second["id"],
        "answer": db.get(Question, second["id"]).correct_answer,
        "practice": True,
        "previous_attempt_id": practice["questions"][0]["previous_attempt_id"],
    }
    result = client.post(url + "/answer", json=body).json()
    assert result["score"] == 1 and not result["questions"]
    writing_id = next(
        question.id for question in db.query(Question).filter_by(lesson_id=lesson.id)
        if (question.grading_data or {}).get("source_key") == "writing"
    )
    saved = client.post(url + "/answer", json={"question_id": writing_id, "answer": "I can hear and smell, and stay safe."})
    assert saved.status_code == 200, saved.text
    assert saved.json()["reflection_saved"] is True
