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

    quiz_pass_threshold: float = 0.6
    min_attempts_for_skill_display: int = 3
    chat_turn_limit: int = 10
    retrieval_k: int = 5


settings = Settings()
