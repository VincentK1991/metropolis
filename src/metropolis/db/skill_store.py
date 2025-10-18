"""MongoDB skill store for persisting AI agent skills."""

from datetime import UTC, datetime
from typing import Optional

from bson import ObjectId
from pymongo import DESCENDING, AsyncMongoClient

from .models import ClaudeAgentSkill


class SkillStore:
    """
    Handles all MongoDB operations for skills.

    Uses PyMongo Async for asynchronous database operations.
    """

    def __init__(self, mongodb_uri: str, database_name: str):
        """
        Initialize the skill store.

        Args:
            mongodb_uri: MongoDB connection string
            database_name: Name of the database to use
        """
        self.client = AsyncMongoClient(mongodb_uri)
        self.db = self.client[database_name]
        self.skills = self.db["claude_agent_sdk_skills"]

    async def create_indexes(self):
        """Create indexes on startup for optimal query performance."""
        # Index for sorting by creation date
        await self.skills.create_index([("created_at", DESCENDING)])
        # Index for searching by title
        await self.skills.create_index("title")

    async def create_skill(self, skill: ClaudeAgentSkill) -> ClaudeAgentSkill:
        """
        Create a new skill in the database.

        Args:
            skill: Skill object to create

        Returns:
            The created skill with _id populated
        """
        skill_dict = skill.model_dump(by_alias=True, exclude={"id"})
        result = await self.skills.insert_one(skill_dict)
        skill.id = str(result.inserted_id)
        return skill

    async def get_skill(self, skill_id: str) -> Optional[ClaudeAgentSkill]:
        """
        Get a skill by its ID.

        Args:
            skill_id: The skill's ObjectId as string

        Returns:
            Skill object if found, None otherwise
        """
        try:
            doc = await self.skills.find_one({"_id": ObjectId(skill_id)})
            if doc:
                doc["_id"] = str(doc["_id"])
                return ClaudeAgentSkill(**doc)
            return None
        except Exception:
            # Invalid ObjectId format
            return None

    async def list_skills(
        self, limit: int = 12, skip: int = 0
    ) -> list[ClaudeAgentSkill]:
        """
        List skills with pagination.

        Args:
            limit: Maximum number of skills to return
            skip: Number of skills to skip (for pagination)

        Returns:
            List of skill objects
        """
        cursor = (
            self.skills.find().sort("created_at", DESCENDING).skip(skip).limit(limit)
        )

        skills = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            skills.append(ClaudeAgentSkill(**doc))

        return skills

    async def update_skill(self, skill_id: str, updates: dict) -> bool:
        """
        Update skill fields.

        Args:
            skill_id: The skill's ObjectId as string
            updates: Dictionary of fields to update

        Returns:
            True if skill was updated, False if not found
        """
        try:
            updates["updated_at"] = datetime.now(UTC)
            result = await self.skills.update_one(
                {"_id": ObjectId(skill_id)}, {"$set": updates}
            )
            return result.modified_count > 0
        except Exception:
            # Invalid ObjectId format
            return False

    async def delete_skill(self, skill_id: str) -> bool:
        """
        Delete a skill.

        Args:
            skill_id: The skill's ObjectId as string

        Returns:
            True if skill was deleted, False if not found
        """
        try:
            result = await self.skills.delete_one({"_id": ObjectId(skill_id)})
            return result.deleted_count > 0
        except Exception:
            # Invalid ObjectId format
            return False

    async def close(self):
        """Close the MongoDB connection."""
        await self.client.close()
