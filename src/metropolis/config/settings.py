"""Application configuration settings."""

import os

from pydantic import BaseModel, SecretStr


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
    anthropic_api_key: SecretStr = SecretStr(os.getenv("ANTHROPIC_API_KEY", ""))


class OpenAIConfig(BaseModel):
    """OpenAI API configuration."""

    api_key: SecretStr = SecretStr(os.getenv("OPENAI_API_KEY", ""))


class RedisConfig(BaseModel):
    """Redis configuration."""

    host: str = os.getenv("REDIS_HOST", "localhost")
    port: int = int(os.getenv("REDIS_PORT", "6379"))
    db: int = int(os.getenv("REDIS_DB", "0"))
    password: SecretStr = SecretStr(os.getenv("REDIS_PASSWORD", ""))


class KubernetesConfig(BaseModel):
    """Kubernetes configuration."""

    namespace: str = os.getenv("K8S_NAMESPACE", "default")
    context: str = os.getenv("K8S_CONTEXT", "")
    idle_timeout_minutes: int = int(os.getenv("K8S_IDLE_TIMEOUT_MINUTES", "15"))


# Global config instances
db_config = DatabaseConfig()
session_config = SessionConfig()
containerized_agent_config = ContainerizedAgentConfig()
openai_config = OpenAIConfig()
redis_config = RedisConfig()
kubernetes_config = KubernetesConfig()
