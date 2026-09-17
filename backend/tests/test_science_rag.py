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
    monkeypatch.setattr(chat.settings, "groq_api_key", "test-key")
    provider = MagicMock()
    provider.post.return_value.json.return_value = {"choices": [{"message": {"content": "Grounded response"}}]}
    factory = MagicMock()
    factory.return_value.__enter__.return_value = provider
    monkeypatch.setattr(chat.httpx, "Client", factory)
    session = client.post("/chat/sessions", json={"lesson_id": science.id, "mode": "science_explain"})
    assert session.status_code == 200
    url = f"/chat/sessions/{session.json()['session_id']}/message"
    response = client.post(url, json={"content": "What is a habitat?"})
    assert response.status_code == 200 and response.json()["reply"] == "Grounded response"
    prompt = provider.post.call_args.kwargs["json"]
    assert "The place where a living organism lives" in prompt["messages"][0]["content"]
    assert "Type: explanation" in prompt["messages"][0]["content"] and "**ANSWER:**" not in prompt["messages"][0]["content"]
    client.post(url, json={"content": "Answer question 20"})
    prompt = provider.post.call_args.kwargs["json"]
    assert "### Question 20" in prompt["messages"][0]["content"] and "**Options:**" in prompt["messages"][0]["content"]
    assert "**MODEL ANSWER:**" in prompt["messages"][0]["content"] and "Type: explanation" not in prompt["messages"][0]["content"]
    assert prompt["messages"][1]["content"] == "What is a habitat?"
    client.post(url, json={"content": "Explain habitat"})
    assert "Type: exercise" not in provider.post.call_args.kwargs["json"]["messages"][0]["content"]
    count = provider.post.call_count
    result = client.post(url, json={"content": "quantum entanglement"})
    assert "مش لاقية" in result.json()["reply"]
    assert provider.post.call_count == count
    assert client.post(url, json={"content": " "}).status_code == 422
    client.headers["Authorization"] = f"Bearer {create_access_token(str(other.id))}"
    assert client.post(url, json={"content": "Question 1"}).status_code == 404
    assert client.post("/chat/sessions/9999/message", json={"content": "Question 1"}).status_code == 404
    assert client.post("/chat/sessions", json={"lesson_id": 1, "mode": "science_explain"}).status_code == 200


def test_missing_key_and_provider_failure_use_only_retrieved_excerpts(db, science, monkeypatch):
    monkeypatch.setattr(chat.settings, "groq_api_key", "")
    response = chat.explain(science.id, "Answer question 20", [], db=db)
    assert "مش متاح" in response and "### Question 20" in response
    assert "### Question 21" not in response
    monkeypatch.setattr(chat.settings, "groq_api_key", "test-key")
    import httpx
    factory = MagicMock()
    factory.return_value.__enter__.return_value.post.side_effect = httpx.ConnectError("offline")
    monkeypatch.setattr(chat.httpx, "Client", factory)
    response = chat.explain(science.id, "Answer question 20", [], db=db)
    assert "مش متاح" in response and "### Question 20" in response
