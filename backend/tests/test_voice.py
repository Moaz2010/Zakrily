from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.ai_service import voice
from app.core.security import create_access_token
from app.models.chat import ChatMessage, ChatRole
from app.models.lesson import Lesson
from app.models.subject import Subject
from app.models.user import User


@pytest.fixture
def learner(client, db):
    user = User(name="Voice learner", email="voice@example.com", password_hash="unused")
    db.add(user)
    for lesson in db.query(Lesson):
        lesson.is_published = True
    db.commit()
    client.headers["Authorization"] = f"Bearer {create_access_token(str(user.id))}"
    return user


def lesson_id(db, slug, order=1):
    return db.query(Lesson).join(Subject).filter(Subject.slug == slug, Lesson.order_index == order).one().id


def test_voice_lesson_scope_and_transcript_history(client, db, learner, monkeypatch):
    generate = MagicMock(return_value="What can you see?")
    monkeypatch.setattr(voice, "reply", generate)
    monkeypatch.setattr(voice, "synthesize", lambda text: ["d2F2"])
    monkeypatch.setattr(voice, "transcribe", lambda *args: "I see a tree.")
    english = lesson_id(db, "english")
    response = client.post(f"/voice/lessons/{english}/start")
    assert response.status_code == 200
    assert response.json()["reply"]  # model generates its own opening
    session = response.json()["session_id"]
    response = client.post(f"/voice/sessions/{session}/turn", files={"audio": ("clip.webm", b"audio", "audio/webm")})
    assert response.status_code == 200
    assert response.json()["transcript"] == "I see a tree."
    assert generate.call_args.args[0].id == english
    assert generate.call_args.args[1][0]["role"] == "assistant"
    assert db.query(ChatMessage).filter_by(session_id=session, role=ChatRole.user).count() == 1
    assert client.post(f"/voice/lessons/{lesson_id(db, 'science')}/start").status_code == 422
    assert client.post(f"/voice/lessons/{lesson_id(db, 'english', 2)}/start").status_code == 403
    assert client.post(f"/voice/sessions/{session}/turn", files={"audio": ("clip.txt", b"bad", "text/plain")}).status_code == 415
    other = User(name="Other", email="other-voice@example.com", password_hash="unused")
    db.add(other); db.commit()
    client.headers["Authorization"] = f"Bearer {create_access_token(str(other.id))}"
    assert client.post(f"/voice/sessions/{session}/turn", files={"audio": ("clip.webm", b"audio", "audio/webm")}).status_code == 404


def test_rag_and_provider_payload(monkeypatch):
    retrieval = MagicMock(return_value=[SimpleNamespace(source_ref="lesson 1", text="We see with our eyes.")])
    monkeypatch.setattr(voice, "retrieve", retrieval)
    post = MagicMock()
    post.return_value.json.return_value = {"choices": [{"message": {"content": "What can you see?"}}]}
    monkeypatch.setattr(voice, "post", post)
    assert voice.reply(SimpleNamespace(id=7, title="Five senses"), [], "hello", "db") == "What can you see?"
    assert retrieval.call_args.kwargs["lesson_id"] == 7
    system = post.call_args.kwargs["json"]["messages"][0]["content"]
    assert "We see with our eyes." in system and "Egyptian Grade 4" in system


def test_gemini_tts_pcm_to_wav_header():
    """_pcm_to_wav should produce a valid RIFF/WAV header around the PCM data."""
    pcm = b"\x00\x01" * 100
    wav = voice._pcm_to_wav(pcm, sample_rate=24000, channels=1, sample_width=2)
    assert wav[:4] == b"RIFF"
    assert wav[8:12] == b"WAVE"
    assert wav[12:16] == b"fmt "
    assert wav[-len(pcm):] == pcm


def test_gemini_tts_synthesize_returns_list(monkeypatch):
    """synthesize() returns a list with one base64 WAV string."""
    import base64, struct
    pcm = b"\x00\x00" * 24000  # 1 second of silence
    # Build a fake Gemini response with base64-encoded PCM
    fake_b64 = base64.b64encode(pcm).decode()
    fake_response = MagicMock()
    fake_response.json.return_value = {
        "candidates": [{"content": {"parts": [{"inlineData": {"data": fake_b64}}]}}]
    }
    fake_response.raise_for_status = MagicMock()
    client_mock = MagicMock()
    client_mock.__enter__ = MagicMock(return_value=client_mock)
    client_mock.__exit__ = MagicMock(return_value=False)
    client_mock.post = MagicMock(return_value=fake_response)
    monkeypatch.setattr(voice.settings, "gemini_api_key", "test-key")
    monkeypatch.setattr(voice.httpx, "Client", MagicMock(return_value=client_mock))
    result = voice.synthesize("Hello!")
    assert isinstance(result, list) and len(result) == 1
    wav = base64.b64decode(result[0])
    assert wav[:4] == b"RIFF" and wav[8:12] == b"WAVE"


def test_no_key_is_explicit(monkeypatch):
    monkeypatch.setattr(voice.settings, "groq_api_key", "")
    with pytest.raises(HTTPException) as error:
        voice.post("/audio/transcriptions")
    assert error.value.status_code == 503

    monkeypatch.setattr(voice.settings, "gemini_api_key", "")
    with pytest.raises(HTTPException) as error:
        voice.synthesize("hello")
    assert error.value.status_code == 503


def test_tts_failure_keeps_text(client, db, learner, monkeypatch):
    monkeypatch.setattr(voice, "reply", lambda *args, **kwargs: "Hello!")
    def unavailable(text):
        raise HTTPException(502, "Audio unavailable")
    monkeypatch.setattr(voice, "synthesize", unavailable)
    response = client.post(f"/voice/lessons/{lesson_id(db, 'english')}/start")
    assert response.status_code == 200
    assert response.json()["audio"] == []
    assert response.json()["audio_error"] == "Audio unavailable"


def test_math_checker_grades_only_current_lesson(client, db, learner):
    from app.models.question import Question, QuestionType, ReviewStatus, SkillTag
    math = lesson_id(db, "math")
    q = Question(lesson_id=math, skill_tag_id=db.query(SkillTag).first().id,
                 qtype=QuestionType.numeric, body="2 + 2", correct_answer="4",
                 explanation="2 + 2 = 4", review_status=ReviewStatus.approved)
    db.add(q); db.commit()
    response = client.post(f"/math/lessons/{math}/check", json={"question_id": q.id, "answer": "4.0"})
    assert response.status_code == 200 and response.json()["is_correct"]
    response = client.post(f"/math/lessons/{math}/check", json={"question_id": q.id, "answer": "5"})
    assert not response.json()["is_correct"]
    assert client.post(f"/math/lessons/{lesson_id(db, 'english')}/check", json={"question_id": q.id, "answer": "4"}).status_code == 422
