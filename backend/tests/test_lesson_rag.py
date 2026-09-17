from unittest.mock import MagicMock

import pytest
from sqlalchemy.orm import sessionmaker

from app.ai_service import chat
from app.ai_service.retrieval import retrieve
from app.core.security import create_access_token
from app.models.content_chunk import ContentChunk
from app.models.lesson import Lesson
from app.models.subject import Subject
from app.models.user import User
from scripts import ingest


@pytest.fixture
def all_lessons(db, monkeypatch):
    monkeypatch.setattr(ingest, "SessionLocal", sessionmaker(bind=db.get_bind()))
    for path in sorted(ingest.CONTENT_ROOT.glob("*/unit 1/*.md")):
        ingest.ingest_file(path)
    return db.query(Lesson).all()


def test_all_16_lessons_are_isolated_and_repeatable(db, all_lessons):
    assert len(all_lessons) == 16
    before = {row.source_ref: row.id for row in db.query(ContentChunk)}
    for lesson in all_lessons:
        subject = db.get(Subject, lesson.subject_id).slug.value
        assert lesson.is_published
        for query in ["اشرحلي الدرس ببساطة", "Question 1"]:
            results = retrieve(query, lesson.id, db=db)
            assert results, (subject, lesson.order_index, query)
            assert all(c.lesson_id == lesson.id and c.metadata["subject"] == subject
                       and c.metadata["lesson"] == lesson.order_index for c in results)
    for path in sorted(ingest.CONTENT_ROOT.glob("*/unit 1/*.md")):
        ingest.ingest_file(path)
    assert before == {row.source_ref: row.id for row in db.query(ContentChunk)}


def test_math_rules_and_english_summary_are_explanations(db, all_lessons):
    english = db.query(Lesson).join(Subject).filter(Subject.slug == "english", Lesson.order_index == 1).one()
    math = db.query(Lesson).join(Subject).filter(Subject.slug == "math", Lesson.order_index == 2).one()
    for lesson, section in [(english, "6. Lesson Summary"), (math, "6. Important Rules and Formulas")]:
        rows = db.query(ContentChunk).filter_by(lesson_id=lesson.id).all()
        matches = [r for r in rows if r.chunk_metadata["section"] == section]
        assert matches and all(r.chunk_metadata["content_type"] == "explanation" for r in matches)
    questions = retrieve("Question 1", english.id, db=db)
    assert questions and all("**Q1:**" in c.text and "**A1:**" in c.text for c in questions)
    assert all("**Q2:**" not in c.text for c in questions)
    senses = retrieve("الحواس", english.id, db=db)
    assert senses and "senses" in senses[0].text.lower()
    place_value = retrieve("القيمة المكانية", math.id, db=db)
    assert place_value and "place value" in place_value[0].text.lower()


@pytest.mark.parametrize("slug", ["english", "math", "science"])
def test_shared_endpoint_grounds_in_the_current_lesson(client, db, all_lessons, monkeypatch, slug):
    user = User(name="Learner", email="rag@example.com", password_hash="unused")
    db.add(user)
    db.commit()
    client.headers["Authorization"] = f"Bearer {create_access_token(str(user.id))}"
    lesson = db.query(Lesson).join(Subject).filter(Subject.slug == slug, Lesson.order_index == 1).one()
    monkeypatch.setattr(chat.providers.settings, "groq_api_key", "test-key")
    calls = []

    def fake_complete(provider, system, messages, **kwargs):
        calls.append({"provider": provider, "system": system, "messages": messages, **kwargs})
        return "تعالى نفهم الدرس سوا"

    monkeypatch.setattr(chat.providers, "complete", fake_complete)
    result = client.post("/chat/sessions", json={"lesson_id": lesson.id, "mode": "lesson_explain"})
    assert result.status_code == 200
    url = f"/chat/sessions/{result.json()['session_id']}/message"
    result = client.post(url, json={"content": "اشرحلي الدرس ببساطة"})
    assert result.status_code == 200 and result.json()["reply"] == "تعالى نفهم الدرس سوا"
    prompt = calls[-1]["system"]
    assert "Egyptian Arabic" in prompt and lesson.title in prompt
    assert f"Source: {slug}/unit 1/" in prompt
    assert all(f"Source: {other}/" not in prompt for other in {"math", "english", "science"} - {slug})
    client.post(url, json={"content": "مش فاهم"})
    assert len(calls) == 2
    # The follow-up turn carries the previous question forward as history.
    assert calls[-1]["messages"][0]["content"] == "اشرحلي الدرس ببساطة"
    locked = db.query(Lesson).filter_by(subject_id=lesson.subject_id, order_index=2).one()
    assert client.post("/chat/sessions", json={"lesson_id": locked.id, "mode": "lesson_explain"}).status_code == 403


def test_message_can_select_a_model_and_reports_it(client, db, all_lessons, monkeypatch):
    user = User(name="Picker", email="picker@example.com", password_hash="unused")
    db.add(user)
    db.commit()
    client.headers["Authorization"] = f"Bearer {create_access_token(str(user.id))}"
    lesson = db.query(Lesson).join(Subject).filter(Subject.slug == "science", Lesson.order_index == 1).one()
    monkeypatch.setattr(chat.providers.settings, "openai_api_key", "test-key")
    monkeypatch.setattr(chat.providers.settings, "anthropic_api_key", "")
    monkeypatch.setattr(chat.providers.settings, "groq_api_key", "")
    used = {}

    def fake_complete(provider, system, messages, **kwargs):
        used["provider"], used["model"] = provider, kwargs.get("model")
        return "رد تجريبي"

    monkeypatch.setattr(chat.providers, "complete", fake_complete)
    session_id = client.post("/chat/sessions", json={"lesson_id": lesson.id, "mode": "lesson_explain"}).json()["session_id"]
    url = f"/chat/sessions/{session_id}/message"

    result = client.post(url, json={"content": "اشرحلي الدرس", "model": "gpt-4o-mini"})
    assert result.status_code == 200
    assert used == {"provider": "openai", "model": "gpt-4o-mini"}
    assert result.json()["provider"] == "openai" and result.json()["model"] == "gpt-4o-mini"

    # A model whose provider has no key configured is refused, not silently swapped.
    assert client.post(url, json={"content": "تاني", "model": "claude-haiku-4-5-20251001"}).status_code == 503
    assert client.post(url, json={"content": "تاني", "model": "not-a-model"}).status_code == 422


def test_stream_endpoint_emits_deltas_and_saves_once_complete(client, db, all_lessons, monkeypatch):
    user = User(name="Streamer", email="stream@example.com", password_hash="unused")
    db.add(user)
    db.commit()
    client.headers["Authorization"] = f"Bearer {create_access_token(str(user.id))}"
    lesson = db.query(Lesson).join(Subject).filter(Subject.slug == "science", Lesson.order_index == 1).one()
    monkeypatch.setattr(chat.providers.settings, "anthropic_api_key", "test-key")
    monkeypatch.setattr(chat.providers, "stream",
                        lambda *args, **kwargs: iter(["مرحبا ", "يا بطل"]))

    session_id = client.post("/chat/sessions", json={"lesson_id": lesson.id, "mode": "lesson_explain"}).json()["session_id"]
    response = client.post(f"/chat/sessions/{session_id}/stream", json={"content": "اشرحلي الدرس"})
    assert response.status_code == 200
    body = response.text
    assert '"delta": "مرحبا "' in body or "مرحبا" in body
    assert '"done": true' in body

    from app.models.chat import ChatMessage as Message, ChatRole as Role
    saved = db.query(Message).filter_by(session_id=session_id, role=Role.assistant).all()
    assert len(saved) == 1 and saved[0].content == "مرحبا يا بطل"
