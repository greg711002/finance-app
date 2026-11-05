from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Личные Финансы"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"

    # Database. PostgreSQL по SPEC (prod), SQLite — dev-фолбэк.
    # Пример prod URL: postgresql+asyncpg://user:pass@localhost:5432/finance
    DATABASE_URL: str = "sqlite+aiosqlite:///./finance.db"

    # Security / JWT. В PROD SECRET_KEY обязателен (чёрез .env), дефолт — только для dev.
    SECRET_KEY: str = "dev-only-secret-key-do-not-use-in-production-0123456789"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Frontend / CORS / password reset.
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    RESET_PASSWORD_URL: str = "http://localhost:5173/reset-password"
    # В env задаётся как JSON-массив, напр.: CORS_ORIGINS='["https://app.example.com"]'
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


settings = Settings()
