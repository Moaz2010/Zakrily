from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Zakrily API"
    environment: str = "development"

    # Comma-separated browser origins allowed to call the API. Deployed, the
    # frontend is same-origin behind /api/backend, so this stays empty there.
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Path the API is served under when deployed as a Vercel service. Routes are
    # registered at the root AND under this prefix, so the API answers whether or
    # not the platform strips the prefix before the app sees the request.
    api_prefix: str = "/api/backend"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    # Supabase Postgres connection string (Session Pooler recommended for serverless/edge deploys)
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/zakrely"

    # Supabase project — used for Storage (math images) and optionally Supabase Auth
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_storage_bucket: str = "math-uploads"

    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7

    anthropic_api_key: str = ""
    # Cheapest Claude tier; override in .env for higher-quality generation runs.
    anthropic_model: str = "claude-haiku-4-5-20251001"

    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_whisper_model: str = "whisper-1"

    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"
    groq_whisper_model: str = "whisper-large-v3"

    # Default provider for lesson chat: anthropic | openai | groq.
    # Requests may override per call; falls back to whichever key is configured.
    chat_provider: str = "anthropic"

    gemini_api_key: str = ""
    gemini_tts_model: str = "gemini-2.5-flash-preview-tts"
    gemini_tts_voice: str = "Aoede"  # warm female, handles Arabic + English

    quiz_pass_threshold: float = 0.6
    min_attempts_for_skill_display: int = 3
    chat_turn_limit: int = 10
    retrieval_k: int = 5


settings = Settings()
