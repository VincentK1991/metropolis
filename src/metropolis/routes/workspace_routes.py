"""REST API endpoints for workspace and thread management."""

from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from metropolis.db.skill_store import SkillStore
from metropolis.db.workspace_store import WorkspaceStore
from metropolis.db.workspace_thread_store import WorkspaceThreadStore
from metropolis.dependencies.workspace_folder import (
    cleanup_execution_environment_folder,
)
from metropolis.services.file_service import FileService
from metropolis.services.workspace_service import WorkspaceService

router = APIRouter(prefix="/api", tags=["workspaces"])

# Global store instances
_workspace_store: WorkspaceStore | None = None
_workspace_thread_store: WorkspaceThreadStore | None = None
_skill_store: SkillStore | None = None
_file_service: FileService | None = None


def get_workspace_store() -> WorkspaceStore:
    """Get the global workspace store instance."""
    global _workspace_store
    if _workspace_store is None:
        raise RuntimeError(
            "WorkspaceStore not initialized. Call init_workspace_store first."
        )
    return _workspace_store


def get_workspace_thread_store() -> WorkspaceThreadStore:
    """Get the global workspace thread store instance."""
    global _workspace_thread_store
    if _workspace_thread_store is None:
        raise RuntimeError(
            "WorkspaceThreadStore not initialized. Call init_workspace_thread_store first."
        )
    return _workspace_thread_store


def get_skill_store() -> SkillStore:
    """Get the global skill store instance."""
    global _skill_store
    if _skill_store is None:
        raise RuntimeError("SkillStore not initialized. Call init_skill_store first.")
    return _skill_store


def init_workspace_store(workspace_store: WorkspaceStore):
    """Initialize the global workspace store instance."""
    global _workspace_store
    _workspace_store = workspace_store


def init_workspace_thread_store(workspace_thread_store: WorkspaceThreadStore):
    """Initialize the global workspace thread store instance."""
    global _workspace_thread_store
    _workspace_thread_store = workspace_thread_store


def init_skill_store(skill_store: SkillStore):
    """Initialize the global skill store instance."""
    global _skill_store
    _skill_store = skill_store


def get_file_service() -> FileService:
    """Get the global file service instance."""
    global _file_service
    if _file_service is None:
        raise RuntimeError("FileService not initialized. Call init_file_service first.")
    return _file_service


def init_file_service(file_service: FileService):
    """Initialize the global file service instance."""
    global _file_service
    _file_service = file_service


class CreateWorkspaceRequest(BaseModel):
    """Request model for creating a workspace."""

    name: str
    description: str = ""
    skill_ids: List[str] = []


class UpdateWorkspaceRequest(BaseModel):
    """Request model for updating a workspace."""

    name: Optional[str] = None
    description: Optional[str] = None
    skill_ids: Optional[List[str]] = None


class CreateThreadRequest(BaseModel):
    """Request model for creating a thread."""

    title: Optional[str] = None


class ChatRequest(BaseModel):
    """Request model for chat messages."""

    message: str


@router.get("/workspaces")
async def list_workspaces(
    limit: int = 12,
    skip: int = 0,
    workspace_store: WorkspaceStore = Depends(get_workspace_store),
):
    """
    List all workspaces with pagination.

    Args:
        limit: Maximum number of workspaces to return
        skip: Number of workspaces to skip (for pagination)
        workspace_store: Injected workspace store

    Returns:
        List of workspaces
    """
    workspaces = await workspace_store.list_workspaces(limit=limit, skip=skip)

    # Get skills for each workspace
    skill_store = get_skill_store()
    result = []
    for workspace in workspaces:
        workspace_dict = workspace.model_dump(by_alias=True)

        # Load skill details
        skills = []
        for skill_id in workspace.skill_ids:
            skill = await skill_store.get_skill(skill_id)
            if skill:
                skills.append(
                    {
                        "_id": skill.id,
                        "title": skill.title,
                    }
                )

        workspace_dict["skills"] = skills
        result.append(workspace_dict)

    return result


@router.post("/workspaces")
async def create_workspace(
    request: CreateWorkspaceRequest,
    workspace_store: WorkspaceStore = Depends(get_workspace_store),
):
    """
    Create a new workspace.

    Args:
        request: Workspace creation request
        workspace_store: Injected workspace store

    Returns:
        The created workspace
    """
    from metropolis.db.models import Workspace

    workspace = Workspace(
        name=request.name,
        description=request.description,
        skill_ids=request.skill_ids,
    )

    created = await workspace_store.create_workspace(workspace)
    return created.model_dump(by_alias=True)


@router.get("/workspaces/{workspace_id}")
async def get_workspace(
    workspace_id: str, workspace_store: WorkspaceStore = Depends(get_workspace_store)
):
    """
    Get a workspace by ID with skill details.

    Args:
        workspace_id: The workspace ID
        workspace_store: Injected workspace store

    Returns:
        The workspace details with skills

    Raises:
        HTTPException: If workspace not found
    """
    workspace = await workspace_store.get_workspace(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    workspace_dict = workspace.model_dump(by_alias=True)

    # Load skill details
    skill_store = get_skill_store()
    skills = []
    for skill_id in workspace.skill_ids:
        skill = await skill_store.get_skill(skill_id)
        if skill:
            skills.append(skill.model_dump(by_alias=True))

    workspace_dict["skills"] = skills
    return workspace_dict


@router.put("/workspaces/{workspace_id}")
async def update_workspace(
    workspace_id: str,
    request: UpdateWorkspaceRequest,
    workspace_store: WorkspaceStore = Depends(get_workspace_store),
):
    """
    Update a workspace.

    Args:
        workspace_id: The workspace ID
        request: Workspace update request
        workspace_store: Injected workspace store

    Returns:
        Success status

    Raises:
        HTTPException: If workspace not found
    """
    updates = {}
    if request.name is not None:
        updates["name"] = request.name
    if request.description is not None:
        updates["description"] = request.description
    if request.skill_ids is not None:
        updates["skill_ids"] = request.skill_ids

    success = await workspace_store.update_workspace(workspace_id, updates)
    if not success:
        raise HTTPException(status_code=404, detail="Workspace not found")

    return {"success": True}


@router.delete("/workspaces/{workspace_id}")
async def delete_workspace(
    workspace_id: str, workspace_store: WorkspaceStore = Depends(get_workspace_store)
):
    """
    Delete a workspace.

    Args:
        workspace_id: The workspace ID
        workspace_store: Injected workspace store

    Returns:
        Success status

    Raises:
        HTTPException: If workspace not found
    """
    success = await workspace_store.delete_workspace(workspace_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workspace not found")

    return {"success": True}


@router.get("/workspaces/{workspace_id}/threads")
async def list_workspace_threads(
    workspace_id: str,
    limit: int = 20,
    skip: int = 0,
    workspace_thread_store: WorkspaceThreadStore = Depends(get_workspace_thread_store),
):
    """
    List all threads in a workspace.

    Args:
        workspace_id: The workspace ID
        limit: Maximum number of threads to return
        skip: Number of threads to skip (for pagination)
        workspace_thread_store: Injected workspace thread store

    Returns:
        List of threads
    """
    threads = await workspace_thread_store.list_threads(
        workspace_id=workspace_id, limit=limit, skip=skip
    )
    return [thread.model_dump(by_alias=True) for thread in threads]


@router.post("/workspaces/{workspace_id}/threads")
async def create_workspace_thread(
    workspace_id: str,
    request: CreateThreadRequest,
    workspace_store: WorkspaceStore = Depends(get_workspace_store),
):
    """
    Create a new thread in a workspace.

    Note: The actual thread (session) is created when the first message is sent.
    This endpoint just validates the workspace exists.

    Args:
        workspace_id: The workspace ID
        request: Thread creation request
        workspace_store: Injected workspace store

    Returns:
        Thread creation status

    Raises:
        HTTPException: If workspace not found
    """
    workspace = await workspace_store.get_workspace(workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    return {
        "success": True,
        "message": "Thread will be created on first message",
        "thread_id": "pending",
    }


@router.get("/workspaces/{workspace_id}/threads/{thread_id}")
async def get_workspace_thread(
    workspace_id: str,
    thread_id: str,
    workspace_thread_store: WorkspaceThreadStore = Depends(get_workspace_thread_store),
):
    """
    Get a thread and its messages.

    Args:
        workspace_id: The workspace ID
        thread_id: The thread ID (claude_session_id)
        workspace_thread_store: Injected workspace thread store

    Returns:
        Thread details with messages

    Raises:
        HTTPException: If thread not found or doesn't belong to workspace
    """
    thread = await workspace_thread_store.get_thread(thread_id)
    if not thread or thread.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Thread not found")

    messages = await workspace_thread_store.get_thread_messages(thread_id)

    return {
        "session": thread.model_dump(by_alias=True),
        "messages": [msg.model_dump(by_alias=True) for msg in messages],
    }


@router.delete("/workspaces/{workspace_id}/threads/{thread_id}")
async def delete_workspace_thread(
    workspace_id: str,
    thread_id: str,
    workspace_thread_store: WorkspaceThreadStore = Depends(get_workspace_thread_store),
):
    """
    Delete a thread from a workspace.

    Args:
        workspace_id: The workspace ID
        thread_id: The thread ID (claude_session_id)
        workspace_thread_store: Injected workspace thread store

    Returns:
        Success status

    Raises:
        HTTPException: If thread not found or doesn't belong to workspace
    """
    thread = await workspace_thread_store.get_thread(thread_id)
    if not thread or thread.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Thread not found")

    # Get execution environment before deletion
    execution_environment = thread.execution_environment

    # Delete the thread and all its messages
    success = await workspace_thread_store.delete_thread(thread_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete thread")

    # Clean up the execution environment folder
    cleanup_execution_environment_folder(execution_environment)

    return {"success": True}


@router.post("/workspaces/{workspace_id}/threads/{thread_id}/chat")
async def chat_in_workspace_thread(
    workspace_id: str,
    thread_id: str,
    request: ChatRequest,
):
    """
    Send a message in a workspace thread with SSE streaming.

    Args:
        workspace_id: The workspace ID
        thread_id: The thread ID (claude_session_id) or "pending" for new thread
        request: Chat request with message

    Returns:
        StreamingResponse with Server-Sent Events
    """
    workspace_store = get_workspace_store()
    workspace_thread_store = get_workspace_thread_store()
    skill_store = get_skill_store()

    # Create workspace service
    workspace_service = WorkspaceService(
        workspace_store, workspace_thread_store, skill_store
    )

    # Handle thread_id - convert "pending" to None
    actual_thread_id = None if thread_id == "pending" else thread_id

    # Stream chat (workspace service manages execution environments)
    async def generate():
        async for event in workspace_service.chat_in_workspace(
            workspace_id, request.message, actual_thread_id
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


@router.post("/workspaces/{workspace_id}/threads/{thread_id}/files/upload")
async def upload_file(
    workspace_id: str,
    thread_id: str,
    file: UploadFile = File(...),
):
    """
    Upload a file to the thread's execution environment.

    Args:
        workspace_id: The workspace ID
        thread_id: The thread ID (claude_session_id)
        file: File to upload

    Returns:
        Success status and file metadata
    """
    file_service = get_file_service()

    try:
        file_meta = await file_service.upload_file(workspace_id, thread_id, file)
        return {"success": True, "file": file_meta.model_dump(by_alias=True)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/workspaces/{workspace_id}/threads/{thread_id}/files")
async def list_files(workspace_id: str, thread_id: str):
    """
    List all files in the thread's execution environment.

    Args:
        workspace_id: The workspace ID
        thread_id: The thread ID (claude_session_id)

    Returns:
        List of files in execution environment
    """
    file_service = get_file_service()

    try:
        files = await file_service.list_files(workspace_id, thread_id)
        return {"files": files}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/workspaces/{workspace_id}/threads/{thread_id}/files/{filename}")
async def download_file(workspace_id: str, thread_id: str, filename: str):
    """
    Download a file from the thread's execution environment.

    Args:
        workspace_id: The workspace ID
        thread_id: The thread ID (claude_session_id)
        filename: Filename to download

    Returns:
        File as download
    """
    file_service = get_file_service()

    try:
        file_path, mime_type = await file_service.download_file(
            workspace_id, thread_id, filename
        )
        return FileResponse(path=file_path, media_type=mime_type, filename=filename)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/workspaces/{workspace_id}/threads/{thread_id}/files/{filename}")
async def delete_file(workspace_id: str, thread_id: str, filename: str):
    """
    Delete a file from the thread's execution environment.

    Args:
        workspace_id: The workspace ID
        thread_id: The thread ID (claude_session_id)
        filename: Filename to delete

    Returns:
        Success status
    """
    file_service = get_file_service()

    try:
        await file_service.delete_file(workspace_id, thread_id, filename)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
