"""Application configuration settings."""

import os

from pydantic import BaseModel


class DatabaseConfig(BaseModel):
    """MongoDB configuration."""

    uri: str = os.getenv("MONGODB_URI", "mongodb://user:test1234@localhost:27017/")
    database: str = os.getenv("MONGODB_DATABASE", "agent_sessions")


class SessionConfig(BaseModel):
    """Session management configuration."""

    ttl_days: int = 30
    max_active_clients: int = 100
    client_idle_timeout_minutes: int = 30


class ContainerizedAgentConfig(BaseModel):
    """Containerized agent API configuration."""

    url: str = os.getenv("CONTAINERIZED_AGENT_URL", "http://localhost:8089")


class OpenAIConfig(BaseModel):
    """OpenAI API configuration."""

    api_key: str = os.getenv("OPENAI_API_KEY", "")


# Global config instances
db_config = DatabaseConfig()
session_config = SessionConfig()
containerized_agent_config = ContainerizedAgentConfig()
openai_config = OpenAIConfig()
