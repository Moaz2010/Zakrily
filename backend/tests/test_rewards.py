from datetime import datetime, timezone

from app.core.security import create_access_token
from app.models.attempt import LessonProgress, LessonStatus
from app.models.lesson import Lesson
from app.models.subject import Subject
from app.models.user import User
from app.models.reward import RewardEvent
from app.services import rewards


def reward_user(client, db, email="rewards@example.com"):
    user = User(name="Rewards learner", email=email, password_hash="unused")
    db.add(user)
    db.commit()
    client.headers["Authorization"] = f"Bearer {create_access_token(str(user.id))}"
    return user


def test_rewards_are_account_owned_and_duplicate_safe(client, db):
    user = reward_user(client, db)
    english = db.query(Lesson).join(Subject).filter(Subject.slug == "english").first()
    response = client.get("/me/rewards")
    assert response.status_code == 200 and response.json()["points"] == 0

    # Saving completed cards awards them exactly once.
    assert client.put(f"/lessons/{english.id}/learning", json={"learned_steps": [0, 1]}).status_code == 200
    assert client.get("/me/rewards").json()["points"] == 20
    assert client.get("/me/rewards").json()["points"] == 20

    account = rewards.locked_account(db, user.id)
    for number in range(5):
        rewards.answer_reward(db, account, 1000 + number, True, datetime.now(timezone.utc))
    db.commit()
    summary = client.get("/me/rewards").json()
    assert summary["points"] == 55  # two cards + five answers + streak bonus
    assert summary["badges"] == 0
    assert db.query(RewardEvent).filter_by(user_id=user.id).count() == 8


def test_learning_endpoint_rejects_fake_cards_and_awards_once(client, db):
    user = reward_user(client, db, "learning-rewards@example.com")
    english = db.query(Lesson).join(Subject).filter(Subject.slug == "english").first()
    response = client.put(f"/lessons/{english.id}/learning", json={"learned_steps": [0]})
    assert response.status_code == 200
    assert client.get("/me/rewards").json()["points"] == 10
    assert client.put(f"/lessons/{english.id}/learning", json={"learned_steps": [0]}).status_code == 200
    assert client.get("/me/rewards").json()["points"] == 10
    assert client.put(f"/lessons/{english.id}/learning", json={"learned_steps": [20]}).status_code == 422
