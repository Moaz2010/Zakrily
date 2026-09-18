from types import SimpleNamespace

import pytest

from app.ai_service import math_tutor
from app.ai_service.embeddings import EMBEDDING_MODEL, embed
from app.core.security import create_access_token
from app.models.content_chunk import ContentChunk
from app.models.lesson import Lesson
from app.models.subject import Subject
from app.models.user import User
from app.routers import math


def add_chunk(db, *, subject="math", order=1, unit=1, model="lexical-hash-v2", retired=False):
    lesson = db.query(Lesson).join(Subject).filter(Subject.slug == subject, Lesson.order_index == order).one()
    lesson.is_published = True
    chunk = ContentChunk(
        lesson_id=lesson.id, subject_id=lesson.subject_id,
        text="Place value: 345 is 3 hundreds, 4 tens and 5 ones.",
        source_ref=f"{subject}/unit {unit}/lesson_{order}.md",
        # Deliberately unrelated old vectors must not drive the new ranking.
        embedding=embed("unrelated") if model != EMBEDDING_MODEL else embed("Place value: 345 is 3 hundreds, 4 tens and 5 ones."),
        chunk_metadata={"unit": unit, "embedding_model": model, "retired": retired},
    )
    db.add(chunk)
    db.commit()
    return chunk


@pytest.mark.parametrize("model", ["lexical-hash-v2", EMBEDDING_MODEL, None])
def test_retrieval_uses_existing_curriculum_across_index_versions(db, model):
    chunk = add_chunk(db, model=model)
    if model is None:
        chunk.chunk_metadata = {"unit": 1}
        db.commit()
    before = (dict(chunk.chunk_metadata), list(chunk.embedding))
    assert math_tutor.retrieve_unit_chunks(db, "place value") == [chunk]
    db.expire_all()
    assert (chunk.chunk_metadata, list(chunk.embedding)) == before
    assert math_tutor.retrieve_unit_chunks(db, "place value", k=0) == []


def test_retrieval_excludes_retired_unpublished_other_units_and_subjects(db):
    add_chunk(db, retired=True)
    add_chunk(db, subject="science")
    add_chunk(db, unit=3)
    hidden = add_chunk(db, order=2)
    db.get(Lesson, hidden.lesson_id).is_published = False
    valid = add_chunk(db, order=3, unit=2)
    mismatched = add_chunk(db, order=4)
    mismatched.subject_id = db.query(Subject).filter_by(slug="english").one().id
    db.commit()
    assert math_tutor.retrieve_unit_chunks(db, "place value", k=1) == [valid]


def test_question_endpoint_with_old_index_is_grounded(client, db, monkeypatch):
    signed_in_learner(client, db)
    chunk = add_chunk(db)
    monkeypatch.setattr(math.settings, "groq_api_key", "test-key")
    prompts = []

    def complete(_provider, system, _messages, **_kwargs):
        prompts.append(system)
        return "اكتبي العدد ٣٤٥ بالصورة التحليلية."

    monkeypatch.setattr(math_tutor.providers, "complete", complete)
    response = client.post("/math/tutor/question")
    assert response.status_code == 200
    assert chunk.text in prompts[0]
    feedback = client.post("/math/tutor/feedback", data={"question": response.json()["question"]},
                           files={"image": ("solution.png", b"photo", "image/png")})
    assert feedback.status_code == 200
    assert chunk.text in prompts[1]


def test_truly_empty_content_returns_arabic_message_without_generation(client, db, monkeypatch):
    signed_in_learner(client, db)
    monkeypatch.setattr(math.settings, "groq_api_key", "test-key")
    monkeypatch.setattr(math_tutor.providers, "complete", lambda *_a, **_kw: pytest.fail("No grounding"))
    response = client.post("/math/tutor/question")
    assert response.status_code == 503
    assert response.json()["detail"] == "محتوى الرياضيات لسه مش جاهز. جرّبي تاني بعد شوية."


def signed_in_learner(client, db):
    user = User(name="Math learner", email="math-tutor@example.com", password_hash="unused")
    db.add(user)
    db.commit()
    client.headers["Authorization"] = f"Bearer {create_access_token(str(user.id))}"


def test_tutor_question_and_photo_feedback_flow(client, db, monkeypatch):
    signed_in_learner(client, db)
    monkeypatch.setattr(math.settings, "groq_api_key", "test-key")
    monkeypatch.setattr(math, "generate_question", lambda _db: "اكتبي العدد ٣٤٥ بالصورة التحليلية.")

    question = client.post("/math/tutor/question")
    assert question.status_code == 200
    assert question.json() == {
        "question": "اكتبي العدد ٣٤٥ بالصورة التحليلية.",
        "model": "qwen/qwen3.8-27b",
    }

    captured = {}

    def fake_review(_db, prompt, image_bytes, mime_type):
        captured.update(question=prompt, image=image_bytes, mime=mime_type)
        return "برافو، فككتي المئات صح. راجعي بس خطوة العشرات؛ مكتوبة ٣٠ مش ٤٠."

    monkeypatch.setattr(math, "review_handwritten_work", fake_review)
    feedback = client.post(
        "/math/tutor/feedback",
        data={"question": question.json()["question"]},
        files={"image": ("solution.png", b"visible-work", "image/png")},
    )
    assert feedback.status_code == 200
    assert feedback.json()["model"] == "qwen/qwen3.8-27b"
    assert "خطوة العشرات" in feedback.json()["feedback"]
    assert captured == {"question": question.json()["question"], "image": b"visible-work", "mime": "image/png"}


def test_tutor_rejects_non_image_uploads(client, db, monkeypatch):
    signed_in_learner(client, db)
    monkeypatch.setattr(math.settings, "groq_api_key", "test-key")
    response = client.post(
        "/math/tutor/feedback",
        data={"question": "١ + ١ كام؟"},
        files={"image": ("notes.txt", b"not an image", "text/plain")},
    )
    assert response.status_code == 422


def test_feedback_uses_qwen_vision_payload_and_exact_tone_rules(monkeypatch):
    chunk = SimpleNamespace(source_ref="math/unit 1/lesson_1.md", text="Place value content")
    monkeypatch.setattr(math_tutor, "retrieve_unit_chunks", lambda *_args: [chunk])
    called = {}

    def fake_complete(provider, system, messages, **kwargs):
        called.update(provider=provider, system=system, messages=messages, kwargs=kwargs)
        return "برافو"

    monkeypatch.setattr(math_tutor.providers, "complete", fake_complete)
    assert math_tutor.review_handwritten_work(None, "١ + ١ كام؟", b"photo", "image/jpeg") == "برافو"
    assert called["provider"] == "groq"
    assert called["kwargs"]["model"] == "qwen/qwen3.8-27b"
    assert called["kwargs"]["reasoning_effort"] == "none"
    assert called["messages"][0]["content"][1]["type"] == "image_url"
    assert called["messages"][0]["content"][1]["image_url"]["url"].startswith("data:image/jpeg;base64,")
    assert math_tutor.TONE_RULES in called["system"]
