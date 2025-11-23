import logging
from datetime import UTC, datetime, timedelta
from typing import List, Optional

import redis.asyncio as aioredis

from metropolis.config.settings import redis_config

logger = logging.getLogger(__name__)

# Redis key patterns
REDIS_KEY_POD_STATUS = "pod:{user_id}:status"
REDIS_KEY_POD_URL = "pod:{user_id}:url"
REDIS_KEY_LAST_USED = "pod:{user_id}:last_used"
REDIS_KEY_POD_NAME = "pod:{user_id}:pod_name"
REDIS_KEY_SERVICE_NAME = "pod:{user_id}:service_name"


class PodStateManager:
    """Manages pod state persistence in Redis."""

    def __init__(self):
        self.redis_client: Optional[aioredis.Redis] = None

    async def initialize(self) -> None:
        """Initialize Redis client."""
        redis_kwargs = {
            "host": redis_config.host,
            "port": redis_config.port,
            "db": redis_config.db,
            "decode_responses": True,
        }

        password_secret = redis_config.password
        password = password_secret.get_secret_value() if password_secret else ""
        if password:
            redis_kwargs["password"] = password

        self.redis_client = aioredis.Redis(**redis_kwargs)
        logger.info(
            f"Redis client initialized: {redis_config.host}:{redis_config.port}"
        )

    async def close(self) -> None:
        """Close Redis connection."""
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Redis client closed")

    def _get_key(self, pattern: str, user_id: str) -> str:
        return pattern.format(user_id=user_id)

    async def get_pod_state(self, user_id: str) -> dict:
        """Get all state associated with a user's pod."""
        if not self.redis_client:
            raise RuntimeError("Redis client not initialized")

        status_key = self._get_key(REDIS_KEY_POD_STATUS, user_id)
        url_key = self._get_key(REDIS_KEY_POD_URL, user_id)
        pod_name_key = self._get_key(REDIS_KEY_POD_NAME, user_id)
        service_name_key = self._get_key(REDIS_KEY_SERVICE_NAME, user_id)

        return {
            "status": await self.redis_client.get(status_key),
            "url": await self.redis_client.get(url_key),
            "pod_name": await self.redis_client.get(pod_name_key),
            "service_name": await self.redis_client.get(service_name_key),
        }

    async def set_pod_starting(
        self, user_id: str, pod_name: str, service_name: str
    ) -> None:
        """Set pod status to starting and store resource names."""
        if not self.redis_client:
            raise RuntimeError("Redis client not initialized")

        status_key = self._get_key(REDIS_KEY_POD_STATUS, user_id)
        pod_name_key = self._get_key(REDIS_KEY_POD_NAME, user_id)
        service_name_key = self._get_key(REDIS_KEY_SERVICE_NAME, user_id)

        await self.redis_client.set(status_key, "starting")
        await self.redis_client.set(pod_name_key, pod_name)
        await self.redis_client.set(service_name_key, service_name)
        await self.update_last_used(user_id)

    async def set_pod_running(self, user_id: str, pod_url: str) -> None:
        """Set pod status to running and store access URL."""
        if not self.redis_client:
            raise RuntimeError("Redis client not initialized")

        status_key = self._get_key(REDIS_KEY_POD_STATUS, user_id)
        url_key = self._get_key(REDIS_KEY_POD_URL, user_id)

        await self.redis_client.set(status_key, "running")
        await self.redis_client.set(url_key, pod_url)

    async def update_last_used(self, user_id: str) -> None:
        """Update the last used timestamp."""
        if not self.redis_client:
            return

        last_used_key = self._get_key(REDIS_KEY_LAST_USED, user_id)
        now = datetime.now(UTC).isoformat()
        await self.redis_client.set(last_used_key, now)

    async def clear_pod_state(self, user_id: str) -> None:
        """Clear all state for a user's pod."""
        if not self.redis_client:
            raise RuntimeError("Redis client not initialized")

        keys = [
            self._get_key(REDIS_KEY_POD_STATUS, user_id),
            self._get_key(REDIS_KEY_POD_URL, user_id),
            self._get_key(REDIS_KEY_POD_NAME, user_id),
            self._get_key(REDIS_KEY_SERVICE_NAME, user_id),
            self._get_key(REDIS_KEY_LAST_USED, user_id),
        ]
        await self.redis_client.delete(*keys)

    async def get_idle_pods(self, idle_timeout: timedelta) -> List[str]:
        """Get list of user_ids for pods that have been idle too long."""
        if not self.redis_client:
            return []

        pattern = REDIS_KEY_LAST_USED.format(user_id="*")
        keys = await self.redis_client.keys(pattern)
        idle_users = []
        now = datetime.now(UTC)

        for key in keys:
            # Extract user_id from key (format: pod:{user_id}:last_used)
            try:
                user_id = key.split(":")[1]
                last_used_str = await self.redis_client.get(key)
                if not last_used_str:
                    continue

                last_used = datetime.fromisoformat(last_used_str.replace("Z", "+00:00"))
                if last_used.tzinfo is None:
                    last_used = last_used.replace(tzinfo=UTC)

                if (now - last_used) > idle_timeout:
                    idle_users.append(user_id)
            except (ValueError, TypeError, IndexError) as e:
                logger.warning(f"Error checking idle state for key {key}: {e}")
                continue

        return idle_users
