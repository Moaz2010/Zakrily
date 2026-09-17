from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings

# Serverless invocations are short-lived and each keeps its own pool, so a
# persistent pool exhausts the database's connection limit. NullPool opens a
# connection per session and closes it after, which is what a pooled Postgres
# endpoint (Supabase's pooler) expects.
_serverless = settings.database_url.startswith("postgresql")
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    **({"poolclass": NullPool} if _serverless else {}),
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
