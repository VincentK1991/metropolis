"""REST API endpoints for skill management."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from metropolis.db.models import ClaudeAgentSkill
from metropolis.db.skill_store import SkillStore

router = APIRouter(prefix="/api/skills", tags=["skills"])

# Global skill store instance
_skill_store: SkillStore | None = None


def get_skill_store() -> SkillStore:
    """Get the global skill store instance."""
    global _skill_store
    if _skill_store is None:
        raise RuntimeError("SkillStore not initialized. Call init_skill_store first.")
    return _skill_store


def init_skill_store(skill_store: SkillStore):
    """Initialize the global skill store instance."""
    global _skill_store
    _skill_store = skill_store


class CreateSkillRequest(BaseModel):
    """Request body for creating a skill."""

    title: str
    content: str


class UpdateSkillRequest(BaseModel):
    """Request body for updating a skill."""

    title: str | None = None
    content: str | None = None


@router.post("/")
async def create_skill(request: CreateSkillRequest):
    """
    Create a new skill.

    Args:
        request: Skill data with title and content

    Returns:
        The created skill with ID
    """
    skill_store = get_skill_store()
    skill = ClaudeAgentSkill(
        title=request.title,
        content=request.content,
    )
    created_skill = await skill_store.create_skill(skill)
    return created_skill.model_dump(by_alias=True)


@router.get("/")
async def list_skills(limit: int = 12, skip: int = 0):
    """
    List skills with pagination.

    Args:
        limit: Maximum number of skills to return (default: 12)
        skip: Number of skills to skip for pagination (default: 0)

    Returns:
        Dictionary with skills list
    """
    skill_store = get_skill_store()
    skills = await skill_store.list_skills(limit=limit, skip=skip)
    return {"skills": [s.model_dump(by_alias=True) for s in skills]}


@router.get("/{skill_id}")
async def get_skill(skill_id: str):
    """
    Get a single skill by ID.

    Args:
        skill_id: The skill's ObjectId

    Returns:
        The skill object

    Raises:
        HTTPException: 404 if skill not found
    """
    skill_store = get_skill_store()
    skill = await skill_store.get_skill(skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return skill.model_dump(by_alias=True)


@router.patch("/{skill_id}")
async def update_skill(skill_id: str, request: UpdateSkillRequest):
    """
    Update a skill.

    Args:
        skill_id: The skill's ObjectId
        request: Fields to update

    Returns:
        Success status

    Raises:
        HTTPException: 404 if skill not found
    """
    skill_store = get_skill_store()

    # Build update dict with only provided fields
    updates = {}
    if request.title is not None:
        updates["title"] = request.title
    if request.content is not None:
        updates["content"] = request.content

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    success = await skill_store.update_skill(skill_id, updates)
    if not success:
        raise HTTPException(status_code=404, detail="Skill not found")
    return {"success": True}


@router.delete("/{skill_id}")
async def delete_skill(skill_id: str):
    """
    Delete a skill.

    Args:
        skill_id: The skill's ObjectId

    Returns:
        Success status

    Raises:
        HTTPException: 404 if skill not found
    """
    skill_store = get_skill_store()
    success = await skill_store.delete_skill(skill_id)
    if not success:
        raise HTTPException(status_code=404, detail="Skill not found")
    return {"success": True}
