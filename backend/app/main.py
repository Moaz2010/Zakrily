from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, chat, lessons, math, practice, progress, quiz, skills, subjects

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.environment == "development" else [],
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


@app.get("/health")
def health():
    return {"status": "ok"}
