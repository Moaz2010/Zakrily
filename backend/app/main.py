from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, chat, lessons, math, practice, progress, quiz, skills, subjects
from app.routers import voice
from app.routers import generated_quiz
from app.routers import rewards

app = FastAPI(title=settings.app_name)

# A wildcard origin is invalid with allow_credentials=True: the browser rejects
# the response, so requests appeared to fail even though the server answered
# them. In production the frontend calls /api/backend on the same origin
# (see vercel.json), so no cross-origin allowance is needed there.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter()
api.include_router(auth.router)
api.include_router(progress.router)
api.include_router(subjects.router)
api.include_router(lessons.router)
api.include_router(quiz.router)
api.include_router(skills.router)
api.include_router(practice.router)
api.include_router(chat.router)
api.include_router(math.router)
api.include_router(voice.router)
api.include_router(generated_quiz.router)
api.include_router(rewards.router)


@api.get("/health")
def health():
    return {"status": "ok"}


@api.get("/health/db")
def health_db():
    """Report whether the database is actually reachable.

    /health answers without touching the database, so it stays green while
    every write fails. This says which part is broken, without exposing
    credentials.
    """
    from sqlalchemy import text

    from app.core.database import SessionLocal

    url = settings.database_url
    scheme = url.split("://", 1)[0] if "://" in url else "unset"
    host = url.split("@", 1)[1].split("/", 1)[0] if "@" in url else "n/a"
    info = {"scheme": scheme, "host": host, "configured": bool(url)}
    try:
        with SessionLocal() as db:
            db.execute(text("select 1"))
            tables = db.execute(text(
                "select count(*) from information_schema.tables where table_schema='public'"
                if scheme.startswith("postgresql")
                else "select count(*) from sqlite_master where type='table'"
            )).scalar()
        return {**info, "connected": True, "tables": tables}
    except Exception as exc:  # surfaced deliberately: this endpoint exists to diagnose
        return {**info, "connected": False, "error": f"{type(exc).__name__}: {str(exc)[:300]}"}


app.include_router(api)
# Deployed behind a Vercel service, the request arrives with its original path
# (/api/backend/...) rather than the stripped one, so the same routes are also
# mounted under that prefix. Serving both means the API works whether or not
# the platform rewrites the path.
if settings.api_prefix:
    app.include_router(api, prefix=settings.api_prefix)
