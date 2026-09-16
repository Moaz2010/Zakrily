import pytest
from sqlalchemy.orm import sessionmaker

from app.core.security import create_access_token
from app.models.attempt import Attempt, LessonProgress
from app.models.content_chunk import ContentChunk
from app.models.lesson import Lesson
from app.models.question import Question
from app.models.subject import Subject
from app.models.user import User
from scripts import ingest, import_science_questions


@pytest.fixture
def activity(db, client, monkeypatch):
    factory = sessionmaker(bind=db.get_bind())
    monkeypatch.setattr(ingest, "SessionLocal", factory)
    monkeypatch.setattr(import_science_questions, "SessionLocal", factory)
    ingest.ingest_file()
    before = [(c.id, c.text, c.chunk_metadata) for c in db.query(ContentChunk)]
    import_science_questions.run()
    import_science_questions.run()
    assert db.query(Question).count() == 31
    assert [(c.id, c.text, c.chunk_metadata) for c in db.query(ContentChunk)] == before
    lesson = db.query(Lesson).join(Subject).filter(Subject.slug == "science", Lesson.order_index == 1).one()
    user = User(name="Learner", email="activity@example.com", password_hash="unused")
    db.add(user)
    db.commit()
    client.headers["Authorization"] = f"Bearer {create_access_token(str(user.id))}"
    return f"/lessons/{lesson.id}/activity", user.id, lesson.id


def test_resume_feedback_idempotency_and_weak_practice(activity, client, db):
    url, user, lesson = activity
    initial = client.get(url).json()
    assert initial["total"] == 31 and initial["scored_total"] == 30
    assert initial["answered"] == 0
    assert all("correct_answer" not in q and "explanation" not in q for q in initial["questions"])
    first, second = initial["questions"][:2]
    payload = {"question_id": first["id"], "answer": "Living things."}
    result = client.post(url + "/answer", json=payload)
    assert result.status_code == 200, result.text
    assert result.json()["feedback"]["is_correct"]
    assert client.post(url + "/answer", json=payload).status_code == 200
    assert db.query(Attempt).count() == 1
    restored = client.get(url).json()
    assert restored["answered"] == 1 and restored["questions"][0]["id"] == second["id"]
    wrong = next(key for key in second["options"] if key != db.get(Question, second["id"]).correct_answer)
    result = client.post(url + "/answer", json={"question_id": second["id"], "answer": wrong}).json()
    assert result["score"] == .5 and result["weakest"] == ["memorization"]
    practice = client.get(url + "?practice=true").json()
    assert [q["id"] for q in practice["questions"]] == [second["id"]]
    body = {"question_id": second["id"], "answer": db.get(Question, second["id"]).correct_answer,
            "practice": True, "previous_attempt_id": practice["questions"][0]["previous_attempt_id"]}
    result = client.post(url + "/answer", json=body).json()
    assert result["score"] == 1 and not result["questions"] and not result["weakest"]
    assert client.post(url + "/answer", json=body).status_code == 409
    assert db.query(Attempt).count() == 3


def test_completion_reflection_and_saved_learning(activity, client, db):
    url, user, lesson = activity
    questions = client.get(url).json()["questions"]
    draft = {"learned_steps": [0, 1], "draft": {"question_id": questions[0]["id"], "answer": "living"}}
    assert client.put(url + "/progress", json=draft).status_code == 200
    saved = client.get(url).json()
    assert saved["learned_steps"] == [0, 1] and saved["drafts"][str(questions[0]["id"])] == "living"
    for item in questions:
        q = db.get(Question, item["id"])
        answer = q.correct_answer if item["scored"] else "I will learn more in Lesson 4"
        response = client.post(url + "/answer", json={"question_id": q.id, "answer": answer})
        assert response.status_code == 200, response.text
    saved = client.get(url).json()
    assert saved["answered"] == 31 and saved["score"] == 1 and saved["correct"] == 30
    assert saved["questions"] == [] and saved["drafts"] == {}
    assert db.query(Attempt).count() == 30
    db.expire_all()
    progress = db.get(LessonProgress, (user, lesson))
    assert progress.status.value == "completed" and progress.score == 1
    assert saved["learned_steps"] == [0, 1]

    # Explicit review restores all questions without deleting historical work.
    review = client.post(url + "/restart")
    assert review.status_code == 200, review.text
    assert review.json()["answered"] == 0 and len(review.json()["questions"]) == 31
    assert review.json()["learned_steps"] == [0, 1]
    assert db.query(Attempt).count() == 30
    repeated = client.post(url + "/answer", json={"question_id": questions[0]["id"], "answer": "rocks"})
    assert repeated.status_code == 200, repeated.text
    assert repeated.json()["feedback"]["is_correct"] is False
    assert repeated.json()["answered"] == 1
    assert db.query(Attempt).count() == 31
    assert client.get(url).json()["questions"][0]["id"] == questions[1]["id"]
    assert client.post(url + "/restart").json()["answered"] == 1
    db.expire_all()
    assert db.get(LessonProgress, (user, lesson)).score == 1
    assert db.get(LessonProgress, (user, lesson)).status.value == "completed"


def test_account_isolation_and_invalid_answers(activity, client, db):
    url, user, lesson = activity
    questions = client.get(url).json()["questions"]
    assert client.post(url + "/answer", json={"question_id": questions[0]["id"], "answer": " "}).status_code == 422
    assert client.post(url + "/answer", json={"question_id": questions[1]["id"], "answer": "not an option"}).status_code == 422
    assert client.post(url + "/answer", json={"question_id": 9999, "answer": "x"}).status_code == 422
    assert client.put(url + "/progress", json={"learned_steps": [99]}).status_code == 422
    client.post(url + "/answer", json={"question_id": questions[0]["id"], "answer": "living organisms"})
    other = User(name="Other", email="second-activity@example.com", password_hash="unused")
    db.add(other)
    db.commit()
    client.headers["Authorization"] = f"Bearer {create_access_token(str(other.id))}"
    assert client.get(url).json()["answered"] == 0
    assert len(client.get(url).json()["questions"]) == 31
    client.headers.pop("Authorization")
    assert client.get(url).status_code == 401


def test_partial_learning_and_questions_increase_path_progress(activity, client, db):
    url, user, lesson = activity
    def fraction():
        return next(n["progress"] for n in client.get("/subjects/science/path").json() if n["lesson_id"] == lesson)

    assert fraction() == 0
    assert client.put(url + "/progress", json={"learned_steps": list(range(10))}).status_code == 200
    assert fraction() == pytest.approx(.25)
    assert client.put(url + "/progress", json={"learned_steps": list(range(20))}).status_code == 200
    assert fraction() == pytest.approx(.5)
    assert client.put(url + "/progress", json={"learned_steps": [20]}).status_code == 422
    question = client.get(url).json()["questions"][0]
    payload = {"question_id": question["id"], "answer": "living organisms"}
    assert client.post(url + "/answer", json=payload).status_code == 200
    assert fraction() == pytest.approx(.5 + .5 / 31)
    assert client.post(url + "/answer", json=payload).status_code == 200
    assert fraction() == pytest.approx(.5 + .5 / 31)


def test_science_lesson_two_loads_and_resumes_without_changing_lesson_one(activity, client, db):
    first_url, user_id, first_id = activity
    from app.models.attempt import LessonStatus

    first_question = client.get(first_url).json()["questions"][0]
    client.post(first_url + "/answer", json={"question_id": first_question["id"], "answer": "living organisms"})
    progress = db.get(LessonProgress, (user_id, first_id))
    progress.status = LessonStatus.completed
    db.commit()
    ingest.ingest_file(ingest.SOURCE.with_name("lesson_2.md"), allow_other=True)
    import_science_questions.run(2)
    lesson = db.query(Lesson).join(Subject).filter(Subject.slug == "science", Lesson.order_index == 2).one()
    url = f"/lessons/{lesson.id}/activity"
    response = client.get(url)
    assert response.status_code == 200, response.text
    assert response.json()["total"] == 22
    saved_cards = client.put(url + "/progress", json={"learned_steps": list(range(11))})
    assert saved_cards.status_code == 200, saved_cards.text
    assert client.get(url).json()["learned_steps"] == list(range(11))
    assert client.put(url + "/progress", json={"learned_steps": [11]}).status_code == 422
    question = response.json()["questions"][0]
    answer = db.get(Question, question["id"]).correct_answer
    submitted = client.post(url + "/answer", json={"question_id": question["id"], "answer": answer})
    assert submitted.status_code == 200, submitted.text
    assert submitted.json()["feedback"]["is_correct"]
    resumed = client.get(url).json()
    assert resumed["answered"] == 1
    assert question["id"] not in {q["id"] for q in resumed["questions"]}
    assert client.get(first_url).json()["answered"] == 1
