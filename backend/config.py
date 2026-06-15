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

    # Band.ai settings
    BAND_REST_URL: Optional[str] = None
    BAND_WS_URL: Optional[str] = None
    BAND_ROOM_ID: Optional[str] = None
    BAND_PLANNER_AGENT_ID: Optional[str] = None
    BAND_PLANNER_API_KEY: Optional[str] = None
    BAND_RESEARCHER_AGENT_ID: Optional[str] = None
    BAND_RESEARCHER_API_KEY: Optional[str] = None
    BAND_FINANCIAL_AGENT_ID: Optional[str] = None
    BAND_FINANCIAL_API_KEY: Optional[str] = None
    BAND_CONTENT_AGENT_ID: Optional[str] = None
    BAND_CONTENT_API_KEY: Optional[str] = None
    BAND_REVIEWER_AGENT_ID: Optional[str] = None
    BAND_REVIEWER_API_KEY: Optional[str] = None

    
    # Allow loading from a .env file
    model_config = SettingsConfigDict(
        env_file=_env_path,
        env_file_encoding="utf-8",
        extra="ignore"
    )

# Instantiate settings
settings = Settings()

