"""REST API endpoints for workflow management."""

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from metropolis.db.skill_store import SkillStore
from metropolis.db.workflow_store import WorkflowStore
from metropolis.dependencies.temp_folder import get_temp_folder
from metropolis.services.workflow_service import WorkflowService

router = APIRouter(prefix="/api", tags=["workflows"])

# Global store instances
_skill_store: SkillStore | None = None
_workflow_store: WorkflowStore | None = None


def get_skill_store() -> SkillStore:
    """Get the global skill store instance."""
    global _skill_store
    if _skill_store is None:
        raise RuntimeError("SkillStore not initialized. Call init_skill_store first.")
    return _skill_store


def get_workflow_store() -> WorkflowStore:
    """Get the global workflow store instance."""
    global _workflow_store
    if _workflow_store is None:
        raise RuntimeError(
            "WorkflowStore not initialized. Call init_workflow_store first."
        )
    return _workflow_store


def init_skill_store(skill_store: SkillStore):
    """Initialize the global skill store instance."""
    global _skill_store
    _skill_store = skill_store


def init_workflow_store(workflow_store: WorkflowStore):
    """Initialize the global workflow store instance."""
    global _workflow_store
    _workflow_store = workflow_store


class ExecuteWorkflowRequest(BaseModel):
    """Request model for workflow execution."""

    user_input: str


@router.get("/workflows")
async def list_workflows(limit: int = 12, skip: int = 0):
    """
    List all available workflows (same as skills).

    Args:
        limit: Maximum number of workflows to return
        skip: Number of workflows to skip (for pagination)

    Returns:
        List of available workflows
    """
    skill_store = get_skill_store()
    skills = await skill_store.list_skills(limit=limit, skip=skip)
    return [skill.model_dump(by_alias=True) for skill in skills]


@router.get("/workflow-runs")
async def list_workflow_runs(limit: int = 12, skip: int = 0):
    """
    List workflow run history with pagination.

    Args:
        limit: Maximum number of runs to return
        skip: Number of runs to skip (for pagination)

    Returns:
        List of workflow run history
    """
    workflow_store = get_workflow_store()
    runs = await workflow_store.list_workflow_runs(limit=limit, skip=skip)
    return [run.model_dump(by_alias=True) for run in runs]


@router.get("/workflow-runs/{run_id}")
async def get_workflow_run(run_id: str):
    """
    Get a specific workflow run by ID.

    Args:
        run_id: The workflow run's ID

    Returns:
        The workflow run details

    Raises:
        HTTPException: If workflow run not found
    """
    workflow_store = get_workflow_store()
    run = await workflow_store.get_workflow_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Workflow run not found")
    return run.model_dump(by_alias=True)


@router.post("/workflows/{skill_id}/execute")
async def execute_workflow(
    skill_id: str,
    request: ExecuteWorkflowRequest,
    temp_path: Path = Depends(get_temp_folder),
):
    """
    Execute a workflow with Server-Sent Events streaming.

    Args:
        skill_id: ID of the skill to execute as workflow
        request: Request containing user input
        temp_path: Temporary folder path (injected dependency)

    Returns:
        StreamingResponse with Server-Sent Events
    """
    skill_store = get_skill_store()
    workflow_store = get_workflow_store()

    # Create workflow service
    workflow_service = WorkflowService(skill_store, workflow_store)

    # Execute workflow and stream results
    async def generate():
        async for event in workflow_service.execute_workflow(
            skill_id, request.user_input, temp_path
        ):
            yield event

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )
