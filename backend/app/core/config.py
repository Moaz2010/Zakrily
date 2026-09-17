from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Zakrely API"
    environment: str = "development"

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
    anthropic_model: str = "claude-sonnet-4-6"

    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"
    groq_whisper_model: str = "whisper-large-v3"

    gemini_api_key: str = ""
    gemini_tts_model: str = "gemini-2.5-flash-preview-tts"
    gemini_tts_voice: str = "Aoede"  # warm female, handles Arabic + English

    quiz_pass_threshold: float = 0.6
    min_attempts_for_skill_display: int = 3
    chat_turn_limit: int = 10
    retrieval_k: int = 5


settings = Settings()
