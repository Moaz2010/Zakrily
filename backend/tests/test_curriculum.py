from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.security import get_current_user
from app.main import app
from app.models.lesson import Lesson, LessonSection
from app.models.question import SkillTag
from app.models.subject import Subject
from scripts import seed


@pytest.fixture
def curriculum_client(client):
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=1)
    try:
        yield client
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.parametrize("slug,count,first,last", [
    ("english", 3, "What are the Five Senses?", "Story Time – Goha's Great Meal"),
    ("math", 8, "Big Numbers! Changing Values", "Rounding Rules"),
    ("science", 5, "Let's Find Living Organisms", "Desert Living Organisms"),
])
def test_subject_path_and_lesson_details_agree(curriculum_client, slug, count, first, last):
    response = curriculum_client.get(f"/subjects/{slug}/path")
    assert response.status_code == 200
    path = response.json()
    assert len(path) == count
    assert path[0]["title"] == first
    assert path[-1]["title"] == last
    assert [node["order"] for node in path] == list(range(1, count + 1))
    assert path[0]["status"] == "unlocked"
    assert all(node["status"] == "locked" for node in path[1:])
    for node in path:
        detail = curriculum_client.get(f'/lessons/{node["lesson_id"]}').json()
        assert detail["lesson"]["title"] == node["title"]
        assert detail["lesson"]["order_index"] == node["order"]
        assert detail["sections"] == []  # Names supplied; no invented lesson content.


def test_catalog_ids_and_missing_lessons(curriculum_client):
    subjects = curriculum_client.get("/subjects").json()
    assert {subject["slug"] for subject in subjects} == {"english", "math", "science"}
    ids = []
    for subject in subjects:
        path = curriculum_client.get(f'/subjects/{subject["slug"]}/path').json()
        ids.extend(node["lesson_id"] for node in path)
    assert len(ids) == len(set(ids)) == 16
    assert curriculum_client.get("/lessons/9999").status_code == 404
    assert curriculum_client.get("/subjects/unknown/path").status_code == 422


def test_seed_can_be_repeated_without_losing_existing_content(monkeypatch):
    engine = create_engine("sqlite://")
    for table in (Subject.__table__, SkillTag.__table__, Lesson.__table__, LessonSection.__table__):
        table.create(engine)
    session = sessionmaker(bind=engine)
    monkeypatch.setattr(seed, "SessionLocal", session)
    seed.run()
    with session() as db:
        existing = db.query(Lesson).first()
        lesson_id = existing.id
        existing.objective = "Keep this reviewed objective"
        existing.is_published = True
        db.add(LessonSection(lesson_id=lesson_id, order_index=1, heading="Reviewed", body_md="Keep this content"))
        db.commit()
    seed.run()
    with session() as db:
        assert db.query(Subject).count() == 3
        assert db.query(Lesson).count() == 16
        assert db.query(SkillTag).count() == 4
        lesson = db.get(Lesson, lesson_id)
        assert lesson.objective == "Keep this reviewed objective"
        assert lesson.is_published
        assert lesson.sections[0].body_md == "Keep this content"
    engine.dispose()
