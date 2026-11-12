from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_WEAK_SECRET_PREFIXES = (
    "dev-only-",
    "replace-with-",
    "changeme",
    "secret",
    "test-secret",
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "SURaj AI"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "dev-only-change-this-secret-key-before-production-deployment"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080

    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    FRONTEND_BASE_URL: str = "http://localhost:3000"

    DATABASE_URL: str = "postgresql+asyncpg://suraj:suraj_password@localhost:5432/suraj_ai"
    REDIS_URL: str = ""
    RATE_LIMIT_DEV_FALLBACK: Optional[bool] = None

    DEFAULT_LLM_PROVIDER: str = "openai"
    DEFAULT_LLM_MODEL: str = "gpt-4o-mini"

    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"

    GEMINI_API_KEY: str = ""
    GEMINI_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta"

    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_BASE_URL: str = "https://api.anthropic.com/v1"

    DEFAULT_IMAGE_PROVIDER: str = "openai"
    DEFAULT_IMAGE_MODEL: str = "dall-e-3"

    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 25
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = 30
    RATE_LIMIT_DAILY_TOKENS: int = 250000

    # Real SMTP Email Delivery (for OTP verification, password resets, contact notifications)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_USE_TLS: bool = True
    EMAIL_OTP_EXPIRE_MINUTES: int = 10
    EMAIL_OTP_RESEND_COOLDOWN_SECONDS: int = 60
    EMAIL_OTP_MAX_ATTEMPTS: int = 5

    # Real Payment Gateways (Stripe / Razorpay)
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    @field_validator("UPLOAD_DIR")
    @classmethod
    def ensure_upload_dir(cls, v: str) -> str:
        Path(v).mkdir(parents=True, exist_ok=True)
        return v

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        if self.is_production:
            if self.DEBUG:
                raise ValueError("DEBUG must be False when APP_ENV=production.")
            key_lower = self.SECRET_KEY.strip().lower()
            if len(self.SECRET_KEY.strip()) < 32 or any(
                key_lower.startswith(prefix) for prefix in _WEAK_SECRET_PREFIXES
            ):
                raise ValueError(
                    "Production SECRET_KEY must be a strong non-default value of at least 32 characters."
                )
        return self

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.strip().lower() == "production"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def is_postgres(self) -> bool:
        return self.DATABASE_URL.startswith("postgresql")

    @property
    def has_redis_configured(self) -> bool:
        return bool(self.REDIS_URL.strip())

    @property
    def has_smtp_configured(self) -> bool:
        return bool(
            self.SMTP_HOST.strip()
            and self.SMTP_FROM_EMAIL.strip()
            and self.SMTP_USER.strip()
            and self.SMTP_PASSWORD.strip()
        )

    @property
    def has_stripe_configured(self) -> bool:
        key = self.STRIPE_SECRET_KEY.strip()
        return bool(key and not key.startswith("your-"))

    @property
    def has_razorpay_configured(self) -> bool:
        return bool(self.RAZORPAY_KEY_ID.strip() and self.RAZORPAY_KEY_SECRET.strip())

    @property
    def allow_rate_limit_dev_fallback(self) -> bool:
        if self.RATE_LIMIT_DEV_FALLBACK is not None:
            return self.RATE_LIMIT_DEV_FALLBACK
        return not self.is_production


@lru_cache
def get_settings() -> Settings:
    return Settings()
