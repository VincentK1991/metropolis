"""MongoDB workspace store for persisting workspaces."""

from datetime import UTC, datetime
from typing import Optional

from bson import ObjectId
from pymongo import DESCENDING, AsyncMongoClient

from .models import Workspace


class WorkspaceStore:
    """
    Handles all MongoDB operations for workspaces.

    Uses PyMongo Async for asynchronous database operations.
    """

    def __init__(self, mongodb_uri: str, database_name: str):
        """
        Initialize the workspace store.

        Args:
            mongodb_uri: MongoDB connection string
            database_name: Name of the database to use
        """
        self.client = AsyncMongoClient(mongodb_uri)
        self.db = self.client[database_name]
        self.workspaces = self.db["workspaces"]

    async def create_indexes(self):
        """Create indexes on startup for optimal query performance."""
        # Index for sorting by creation date
        await self.workspaces.create_index([("created_at", DESCENDING)])
        # Index for searching by name
        await self.workspaces.create_index("name")

    async def create_workspace(self, workspace: Workspace) -> Workspace:
        """
        Create a new workspace in the database.

        Args:
            workspace: Workspace object to create

        Returns:
            The created workspace with _id populated
        """
        workspace_dict = workspace.model_dump(by_alias=True, exclude={"id"})
        result = await self.workspaces.insert_one(workspace_dict)
        workspace.id = str(result.inserted_id)
        return workspace

    async def get_workspace(self, workspace_id: str) -> Optional[Workspace]:
        """
        Get a workspace by its ID.

        Args:
            workspace_id: The workspace's ObjectId as string

        Returns:
            Workspace object if found, None otherwise
        """
        try:
            doc = await self.workspaces.find_one({"_id": ObjectId(workspace_id)})
            if doc:
                doc["_id"] = str(doc["_id"])
                return Workspace(**doc)
            return None
        except Exception:
            # Invalid ObjectId format
            return None

    async def list_workspaces(self, limit: int = 12, skip: int = 0) -> list[Workspace]:
        """
        List workspaces with pagination.

        Args:
            limit: Maximum number of workspaces to return
            skip: Number of workspaces to skip (for pagination)

        Returns:
            List of workspace objects
        """
        cursor = (
            self.workspaces.find()
            .sort("created_at", DESCENDING)
            .skip(skip)
            .limit(limit)
        )

        workspaces = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            workspaces.append(Workspace(**doc))

        return workspaces

    async def update_workspace(self, workspace_id: str, updates: dict) -> bool:
        """
        Update workspace fields.

        Args:
            workspace_id: The workspace's ObjectId as string
            updates: Dictionary of fields to update

        Returns:
            True if workspace was updated, False if not found
        """
        try:
            updates["updated_at"] = datetime.now(UTC)
            result = await self.workspaces.update_one(
                {"_id": ObjectId(workspace_id)}, {"$set": updates}
            )
            return result.modified_count > 0
        except Exception:
            # Invalid ObjectId format
            return False

    async def delete_workspace(self, workspace_id: str) -> bool:
        """
        Delete a workspace.

        Args:
            workspace_id: The workspace's ObjectId as string

        Returns:
            True if workspace was deleted, False if not found
        """
        try:
            result = await self.workspaces.delete_one({"_id": ObjectId(workspace_id)})
            return result.deleted_count > 0
        except Exception:
            # Invalid ObjectId format
            return False

    async def close(self):
        """Close the MongoDB connection."""
        await self.client.close()
