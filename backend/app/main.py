from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, chat, lessons, math, practice, progress, quiz, skills, subjects
from app.routers import voice

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


@api.get("/health")
def health():
    return {"status": "ok"}


app.include_router(api)
# Deployed behind a Vercel service, the request arrives with its original path
# (/api/backend/...) rather than the stripped one, so the same routes are also
# mounted under that prefix. Serving both means the API works whether or not
# the platform rewrites the path.
if settings.api_prefix:
    app.include_router(api, prefix=settings.api_prefix)
