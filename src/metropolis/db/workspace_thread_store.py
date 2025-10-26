"""MongoDB store for persisting workspace threads and messages."""

from datetime import UTC, datetime
from typing import Optional

from pymongo import ASCENDING, DESCENDING, AsyncMongoClient

from .models import WorkspaceMessage, WorkspaceThread


class WorkspaceThreadStore:
    """
    Handles all MongoDB operations for workspace threads and messages.

    Uses PyMongo Async for asynchronous database operations.
    Stores workspace-specific conversations with execution environment tracking.
    """

    def __init__(self, mongodb_uri: str, database_name: str):
        """
        Initialize the workspace thread store.

        Args:
            mongodb_uri: MongoDB connection string
            database_name: Name of the database to use
        """
        self.client = AsyncMongoClient(mongodb_uri)
        self.db = self.client[database_name]
        self.threads = self.db["workspace_threads"]
        self.messages = self.db["workspace_messages"]
        self.jsonl_lines = self.db["workspace_thread_jsonl_lines"]

    async def create_indexes(self):
        """Create indexes on startup for optimal query performance."""
        # Thread indexes
        await self.threads.create_index("claude_session_id", unique=True)
        await self.threads.create_index(
            [("created_at", DESCENDING), ("is_active", ASCENDING)]
        )
        await self.threads.create_index("workspace_id")
        await self.threads.create_index("execution_environment")

        # Message indexes
        await self.messages.create_index(
            [("claude_session_id", ASCENDING), ("sequence", ASCENDING)], unique=True
        )
        await self.messages.create_index(
            [("claude_session_id", ASCENDING), ("created_at", ASCENDING)]
        )

        # JSONL line indexes
        await self.jsonl_lines.create_index(
            [("claude_session_id", ASCENDING), ("line_number", ASCENDING)], unique=True
        )

    async def create_thread(self, thread: WorkspaceThread) -> WorkspaceThread:
        """
        Create a new workspace thread in the database.

        Args:
            thread: WorkspaceThread object to create

        Returns:
            The created thread with _id populated

        Raises:
            DuplicateKeyError: If thread with same claude_session_id exists
        """
        thread_dict = thread.model_dump(by_alias=True, exclude={"id"})
        result = await self.threads.insert_one(thread_dict)
        thread.id = str(result.inserted_id)
        return thread

    async def get_thread(self, claude_session_id: str) -> Optional[WorkspaceThread]:
        """
        Get a workspace thread by its Claude session ID.

        Args:
            claude_session_id: The Claude Agent SDK session ID

        Returns:
            WorkspaceThread object if found, None otherwise
        """
        doc = await self.threads.find_one({"claude_session_id": claude_session_id})
        if doc:
            doc["_id"] = str(doc["_id"])
            return WorkspaceThread(**doc)
        return None

    async def update_thread(self, claude_session_id: str, updates: dict) -> bool:
        """
        Update workspace thread fields.

        Args:
            claude_session_id: The Claude session ID
            updates: Dictionary of fields to update

        Returns:
            True if thread was updated, False if not found
        """
        updates["updated_at"] = datetime.now(UTC)
        result = await self.threads.update_one(
            {"claude_session_id": claude_session_id}, {"$set": updates}
        )
        return result.modified_count > 0

    async def list_threads(
        self, workspace_id: str, limit: int = 20, skip: int = 0
    ) -> list[WorkspaceThread]:
        """
        List workspace threads for a specific workspace.

        Args:
            workspace_id: The workspace ID to filter threads
            limit: Maximum number of threads to return
            skip: Number of threads to skip (for pagination)

        Returns:
            List of WorkspaceThread objects
        """
        query = {"workspace_id": workspace_id, "is_active": True}

        cursor = (
            self.threads.find(query)
            .sort("created_at", DESCENDING)
            .skip(skip)
            .limit(limit)
        )

        threads = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            threads.append(WorkspaceThread(**doc))

        return threads

    async def delete_thread(self, claude_session_id: str) -> bool:
        """
        Delete a workspace thread and all its messages and JSONL lines.

        Args:
            claude_session_id: The Claude session ID

        Returns:
            True if thread was deleted, False if not found
        """
        # Delete all messages first
        await self.messages.delete_many({"claude_session_id": claude_session_id})

        # Delete all JSONL lines
        await self.delete_jsonl_lines(claude_session_id)

        # Delete the thread
        result = await self.threads.delete_one({"claude_session_id": claude_session_id})
        return result.deleted_count > 0

    async def save_message(self, message: WorkspaceMessage) -> str:
        """
        Save a complete message to the database.

        Args:
            message: WorkspaceMessage object to save

        Returns:
            The inserted message ID
        """
        message_dict = message.model_dump(by_alias=True, exclude={"id"})
        result = await self.messages.insert_one(message_dict)
        return str(result.inserted_id)

    async def get_thread_messages(
        self, claude_session_id: str
    ) -> list[WorkspaceMessage]:
        """
        Get all messages for a thread in order.

        Args:
            claude_session_id: The Claude session ID

        Returns:
            List of messages sorted by sequence
        """
        cursor = self.messages.find({"claude_session_id": claude_session_id}).sort(
            "sequence", ASCENDING
        )

        messages = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            messages.append(WorkspaceMessage(**doc))

        return messages

    async def get_next_sequence(self, claude_session_id: str) -> int:
        """
        Get the next sequence number for a thread.

        Args:
            claude_session_id: The Claude session ID

        Returns:
            The next available sequence number (0 if no messages exist)
        """
        last_message = await self.messages.find_one(
            {"claude_session_id": claude_session_id}, sort=[("sequence", DESCENDING)]
        )

        if last_message:
            return last_message["sequence"] + 1
        return 0

    async def increment_message_count(self, claude_session_id: str):
        """
        Increment the message count for a thread.

        Args:
            claude_session_id: The Claude session ID
        """
        await self.threads.update_one(
            {"claude_session_id": claude_session_id},
            {"$inc": {"message_count": 1}, "$set": {"updated_at": datetime.now(UTC)}},
        )

    async def update_thread_usage(
        self,
        claude_session_id: str,
        cost_usd: float = 0.0,
        input_tokens: int = 0,
        output_tokens: int = 0,
    ):
        """
        Update thread cumulative usage statistics.

        Args:
            claude_session_id: The Claude session ID
            cost_usd: Cost to add to total
            input_tokens: Input tokens to add to total
            output_tokens: Output tokens to add to total
        """
        await self.threads.update_one(
            {"claude_session_id": claude_session_id},
            {
                "$inc": {
                    "total_input_tokens": input_tokens,
                    "total_output_tokens": output_tokens,
                },
                "$set": {"total_cost_usd": cost_usd, "updated_at": datetime.now(UTC)},
            },
        )

    async def save_jsonl_lines(self, claude_session_id: str, lines: list[str]):
        """
        Save JSONL lines for a thread.

        Deletes existing lines for the thread and inserts new ones.

        Args:
            claude_session_id: The Claude session ID
            lines: List of raw JSONL line strings
        """
        # Delete existing lines for this thread
        await self.jsonl_lines.delete_many({"claude_session_id": claude_session_id})

        # If no lines to save, we're done
        if not lines:
            return

        # Prepare documents with line numbers
        documents = [
            {
                "claude_session_id": claude_session_id,
                "line_number": i,
                "line": line,
            }
            for i, line in enumerate(lines)
        ]

        # Bulk insert
        await self.jsonl_lines.insert_many(documents)

    async def get_jsonl_lines(self, claude_session_id: str) -> list[str]:
        """
        Get all JSONL lines for a thread in order.

        Args:
            claude_session_id: The Claude session ID

        Returns:
            List of raw JSONL line strings sorted by line_number
        """
        cursor = self.jsonl_lines.find({"claude_session_id": claude_session_id}).sort(
            "line_number", ASCENDING
        )

        lines = []
        async for doc in cursor:
            lines.append(doc["line"])

        return lines

    async def delete_jsonl_lines(self, claude_session_id: str):
        """
        Delete all JSONL lines for a thread.

        Args:
            claude_session_id: The Claude session ID
        """
        await self.jsonl_lines.delete_many({"claude_session_id": claude_session_id})

    async def close(self):
        """Close the MongoDB connection."""
        await self.client.close()
