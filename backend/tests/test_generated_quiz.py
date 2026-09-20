import json
from unittest.mock import MagicMock
from types import SimpleNamespace

import httpx
import pytest
from fastapi import HTTPException
from sqlalchemy.orm import sessionmaker

from app.ai_service import quiz_generator
from app.core.security import create_access_token
from app.models.attempt import Attempt, LessonProgress, LessonStatus
from app.models.content_chunk import ContentChunk
from app.models.generated_quiz import GeneratedQuiz
from app.models.lesson import Lesson
from app.models.question import Question, SkillTagSlug
from app.models.subject import Subject
from app.models.user import User
from app.routers import generated_quiz
from scripts import ingest


@pytest.fixture
def setup_quiz(db, client, monkeypatch):
    monkeypatch.setattr(quiz_generator.settings, "anthropic_api_key", "")
    monkeypatch.setattr(ingest, "SessionLocal", sessionmaker(bind=db.get_bind()))
    ingest.ingest_file()
    lesson = db.query(Lesson).join(Subject).filter(Subject.slug == "science", Lesson.order_index == 1).one()
    user = User(name="Quiz learner", email="generated@example.com", password_hash="unused")
    db.add(user)
    db.commit()
    client.headers["Authorization"] = f"Bearer {create_access_token(str(user.id))}"
    calls = []

    def fake_generate(lesson, subject, sources, *, skill=None, previous=()):
        assert sources and all(s.lesson_id == lesson.id and s.subject_id == lesson.subject_id for s in sources)
        calls.append(skill)
        skills = [skill] * 10 if skill else ["memorization"] * 4 + ["comprehension"] * 4 + ["application"] * 4 + ["analysis"] * 3
        return [quiz_generator.GeneratedQuestion(body=f"Question {len(calls)} - {i}: Which habitat fits?", skill=s,
                options={"A": "Desert", "B": "Ocean", "C": "Forest", "D": "River"}, correct_answer="A",
                explanation="The lesson describes this habitat.", source_id=sources[0].id,
                source_quote=sources[0].text[:40]) for i, s in enumerate(skills)]

    monkeypatch.setattr(generated_quiz, "generate", fake_generate)
    return lesson, user, calls


def test_generation_is_available_for_all_16_lessons(client, db, setup_quiz):
    _, user, _ = setup_quiz
    for path in sorted(ingest.CONTENT_ROOT.glob("*/unit 1/*.md")):
        ingest.ingest_file(path)
    lessons = db.query(Lesson).all()
    for lesson in lessons:
        db.add(LessonProgress(user_id=user.id, lesson_id=lesson.id, status=LessonStatus.completed))
    db.commit()
    assert len(lessons) == 16
    for lesson in lessons:
        response = client.post(f"/lessons/{lesson.id}/generated-quiz/start", json={})
        assert response.status_code == 200, response.text
        assert len(response.json()["questions"]) == 15
        assert {q["lesson_id"] for q in response.json()["questions"]} == {lesson.id}


def answers(run, wrong_skill=None):
    return {"answers": [{"question_id": q["id"], "answer": "B" if q["skill_tag"] == wrong_skill else "A"} for q in run["questions"]]}


def test_three_attempts_resume_grade_and_practice(client, db, setup_quiz):
    lesson, user, calls = setup_quiz
    base = f"/lessons/{lesson.id}/generated-quiz"
    assert client.get(base).json()["attempts_used"] == 0
    for attempt in range(1, 4):
        response = client.post(base + "/start", json={})
        assert response.status_code == 200
        run = response.json()
        assert len(run["questions"]) == 15 and run["attempt"] == attempt
        assert "correct_answer" not in response.text and "explanation" not in response.text
        assert client.post(base + "/start", json={}).json()["id"] == run["id"]
        assert len(calls) == attempt
        submission = answers(run, "analysis")
        graded = client.post(f"{base}/{run['id']}/submit", json=submission)
        assert graded.status_code == 200
        result = graded.json()["result"]
        assert result["correct"] == 12 and result["total"] == 15
        assert result["motivation_points"] == 10
        assert result["weakest_skills"] == ["analysis"]
        count = db.query(Attempt).count()
        assert client.post(f"{base}/{run['id']}/submit", json=answers(run)).json()["result"] == result
        assert db.query(Attempt).count() == count
    assert client.post(base + "/start", json={}).status_code == 409
    assert db.get(LessonProgress, (user.id, lesson.id)).status == LessonStatus.completed
    for skill in SkillTagSlug:
        payload = {"skill": skill.value, "quiz_id": run["id"]}
        practice = client.post(base + "/start", json=payload).json()
        assert len(practice["questions"]) == 10
        assert {q["skill_tag"] for q in practice["questions"]} == {skill.value}
        assert practice["quiz_id"] == run["id"]
        assert client.post(base + "/start", json=payload).json()["id"] == practice["id"]
        response = client.post(f"{base}/{practice['id']}/submit", json=answers(practice))
        assert response.json()["result"]["correct"] == 10
        assert response.json()["result"]["weakest_skills"] == []
    assert client.get(base).json()["attempts_used"] == 3
    assert sum(s["total"] for s in client.get("/me/skills").json()) == 85
    # Generated questions must not leak into the shared lesson exercise bank.
    generated_ids = {qid for row in db.query(GeneratedQuiz) for qid in row.question_ids}
    assert not generated_ids.intersection(q["id"] for q in client.get(f"/lessons/{lesson.id}/quiz").json()["questions"])


def test_old_quiz_slots_are_not_resumed_after_content_generator_update(client, db, setup_quiz):
    lesson, user, _ = setup_quiz
    old = GeneratedQuiz(user_id=user.id, lesson_id=lesson.id, slot="quiz:1", question_ids=[])
    db.add(old)
    db.commit()
    state = client.get(f"/lessons/{lesson.id}/generated-quiz").json()
    assert state["attempts_used"] == 0


def test_generated_quiz_90_percent_gets_higher_motivation_reward(client, db, setup_quiz):
    lesson, user, _ = setup_quiz
    base = f"/lessons/{lesson.id}/generated-quiz"
    run = client.post(base + "/start", json={}).json()
    payload = answers(run)
    payload["answers"][0]["answer"] = "B"  # 14/15 = 93%
    response = client.post(f"{base}/{run['id']}/submit", json=payload)
    assert response.status_code == 200
    result = response.json()["result"]
    assert result["score"] >= .9
    assert result["motivation_points"] == 20
    assert "٩٠٪" in result["motivation_message"]
    # Replaying the submission returns the stored result and cannot award again.
    assert client.post(f"{base}/{run['id']}/submit", json=answers(run)).json()["result"] == result
    rewards_summary = client.get("/me/rewards").json()
    assert rewards_summary["points"] == 14 * 5 + 20 + 2 * 10  # two five-answer streak bonuses


def test_validation_ownership_and_generation_failure(client, db, setup_quiz, monkeypatch):
    lesson, user, calls = setup_quiz
    base = f"/lessons/{lesson.id}/generated-quiz"
    original = generated_quiz.generate
    monkeypatch.setattr(generated_quiz, "generate", MagicMock(side_effect=HTTPException(503, "Unavailable")))
    assert client.post(base + "/start", json={}).status_code == 503
    assert client.get(base).json()["attempts_used"] == 0
    monkeypatch.setattr(generated_quiz, "generate", original)
    run = client.post(base + "/start", json={}).json()
    url = f"{base}/{run['id']}/submit"
    assert client.post(base + "/start", json={"skill": "analysis", "quiz_id": run["id"]}).status_code == 409
    payload = answers(run)
    payload["answers"].pop()
    assert client.post(url, json=payload).status_code == 422
    payload = answers(run)
    payload["answers"][0] = payload["answers"][1]
    assert client.post(url, json=payload).status_code == 422
    payload = answers(run)
    payload["answers"][0]["answer"] = "unknown"
    assert client.post(url, json=payload).status_code == 422
    assert db.query(Attempt).count() == 0
    other = User(name="Other", email="other-quiz@example.com", password_hash="unused")
    db.add(other)
    db.commit()
    client.headers["Authorization"] = f"Bearer {create_access_token(str(other.id))}"
    assert client.post(url, json=answers(run)).status_code == 404
    assert client.get(base).json()["runs"] == []
    assert client.post(base + "/start", json={"skill": "analysis", "quiz_id": run["id"]}).status_code == 404
    locked = db.query(Lesson).filter_by(subject_id=lesson.subject_id, order_index=2).one()
    assert client.post(f"/lessons/{locked.id}/generated-quiz/start", json={}).status_code == 403


@pytest.mark.parametrize("fault", [None, "count", "skill", "citation", "quote", "duplicate", "answer", "provider", "timeout", "missing_key"])
def test_provider_validation(db, setup_quiz, monkeypatch, fault):
    lesson, user, calls = setup_quiz
    sources = db.query(ContentChunk).filter_by(lesson_id=lesson.id).all()
    subject = db.get(Subject, lesson.subject_id)
    questions = [q.model_dump(mode="json") for q in generated_quiz.generate(lesson, subject, sources)]
    if fault == "count": questions.pop()
    if fault == "skill": questions[0]["skill"] = "analysis"
    if fault == "citation": questions[0]["source_id"] = -1
    if fault == "quote": questions[0]["source_quote"] = "This invented quotation is not in the lesson."
    if fault == "duplicate": questions[0]["body"] = questions[1]["body"]
    if fault == "answer": questions[0]["correct_answer"] = "E"
    response = httpx.Response(401 if fault == "provider" else 200,
        json={"choices": [{"message": {"content": json.dumps({"questions": questions})}}]},
        request=httpx.Request("POST", "https://api.groq.com"))
    factory = MagicMock()
    factory.return_value.__enter__.return_value.post.return_value = response
    if fault == "timeout":
        factory.return_value.__enter__.return_value.post.side_effect = httpx.ReadTimeout("timeout")
    monkeypatch.setattr(quiz_generator.httpx, "Client", factory)
    monkeypatch.setattr(quiz_generator.settings, "groq_api_key", "" if fault == "missing_key" else "test-only")
    if fault in {"provider", "timeout"}:
        with pytest.raises(HTTPException) as error:
            quiz_generator.generate(lesson, subject, sources)
        assert error.value.status_code == 503
    elif fault == "missing_key":
        assert len(quiz_generator.generate(lesson, subject, sources)) >= 10
    else:
        expected_count = 14 if fault in {"count", "citation", "quote", "duplicate", "answer"} else 15
        assert len(quiz_generator.generate(lesson, subject, sources)) == expected_count
        sent = factory.return_value.__enter__.return_value.post.call_args.kwargs["json"]
        assert sent["response_format"] == {"type": "json_object"}


def test_missing_provider_key_generates_new_questions_from_explanations(db, setup_quiz, monkeypatch):
    lesson, _, _ = setup_quiz
    sources = db.query(ContentChunk).filter_by(lesson_id=lesson.id).all()
    subject = db.get(Subject, lesson.subject_id)
    monkeypatch.setattr(quiz_generator.settings, "groq_api_key", "")
    result = quiz_generator.generate(lesson, subject, sources)
    assert len(result) >= 10
    assert len({q.body for q in result}) == len(result)
    assert all(q.source_id for q in result)
    assert all(q.correct_answer == "A" for q in result)


def test_anthropic_is_preferred_when_configured(db, setup_quiz, monkeypatch):
    lesson, _, _ = setup_quiz
    sources = db.query(ContentChunk).filter_by(lesson_id=lesson.id).all()
    subject = db.get(Subject, lesson.subject_id)
    template = quiz_generator.GeneratedQuestion(
        body="Which habitat does the lesson describe?", skill="memorization",
        options={"A": "Desert", "B": "Ocean", "C": "Forest", "D": "River"}, correct_answer="A",
        explanation="The lesson supports this answer.", source_id=sources[0].id,
        source_quote=sources[0].text[:40])
    content = json.dumps({"questions": [template.model_copy(update={
        "body": f"Which habitat does the lesson describe? {i}",
        "skill": list(SkillTagSlug)[i % 4].value,
    }).model_dump(mode="json") for i in range(15)]})
    response = httpx.Response(200, json={"content": [{"type": "text", "text": content}]},
                              request=httpx.Request("POST", "https://api.anthropic.com"))
    factory = MagicMock()
    factory.return_value.__enter__.return_value.post.return_value = response
    monkeypatch.setattr(quiz_generator.httpx, "Client", factory)
    monkeypatch.setattr(quiz_generator.settings, "anthropic_api_key", "test-anthropic")
    result = quiz_generator.generate(lesson, subject, sources)
    assert len(result) == 15
    request = factory.return_value.__enter__.return_value.post.call_args
    assert request.args[0] == "https://api.anthropic.com/v1/messages"
    assert request.kwargs["headers"]["x-api-key"] == "test-anthropic"


@pytest.mark.parametrize("count", [10, 16, 20, 35])
def test_flexible_provider_counts_and_cap(db, setup_quiz, monkeypatch, count):
    lesson, _, _ = setup_quiz
    sources = db.query(ContentChunk).filter_by(lesson_id=lesson.id).all()
    subject = db.get(Subject, lesson.subject_id)
    template = generated_quiz.generate(lesson, subject, sources)[0].model_dump(mode="json")
    questions = [{**template, "body": f"Distinct generated question number {i}?",
                  "skill": list(SkillTagSlug)[i % 4].value.title()} for i in range(count)]
    response = httpx.Response(200, json={"choices": [{"message": {"content": json.dumps({"questions": questions})}}]},
                              request=httpx.Request("POST", "https://api.groq.com"))
    factory = MagicMock()
    factory.return_value.__enter__.return_value.post.return_value = response
    monkeypatch.setattr(quiz_generator.httpx, "Client", factory)
    monkeypatch.setattr(quiz_generator.settings, "groq_api_key", "test-only")
    result = quiz_generator.generate(lesson, subject, sources)
    assert len(result) == min(count, 20)
    assert {q.skill for q in result} == set(SkillTagSlug)
    assert factory.return_value.__enter__.return_value.post.call_count == 1


def test_twenty_questions_can_be_submitted(client, db, setup_quiz, monkeypatch):
    lesson, _, _ = setup_quiz
    original = generated_quiz.generate
    def generate_twenty(*args, **kwargs):
        questions = original(*args, **kwargs)
        return questions + [q.model_copy(update={"body": q.body + " extra"}) for q in questions[:5]]
    monkeypatch.setattr(generated_quiz, "generate", generate_twenty)
    base = f"/lessons/{lesson.id}/generated-quiz"
    run = client.post(base + "/start", json={}).json()
    assert len(run["questions"]) == 20
    response = client.post(f"{base}/{run['id']}/submit", json=answers(run))
    assert response.status_code == 200
    assert response.json()["result"]["total"] == 20
    assert response.json()["result"]["score"] == 1


def test_quote_formatting_preserves_words():
    assert quiz_generator.normalize_quote("The **desert** is dry.") == quiz_generator.normalize_quote("The desert is dry")
    assert quiz_generator.normalize_quote("The desert is wet") != quiz_generator.normalize_quote("The desert is dry")


def test_source_prompt_has_bounded_explanations_and_exercises():
    sources = [SimpleNamespace(id=i, text="Source content " * 400,
               chunk_metadata={"content_type": "exercise" if i % 2 else "explanation"}) for i in range(60)]
    selected = quiz_generator.select_sources(sources)
    assert sum(map(len, selected.values())) <= quiz_generator.SOURCE_CHAR_BUDGET
    assert 0 in selected and 1 not in selected
    assert all(text in sources[sid].text for sid, text in selected.items())


def test_source_selection_excludes_existing_exercise_content():
    sources = [SimpleNamespace(id=1, text="The lesson teaches habitats.", chunk_metadata={"content_type": "explanation"}),
               SimpleNamespace(id=2, text="Which habitat is dry? A. Desert", chunk_metadata={"content_type": "exercise"})]
    selected = quiz_generator.select_sources(sources)
    assert selected == {1: "The lesson teaches habitats."}


@pytest.mark.parametrize("recover", [False, True])
def test_retries_insufficient_grounded_questions(db, setup_quiz, monkeypatch, recover):
    lesson, _, _ = setup_quiz
    sources = db.query(ContentChunk).filter_by(lesson_id=lesson.id).all()
    subject = db.get(Subject, lesson.subject_id)
    questions = [q.model_dump(mode="json") for q in generated_quiz.generate(lesson, subject, sources)]
    invalid = [{**q, "source_quote": "This invented quotation is not in the lesson."} for q in questions]
    def response(items):
        return httpx.Response(200, json={"choices": [{"message": {"content": json.dumps({"questions": items})}}]},
                              request=httpx.Request("POST", "https://api.groq.com"))
    factory = MagicMock()
    factory.return_value.__enter__.return_value.post.side_effect = [response(invalid), response(questions if recover else invalid)]
    monkeypatch.setattr(quiz_generator.httpx, "Client", factory)
    monkeypatch.setattr(quiz_generator.settings, "groq_api_key", "test-only")
    if recover:
        assert len(quiz_generator.generate(lesson, subject, sources)) == 15
    else:
        with pytest.raises(HTTPException) as exc:
            quiz_generator.generate(lesson, subject, sources)
        assert exc.value.status_code == 503
    assert factory.return_value.__enter__.return_value.post.call_count == 2


def test_arabic_text_normalization():
    from app.ai_service.quiz_generator import normalize_text
    assert normalize_text("حَوَاسُّنَا تُسَاعِدُنَا") == normalize_text("حواسنا تساعدنا")
    assert normalize_text("الْأَسْئِلَةُ أَهَمُّ") == normalize_text("الاسئلة اهم")
