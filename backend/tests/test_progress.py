from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest

from app.core.security import create_access_token
from app.models.attempt import Attempt, AttemptContext, LessonProgress
from app.models.lesson import Lesson
from app.models.question import Question, QuestionType, ReviewStatus, SkillTag
from app.models.subject import Subject
from app.models.user import User
from app.services.progress import learner_stats
from app.services.grading import answer_matches


@pytest.fixture
def learner(db, client):
    user = User(name="Student", email="student@example.com", password_hash="unused")
    other = User(name="Other", email="other@example.com", password_hash="unused")
    db.add_all([user, other])
    db.commit()
    client.headers["Authorization"] = f"Bearer {create_access_token(str(user.id))}"
    return user, other


@pytest.fixture
def questions(db):
    subject = db.query(Subject).filter(Subject.slug == "english").one()
    lessons = db.query(Lesson).filter(Lesson.subject_id == subject.id).order_by(Lesson.order_index).all()
    tags = db.query(SkillTag).order_by(SkillTag.id).all()
    result = []
    for lesson in lessons:
        lesson.is_published = True
        for i in range(3):
            q = Question(lesson_id=lesson.id, skill_tag_id=tags[i % 2].id, qtype=QuestionType.mcq,
                         body=f"Question {i}", options={"a": "Yes", "b": "No"}, correct_answer="a",
                         explanation="Explanation", review_status=ReviewStatus.approved)
            db.add(q)
            result.append(q)
    db.commit()
    return result


def submit(client, questions, answers):
    return client.post(f"/lessons/{questions[0].lesson_id}/quiz/submit", json={
        "answers": [{"question_id": q.id, "answer": answer} for q, answer in zip(questions, answers)]
    })


def test_empty_stats_and_authentication(client, learner):
    data = client.get("/me/stats").json()
    assert data["accuracy"] is None
    assert data["streak_days"] == data["total_attempts"] == 0
    assert len(data["week"]) == 7 and all(day["total"] == 0 for day in data["week"])
    assert sum(s["total_lessons"] for s in data["subjects"]) == 16
    assert all(s["accuracy"] is None for s in data["subjects"])
    assert client.get("/me/stats?timezone=Invalid/Zone").status_code == 422
    client.headers.pop("Authorization")
    assert client.get("/me/stats").status_code == 401


def test_quiz_grading_persists_scores_and_unlocks(client, db, learner, questions):
    quiz = client.get(f"/lessons/{questions[0].lesson_id}/quiz").json()
    assert len(quiz["questions"]) == 3
    assert "correct_answer" not in quiz["questions"][0]
    result = submit(client, questions[:3], ["a", "a", "b"])
    assert result.status_code == 200
    assert result.json()["score"] == pytest.approx(2 / 3)
    assert result.json()["unlocked_next"] is True
    assert db.query(Attempt).count() == 3
    path = client.get("/subjects/english/path").json()
    assert [n["status"] for n in path] == ["completed", "unlocked", "locked"]
    assert path[0]["score"] == pytest.approx(2 / 3)
    # A lower retake cannot erase a completed lesson or its best score.
    assert submit(client, questions[:3], ["b", "b", "b"]).json()["unlocked_next"] is False
    db.expire_all()
    assert client.get("/subjects/english/path").json()[0]["score"] == pytest.approx(2 / 3)
    stats = client.get("/me/stats").json()
    assert stats["accuracy"] == pytest.approx(2 / 6)
    assert stats["streak_days"] == 1
    assert stats["week"][-1]["total"] == 6
    assert stats["subjects"][0]["completed_lessons"] == 1
    assert stats["subjects"][0]["next_lesson"]["lesson_id"] == questions[3].lesson_id


def test_practice_counts_towards_weighted_accuracy_but_not_completion(client, db, learner, questions):
    submit(client, questions[:3], ["a", "a", "b"])
    result = client.post("/practice/submit", json={"answers": [{"question_id": questions[0].id, "answer": "b"}]})
    assert result.status_code == 200 and result.json()["results"][0]["is_correct"] is False
    stats = client.get("/me/stats").json()
    assert stats["accuracy"] == .5  # correct / answers, not an average of skill percentages
    assert stats["subjects"][0]["accuracy"] == .5
    assert stats["subjects"][0]["completed_lessons"] == 1
    skills = client.get("/me/skills?subject=english").json()
    assert sum(s["total"] for s in skills) == 4
    assert sum(s["correct"] for s in skills) == 2
    practice = client.get(f"/practice/next?subject=english&lesson_id={questions[3].lesson_id}").json()
    assert {q["lesson_id"] for q in practice["questions"]} == {questions[3].lesson_id}


def test_users_cannot_see_each_others_progress(client, db, learner, questions):
    submit(client, questions[:3], ["a"] * 3)
    client.headers["Authorization"] = f"Bearer {create_access_token(str(learner[1].id))}"
    assert client.get("/me/stats").json()["total_attempts"] == 0
    assert client.get("/me/stats").json()["streak_days"] == 0
    path = client.get("/subjects/english/path").json()
    assert path[0]["score"] is None and path[1]["status"] == "locked"


def test_invalid_and_locked_submissions_do_not_save(client, db, learner, questions):
    assert submit(client, questions[3:6], ["a"] * 3).status_code == 403
    assert submit(client, questions[:1], ["a"]).status_code == 422
    answers = [{"question_id": q.id, "answer": "a"} for q in questions[:3]]
    assert client.post(f"/lessons/{questions[0].lesson_id}/quiz/submit", json={"answers": answers + answers[:1]}).status_code == 422
    for payload in ([], [{"question_id": 99999, "answer": "a"}], [answers[0], answers[0]]):
        assert client.post("/practice/submit", json={"answers": payload}).status_code == 422
    assert client.get("/practice/next?subject=english&n=0").status_code == 422
    questions[0].review_status = ReviewStatus.pending
    db.commit()
    assert client.post("/practice/submit", json={"answers": answers[:1]}).status_code == 422
    assert db.query(Attempt).count() == db.query(LessonProgress).count() == 0


@pytest.mark.parametrize("offsets,expected", [([], 0), ([0, 1, 2], 3), ([1, 2], 2), ([2, 3], 0), ([0, 2], 1)])
def test_timezone_streak_and_zero_filled_week(db, learner, questions, offsets, expected):
    now = datetime(2026, 9, 16, 22, 30, tzinfo=timezone.utc)  # Sept 17 in Cairo
    for offset in offsets:
        db.add(Attempt(user_id=learner[0].id, question_id=questions[0].id, given_answer="a", is_correct=True,
                       context=AttemptContext.practice, created_at=now - timedelta(days=offset)))
    db.commit()
    stats = learner_stats(db, learner[0].id, ZoneInfo("Africa/Cairo"), now)
    assert stats["streak_days"] == expected
    assert stats["week"][-1]["date"].isoformat() == "2026-09-17"
    assert sum(day["total"] for day in stats["week"]) == len(offsets)


def test_real_registration_and_login(client):
    body = {"name": "New student", "email": "new@example.com", "password": "my-password"}
    result = client.post("/auth/register", json=body)
    assert result.status_code == 200
    token = result.json()["token"]
    assert client.get("/me", headers={"Authorization": f"Bearer {token}"}).json()["name"] == "New student"
    assert client.post("/auth/login", json=body).status_code == 200
    assert client.post("/auth/login", json={**body, "password": "wrong"}).status_code == 401
    assert client.post("/auth/register", json={**body, "password": "x" * 73}).status_code == 422


def test_failed_quiz_has_a_real_zero_score_without_unlocking(client, db, learner, questions):
    response = submit(client, questions[:3], ["b", "b", "b"])
    assert response.status_code == 200 and response.json()["score"] == 0
    assert response.json()["unlocked_next"] is False
    path = client.get("/subjects/english/path").json()
    assert path[0]["score"] == 0 and path[0]["status"] == "unlocked"
    assert path[1]["status"] == "locked"
    stats = client.get("/me/stats").json()
    assert stats["accuracy"] == 0 and stats["total_attempts"] == 3


def test_text_and_numeric_grading():
    question = Question(qtype=QuestionType.short_answer, correct_answer="Healthy Habits")
    assert answer_matches(question, "  healthy   HABITS ")
    assert not answer_matches(question, "")
    question.qtype = QuestionType.numeric
    question.correct_answer = "5"
    assert answer_matches(question, "5.00")
    assert not answer_matches(question, "5.01")
    assert not answer_matches(question, "NaN")
    assert not answer_matches(question, "Infinity")
