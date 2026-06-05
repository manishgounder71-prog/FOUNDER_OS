import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

# Get the path to the root directory's .env file relative to this file
_env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")

class Settings(BaseSettings):
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    OPENROUTER_API_KEY: Optional[str] = None
    LYZR_API_KEY: Optional[str] = None
    LYZR_AGENT_ID: Optional[str] = None
    OMI_API_KEY: Optional[str] = None
    QDRANT_PATH: str = "./qdrant_db"
    QDRANT_URL: Optional[str] = None
    QDRANT_API_KEY: Optional[str] = None
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    
    # Allow loading from a .env file
    model_config = SettingsConfigDict(
        env_file=_env_path,
        env_file_encoding="utf-8",
        extra="ignore"
    )

# Instantiate settings
settings = Settings()

