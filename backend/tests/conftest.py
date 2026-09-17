import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import app
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.config import settings
from app.core.database import Base, get_db
from app import models
from scripts import seed


@pytest.fixture(autouse=True)
def no_live_api_calls(monkeypatch, request):
    """Fail loudly if a test reaches a real provider.

    A developer .env supplies real keys, so an unmocked call would otherwise
    spend money and make the suite depend on the network — and a test that
    silently calls the live API can pass while asserting nothing useful.
    """
    for key in ("anthropic_api_key", "openai_api_key", "groq_api_key", "gemini_api_key"):
        monkeypatch.setattr(settings, key, "")

    real_send = httpx.Client.send

    def guarded(self, request_obj, *args, **kwargs):
        host = request_obj.url.host
        if host and host not in {"testserver", "localhost", "127.0.0.1"}:
            raise AssertionError(
                f"Test attempted a live HTTP call to {host}. Mock the provider instead."
            )
        return real_send(self, request_obj, *args, **kwargs)

    monkeypatch.setattr(httpx.Client, "send", guarded)


@pytest.fixture
def db(monkeypatch):
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, autoflush=False)
    monkeypatch.setattr(seed, "SessionLocal", factory)
    seed.run()
    with factory() as session:
        yield session
    engine.dispose()


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.pop(get_db, None)
