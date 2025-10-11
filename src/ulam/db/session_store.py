"""MongoDB session store for persisting Claude Agent SDK sessions."""

from datetime import UTC, datetime
from typing import Optional

from pymongo import ASCENDING, DESCENDING, AsyncMongoClient

from .models import ClaudeAgentMessage, ClaudeAgentSession


class SessionStore:
    """
    Handles all MongoDB operations for sessions and messages.

    Uses PyMongo Async for asynchronous database operations.
    """

    def __init__(self, mongodb_uri: str, database_name: str):
        """
        Initialize the session store.

        Args:
            mongodb_uri: MongoDB connection string
            database_name: Name of the database to use
        """
        self.client = AsyncMongoClient(mongodb_uri)
        self.db = self.client[database_name]
        self.sessions = self.db["claude_agent_sdk_sessions"]
        self.messages = self.db["claude_agent_sdk_messages"]

    async def create_indexes(self):
        """Create indexes on startup for optimal query performance."""
        # Session indexes
        await self.sessions.create_index("claude_session_id", unique=True)
        await self.sessions.create_index(
            [("created_at", DESCENDING), ("is_active", ASCENDING)]
        )

        # Message indexes
        await self.messages.create_index(
            [("session_id", ASCENDING), ("sequence", ASCENDING)], unique=True
        )
        await self.messages.create_index(
            [("session_id", ASCENDING), ("created_at", ASCENDING)]
        )

    async def create_session(self, session: ClaudeAgentSession) -> ClaudeAgentSession:
        """
        Create a new session in the database.

        Args:
            session: Session object to create

        Returns:
            The created session with _id populated

        Raises:
            DuplicateKeyError: If session with same claude_session_id exists
        """
        session_dict = session.model_dump(by_alias=True, exclude={"id"})
        result = await self.sessions.insert_one(session_dict)
        session.id = str(result.inserted_id)
        return session

    async def get_session(self, claude_session_id: str) -> Optional[ClaudeAgentSession]:
        """
        Get a session by its Claude session ID.

        Args:
            claude_session_id: The Claude Agent SDK session ID

        Returns:
            Session object if found, None otherwise
        """
        doc = await self.sessions.find_one({"claude_session_id": claude_session_id})
        if doc:
            doc["_id"] = str(doc["_id"])
            return ClaudeAgentSession(**doc)
        return None

    async def update_session(self, claude_session_id: str, updates: dict) -> bool:
        """
        Update session fields.

        Args:
            claude_session_id: The Claude session ID
            updates: Dictionary of fields to update

        Returns:
            True if session was updated, False if not found
        """
        updates["updated_at"] = datetime.now(UTC)
        result = await self.sessions.update_one(
            {"claude_session_id": claude_session_id}, {"$set": updates}
        )
        return result.modified_count > 0

    async def list_sessions(
        self, limit: int = 20, skip: int = 0
    ) -> list[ClaudeAgentSession]:
        """
        List recent sessions.

        Args:
            limit: Maximum number of sessions to return
            skip: Number of sessions to skip (for pagination)

        Returns:
            List of session objects
        """
        cursor = (
            self.sessions.find({"is_active": True})
            .sort("created_at", DESCENDING)
            .skip(skip)
            .limit(limit)
        )

        sessions = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            sessions.append(ClaudeAgentSession(**doc))

        return sessions

    async def delete_session(self, claude_session_id: str) -> bool:
        """
        Delete a session and all its messages.

        Args:
            claude_session_id: The Claude session ID

        Returns:
            True if session was deleted, False if not found
        """
        # Delete all messages first
        await self.messages.delete_many({"session_id": claude_session_id})

        # Delete the session
        result = await self.sessions.delete_one(
            {"claude_session_id": claude_session_id}
        )
        return result.deleted_count > 0

    async def save_message(self, message: ClaudeAgentMessage) -> str:
        """
        Save a complete message to the database.

        Args:
            message: Message object to save

        Returns:
            The inserted message ID
        """
        message_dict = message.model_dump(by_alias=True, exclude={"id"})
        result = await self.messages.insert_one(message_dict)
        return str(result.inserted_id)

    async def get_session_messages(
        self, claude_session_id: str
    ) -> list[ClaudeAgentMessage]:
        """
        Get all messages for a session in order.

        Args:
            claude_session_id: The Claude session ID

        Returns:
            List of messages sorted by sequence
        """
        cursor = self.messages.find({"session_id": claude_session_id}).sort(
            "sequence", ASCENDING
        )

        messages = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            messages.append(ClaudeAgentMessage(**doc))

        return messages

    async def get_next_sequence(self, claude_session_id: str) -> int:
        """
        Get the next sequence number for a session.

        Args:
            claude_session_id: The Claude session ID

        Returns:
            The next available sequence number (0 if no messages exist)
        """
        last_message = await self.messages.find_one(
            {"session_id": claude_session_id}, sort=[("sequence", DESCENDING)]
        )

        if last_message:
            return last_message["sequence"] + 1
        return 0

    async def increment_message_count(self, claude_session_id: str):
        """
        Increment the message count for a session.

        Args:
            claude_session_id: The Claude session ID
        """
        await self.sessions.update_one(
            {"claude_session_id": claude_session_id},
            {"$inc": {"message_count": 1}, "$set": {"updated_at": datetime.now(UTC)}},
        )

    async def update_session_usage(
        self,
        claude_session_id: str,
        cost_usd: float = 0.0,
        input_tokens: int = 0,
        output_tokens: int = 0,
    ):
        """
        Update session cumulative usage statistics.

        Args:
            claude_session_id: The Claude session ID
            cost_usd: Cost to add to total
            input_tokens: Input tokens to add to total
            output_tokens: Output tokens to add to total
        """
        await self.sessions.update_one(
            {"claude_session_id": claude_session_id},
            {
                "$inc": {
                    "total_cost_usd": cost_usd,
                    "total_input_tokens": input_tokens,
                    "total_output_tokens": output_tokens,
                },
                "$set": {"updated_at": datetime.now(UTC)},
            },
        )

    async def close(self):
        """Close the MongoDB connection."""
        self.client.close()
