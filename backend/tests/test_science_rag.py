from unittest.mock import MagicMock

import pytest
from sqlalchemy.orm import sessionmaker

from app.ai_service import chat
from app.ai_service.retrieval import retrieve
from app.core.security import create_access_token
from app.models.content_chunk import ContentChunk
from app.models.lesson import Lesson, LessonSection
from app.models.subject import Subject
from app.models.user import User
from scripts import ingest


@pytest.fixture
def science(db, monkeypatch):
    monkeypatch.setattr(ingest, "SessionLocal", sessionmaker(bind=db.get_bind()))
    ingest.ingest_file()
    return db.query(Lesson).join(Subject).filter(Subject.slug == "science", Lesson.order_index == 1).one()


def test_chunk_boundaries_keep_all_questions_answers_and_options():
    chunks = ingest.chunk_text(ingest.SOURCE.read_text(encoding="utf-8"))
    questions = [c for c in chunks if "question_number" in c.metadata]
    assert [c.metadata["question_number"] for c in questions] == list(range(1, 32))
    for chunk in questions:
        assert chunk.metadata["content_type"] == "exercise"
        assert chunk.text.count("### Question ") == 1
        assert "**ANSWER:**" in chunk.text and "**MODEL ANSWER:**" in chunk.text
    assert "**Options:**" in questions[19].text
    explanations = [c for c in chunks if c.metadata["content_type"] == "explanation"]
    assert all("**ANSWER:**" not in c.text and "**Solution:**" not in c.text for c in explanations)
    assert any("Lesson Summary" in c.text for c in explanations)
    assert any("**Solution:**" in c.text for c in chunks if c.metadata["content_type"] == "exercise")


def test_ingestion_is_repeatable_and_only_publishes_this_lesson(db, science):
    ids = [c.id for c in db.query(ContentChunk).order_by(ContentChunk.id)]
    ingest.ingest_file()
    assert ids == [c.id for c in db.query(ContentChunk).order_by(ContentChunk.id)]
    assert db.query(LessonSection).filter_by(lesson_id=science.id).count() == 9
    assert db.query(Lesson).filter(Lesson.is_published.is_(True)).one().id == science.id
    assert db.query(ContentChunk).filter(ContentChunk.lesson_id != science.id).count() == 0
    with pytest.raises(ValueError):
        ingest.ingest_file(lesson_id=1)


def test_retrieval_scopes_and_empty_results(db, science):
    chunks = retrieve("What is a habitat?", science.id, db=db)
    assert chunks and all(c.metadata["content_type"] == "explanation" for c in chunks)
    assert "habitat" in chunks[0].text.lower()
    assert retrieve("ما هو الموطن؟", science.id, db=db)
    question = retrieve("Answer question 20", science.id, db=db)
    assert len(question) == 1 and question[0].metadata["question_number"] == 20
    assert "**Options:**" in question[0].text and "**MODEL ANSWER:**" in question[0].text
    assert retrieve("السؤال ٢٠", science.id, db=db)[0].metadata["question_number"] == 20
    assert retrieve("Question 999", science.id, db=db) == []
    assert retrieve("quantum entanglement", science.id, db=db) == []
    assert retrieve("habitat", 1, db=db) == []
    assert retrieve("habitat", science.id + 1, db=db) == []
    assert retrieve("", science.id, db=db) == []
    assert retrieve("habitat", science.id, k=0, db=db) == []


def test_legacy_index_is_reembedded_without_mixing_vectors(db, science):
    expected = [c.id for c in retrieve("What is a habitat?", science.id, db=db)]
    rows = db.query(ContentChunk).filter_by(lesson_id=science.id).all()
    for row in rows:
        row.chunk_metadata = {**row.chunk_metadata, "embedding_model": "lexical-hash-v1"}
        row.embedding = [0.0] * len(row.embedding)
    db.commit()
    assert [c.id for c in retrieve("What is a habitat?", science.id, db=db)] == expected
    assert retrieve("habitat", science.id + 1, db=db) == []
    for row in rows:
        row.chunk_metadata = {**row.chunk_metadata, "retired": True}
    db.commit()
    assert retrieve("habitat", science.id, db=db) == []


def test_invalid_provider_key_logs_actionable_error(db, science, monkeypatch, caplog):
    monkeypatch.setattr(chat.providers.settings, "groq_api_key", "test-key")

    def boom(*args, **kwargs):
        raise chat.providers.ProviderError("401 Unauthorized")

    monkeypatch.setattr(chat.providers, "complete", boom)
    reply = chat.explain(science.id, "What is a habitat?", [], db=db)
    assert "مش متاح" in reply
    assert "GROQ_API_KEY" in caplog.text
    assert "test-key" not in caplog.text


def test_website_path_chat_and_actual_grounding(client, db, science, monkeypatch):
    user = User(name="Science learner", email="science@example.com", password_hash="unused")
    other = User(name="Other", email="other@example.com", password_hash="unused")
    db.add_all([user, other])
    db.commit()
    client.headers["Authorization"] = f"Bearer {create_access_token(str(user.id))}"
    path = client.get("/subjects/science/path").json()
    assert path[0]["lesson_id"] == science.id
    detail = client.get(f"/lessons/{science.id}").json()
    assert detail["lesson"]["id"] == science.id
    assert len(detail["sections"]) == 9
    monkeypatch.setattr(chat.providers.settings, "groq_api_key", "test-key")
    calls = []

    def fake_complete(provider, system, messages, **kwargs):
        calls.append({"system": system, "messages": messages})
        return "Grounded response"

    monkeypatch.setattr(chat.providers, "complete", fake_complete)
    session = client.post("/chat/sessions", json={"lesson_id": science.id, "mode": "science_explain"})
    assert session.status_code == 200
    url = f"/chat/sessions/{session.json()['session_id']}/message"
    response = client.post(url, json={"content": "What is a habitat?"})
    assert response.status_code == 200 and response.json()["reply"] == "Grounded response"
    assert "The place where a living organism lives" in calls[-1]["system"]
    assert "Type: explanation" in calls[-1]["system"] and "**ANSWER:**" not in calls[-1]["system"]
    client.post(url, json={"content": "Answer question 20"})
    assert "### Question 20" in calls[-1]["system"] and "**Options:**" in calls[-1]["system"]
    assert "**MODEL ANSWER:**" in calls[-1]["system"] and "Type: explanation" not in calls[-1]["system"]
    assert calls[-1]["messages"][0]["content"] == "What is a habitat?"
    client.post(url, json={"content": "Explain habitat"})
    assert "Type: exercise" not in calls[-1]["system"]
    count = len(calls)
    result = client.post(url, json={"content": "quantum entanglement"})
    assert "مش لاقية" in result.json()["reply"]
    assert len(calls) == count
    assert client.post(url, json={"content": " "}).status_code == 422
    client.headers["Authorization"] = f"Bearer {create_access_token(str(other.id))}"
    assert client.post(url, json={"content": "Question 1"}).status_code == 404
    assert client.post("/chat/sessions/9999/message", json={"content": "Question 1"}).status_code == 404
    assert client.post("/chat/sessions", json={"lesson_id": 1, "mode": "science_explain"}).status_code == 200


def test_missing_key_and_provider_failure_use_only_retrieved_excerpts(db, science, monkeypatch):
    # No provider configured at all: fall back to the retrieved excerpts.
    for key in ("groq_api_key", "anthropic_api_key", "openai_api_key"):
        monkeypatch.setattr(chat.providers.settings, key, "")
    response = chat.explain(science.id, "Answer question 20", [], db=db)
    assert "مش متاح" in response and "### Question 20" in response
    assert "### Question 21" not in response

    # Configured but unreachable: same fallback, never an invented answer.
    monkeypatch.setattr(chat.providers.settings, "groq_api_key", "test-key")

    def boom(*args, **kwargs):
        raise chat.providers.ProviderError("offline")

    monkeypatch.setattr(chat.providers, "complete", boom)
    response = chat.explain(science.id, "Answer question 20", [], db=db)
    assert "مش متاح" in response and "### Question 20" in response
