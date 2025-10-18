from datetime import datetime
from typing import Any, Optional

from bson import ObjectId
from claude_agent_sdk import create_sdk_mcp_server, tool
from pymongo import AsyncMongoClient

from metropolis.config.settings import db_config


class SimpleSkillDB:
    """Simple direct MongoDB access for skills."""

    def __init__(self):
        self.client: AsyncMongoClient | None = None
        self.collection = None

    async def _ensure_connected(self):
        """Ensure we have a database connection."""
        if self.client is None:
            self.client = AsyncMongoClient(db_config.uri)
            db = self.client[db_config.database]
            self.collection = db["claude_agent_sdk_skills"]

    async def list_skills(self, limit: int = 100) -> list[dict]:
        """List skills from the database."""
        await self._ensure_connected()
        if self.collection is None:
            return []
        cursor = self.collection.find({}).sort("created_at", -1).limit(limit)
        skills = []
        async for doc in cursor:
            skills.append(
                {
                    "id": str(doc["_id"]),
                    "title": doc.get("title", ""),
                    "content": doc.get("content", ""),
                    "created_at": doc.get("created_at", datetime.now()),
                }
            )
        return skills

    async def get_skill(self, skill_id: str) -> Optional[dict]:
        """Get a single skill by ID."""
        await self._ensure_connected()
        if self.collection is None:
            return None
        try:
            doc = await self.collection.find_one({"_id": ObjectId(skill_id)})
            if doc:
                return {
                    "id": str(doc["_id"]),
                    "title": doc.get("title", ""),
                    "content": doc.get("content", ""),
                    "created_at": doc.get("created_at", datetime.now()),
                }
        except Exception as e:
            # Log the exception in a real application
            print(f"Error retrieving skill {skill_id}: {e}")
        return None


# Global instance
_skill_db = SimpleSkillDB()


# Define a custom tool using the @tool decorator
@tool("list_skills", "list all skills", {})
async def list_skills(args: dict[str, Any]) -> dict[str, Any]:
    """
    List all skills that the agent can use.
    this should return a list of skill (skill id, and skill title) from mongodb
    """
    try:
        skills = await _skill_db.list_skills(limit=100)

        if not skills:
            return {"content": [{"type": "text", "text": "No skills available."}]}

        # Format skills as a readable list
        skills_text = "Available skills:\n\n"
        for skill in skills:
            skills_text += f"• ID: {skill['id']}\n"
            skills_text += f"  Title: {skill['title']}\n"

        return {"content": [{"type": "text", "text": skills_text}]}
    except Exception as e:
        return {"content": [{"type": "text", "text": f"Error: {e}"}]}


@tool("apply_skill", "apply a skill", {"id": str})
async def apply_skill(args: dict[str, Any]) -> dict[str, Any]:
    """
    get the skills from the mongodb (based on the skill id)
    and return the content of the skill
    """
    try:
        skill_id = args.get("id")
        if not skill_id:
            return {
                "content": [{"type": "text", "text": "Error: skill id is required"}]
            }

        skill = await _skill_db.get_skill(skill_id)

        if not skill:
            error_msg = f"Error: Skill with ID '{skill_id}' not found"
            return {"content": [{"type": "text", "text": error_msg}]}

        # Return the skill content
        result_text = f"# {skill['title']}\n\n{skill['content']}"
        return {"content": [{"type": "text", "text": result_text}]}
    except Exception as e:
        return {"content": [{"type": "text", "text": f"Error: {e}"}]}


# Create an SDK MCP server with the custom tool
skill_server = create_sdk_mcp_server(
    name="skill-tools",
    version="1.0.0",
    tools=[list_skills, apply_skill],  # Pass the decorated function
)

skill_application_server = create_sdk_mcp_server(
    name="skill-application-tools",
    version="1.0.0",
    tools=[apply_skill],
)
