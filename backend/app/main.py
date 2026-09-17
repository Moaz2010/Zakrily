from fastapi import FastAPI
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

app.include_router(auth.router)
app.include_router(progress.router)
app.include_router(subjects.router)
app.include_router(lessons.router)
app.include_router(quiz.router)
app.include_router(skills.router)
app.include_router(practice.router)
app.include_router(chat.router)
app.include_router(math.router)
app.include_router(voice.router)


@app.get("/health")
def health():
    return {"status": "ok"}
