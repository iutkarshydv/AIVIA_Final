"""
AIVIA MVP Configuration
Environment variables and application settings
"""
import os
from typing import List, Optional
from pydantic import BaseSettings, validator


class Settings(BaseSettings):
    """Application settings from environment variables."""

    # Application settings
    app_name: str = "AIVIA MVP"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    debug: bool = False
    environment: str = "development"
    log_level: str = "INFO"
    secret_key: str = "your-secret-key-change-in-production"

    # CORS settings
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:8080"]

    # ElevenLabs settings
    elevenlabs_api_key: str
    elevenlabs_base_url: str = "https://api.elevenlabs.io/"

    # Database settings
    database_url: str = "postgresql://username:password@localhost:5432/aivia_mvp"
    database_host: str = "localhost"
    database_port: int = 5432
    database_name: str = "aivia_mvp"
    database_user: str = "username"
    database_password: str = "password"

    # File upload settings
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    upload_dir: str = "./uploads"
    allowed_file_types: List[str] = ["pdf", "docx", "doc"]

    @validator("elevenlabs_api_key")
    def validate_elevenlabs_key(cls, v):
        if not v:
            raise ValueError("ElevenLabs API key is required")
        return v

    @validator("cors_origins", pre=True)
    def assemble_cors_origins(cls, v):
        if isinstance(v, str) and v.startswith("["):
            # Handle JSON string format from environment
            import json
            return json.loads(v)
        elif isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
