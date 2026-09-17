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
def test_shared_endpoint_uses_groq_and_current_lesson(client, db, all_lessons, monkeypatch, slug):
    user = User(name="Learner", email="rag@example.com", password_hash="unused")
    db.add(user)
    db.commit()
    client.headers["Authorization"] = f"Bearer {create_access_token(str(user.id))}"
    lesson = db.query(Lesson).join(Subject).filter(Subject.slug == slug, Lesson.order_index == 1).one()
    monkeypatch.setattr(chat.settings, "groq_api_key", "test-key")
    factory = MagicMock()
    provider = factory.return_value.__enter__.return_value
    provider.post.return_value.json.return_value = {"choices": [{"message": {"content": "تعالى نفهم الدرس سوا"}}]}
    monkeypatch.setattr(chat.httpx, "Client", factory)
    result = client.post("/chat/sessions", json={"lesson_id": lesson.id, "mode": "lesson_explain"})
    assert result.status_code == 200
    url = f"/chat/sessions/{result.json()['session_id']}/message"
    result = client.post(url, json={"content": "اشرحلي الدرس ببساطة"})
    assert result.status_code == 200 and result.json()["reply"] == "تعالى نفهم الدرس سوا"
    payload = provider.post.call_args.kwargs["json"]
    assert payload["model"] == "openai/gpt-oss-120b"
    prompt = payload["messages"][0]["content"]
    assert "Egyptian Arabic" in prompt and lesson.title in prompt
    assert f"Source: {slug}/unit 1/" in prompt
    assert all(f"Source: {other}/" not in prompt for other in {"math", "english", "science"} - {slug})
    client.post(url, json={"content": "مش فاهم"})
    assert provider.post.call_count == 2
    assert provider.post.call_args.kwargs["json"]["messages"][1]["content"] == "اشرحلي الدرس ببساطة"
    locked = db.query(Lesson).filter_by(subject_id=lesson.subject_id, order_index=2).one()
    assert client.post("/chat/sessions", json={"lesson_id": locked.id, "mode": "lesson_explain"}).status_code == 403
