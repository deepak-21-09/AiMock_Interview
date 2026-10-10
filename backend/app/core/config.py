from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Adaptive AI Mock Interview System"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "adaptive-interview-secret-key-production-change-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./interview_app.db")
    
    # LLM & AI Providers
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
    
    # NLP Model Settings
    NLP_MODEL_DIR: str = os.getenv("NLP_MODEL_DIR", "./nlp_service/model_registry")
    CONFIDENCE_THRESHOLD: float = 0.65
    
    # Uploads & Media Limits
    MAX_RESUME_SIZE_MB: int = 5
    MAX_AUDIO_SIZE_MB: int = 25
    MEDIA_DIR: str = "./media"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="allow"
    )

settings = Settings()
