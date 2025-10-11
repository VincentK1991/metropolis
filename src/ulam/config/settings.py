"""Application configuration settings."""

from pydantic import BaseModel


class DatabaseConfig(BaseModel):
    """MongoDB configuration."""

    uri: str = "mongodb://user:test1234@localhost:27017/"
    database: str = "agent_sessions"


class SessionConfig(BaseModel):
    """Session management configuration."""

    ttl_days: int = 30
    max_active_clients: int = 100
    client_idle_timeout_minutes: int = 30


# Global config instances
db_config = DatabaseConfig()
session_config = SessionConfig()
