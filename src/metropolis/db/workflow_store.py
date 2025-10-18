"""MongoDB workflow store for persisting workflow run history."""

from datetime import UTC, datetime
from typing import Optional

from bson import ObjectId
from pymongo import DESCENDING, AsyncMongoClient

from .models import WorkflowRun


class WorkflowStore:
    """
    Handles all MongoDB operations for workflow runs.

    Uses PyMongo Async for asynchronous database operations.
    """

    def __init__(self, mongodb_uri: str, database_name: str):
        """
        Initialize the workflow store.

        Args:
            mongodb_uri: MongoDB connection string
            database_name: Name of the database to use
        """
        self.client = AsyncMongoClient(mongodb_uri)
        self.db = self.client[database_name]
        self.workflow_runs = self.db["workflow_runs"]

    async def create_indexes(self):
        """Create indexes on startup for optimal query performance."""
        # Index for sorting by creation date
        await self.workflow_runs.create_index([("created_at", DESCENDING)])
        # Index for filtering by skill_id
        await self.workflow_runs.create_index("skill_id")
        # Index for filtering by status
        await self.workflow_runs.create_index("status")

    async def create_workflow_run(self, run: WorkflowRun) -> WorkflowRun:
        """
        Create a new workflow run in the database.

        Args:
            run: WorkflowRun object to create

        Returns:
            The created workflow run with _id populated
        """
        run_dict = run.model_dump(by_alias=True, exclude={"id"})
        result = await self.workflow_runs.insert_one(run_dict)
        run.id = str(result.inserted_id)
        return run

    async def get_workflow_run(self, run_id: str) -> Optional[WorkflowRun]:
        """
        Get a workflow run by its ID.

        Args:
            run_id: The workflow run's ObjectId as string

        Returns:
            WorkflowRun object if found, None otherwise
        """
        try:
            doc = await self.workflow_runs.find_one({"_id": ObjectId(run_id)})
            if doc:
                doc["_id"] = str(doc["_id"])
                return WorkflowRun(**doc)
            return None
        except Exception:
            # Invalid ObjectId format
            return None

    async def list_workflow_runs(
        self, limit: int = 12, skip: int = 0
    ) -> list[WorkflowRun]:
        """
        List workflow runs with pagination.

        Args:
            limit: Maximum number of runs to return
            skip: Number of runs to skip (for pagination)

        Returns:
            List of workflow run objects
        """
        cursor = (
            self.workflow_runs.find()
            .sort("created_at", DESCENDING)
            .skip(skip)
            .limit(limit)
        )

        runs = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            runs.append(WorkflowRun(**doc))

        return runs

    async def update_workflow_run(self, run_id: str, updates: dict) -> bool:
        """
        Update workflow run fields.

        Args:
            run_id: The workflow run's ObjectId as string
            updates: Dictionary of fields to update

        Returns:
            True if workflow run was updated, False if not found
        """
        try:
            # Auto-set completed_at if status is being set to completed or failed
            if updates.get("status") in ["completed", "failed"]:
                updates["completed_at"] = datetime.now(UTC)

            result = await self.workflow_runs.update_one(
                {"_id": ObjectId(run_id)}, {"$set": updates}
            )
            return result.modified_count > 0
        except Exception:
            # Invalid ObjectId format
            return False

    async def close(self):
        """Close the MongoDB connection."""
        await self.client.aclose()
