"""Agent v2 file management routes."""

import logging
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

from metropolis.services.containerized_file_service import ContainerizedFileService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/agent/files", tags=["agent v2"])

# Global service instance (will be initialized in app.py)
_file_service: Optional[ContainerizedFileService] = None


def init_file_service(service: ContainerizedFileService):
    """Initialize the file service singleton."""
    global _file_service
    _file_service = service


def get_file_service() -> ContainerizedFileService:
    """Get the file service instance."""
    if _file_service is None:
        raise RuntimeError("File service not initialized")
    return _file_service


class RenameRequest(BaseModel):
    """Request model for rename endpoint."""

    old_path: str
    new_path: str


class CreateDirectoryRequest(BaseModel):
    """Request model for create directory endpoint."""

    path: str


@router.get("/list")
async def list_directory(
    path: str = Query("", description="Relative path within workspace"),
):
    """
    List directory contents.

    Args:
        path: Relative path within workspace. Defaults to workspace root.

    Returns:
        Directory listing with files and folders
    """
    try:
        file_service = get_file_service()
        result = await file_service.list_directory(path)
        return result
    except Exception as e:
        logger.error(f"Error listing directory: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),  # noqa: B008
    path: str = Form(
        "", description="Relative directory path within workspace to upload to"
    ),
):
    """
    Upload a file to the workspace.

    Args:
        file: File to upload
        path: Relative directory path within workspace. Defaults to workspace root.

    Returns:
        Upload confirmation with file information
    """
    try:
        file_service = get_file_service()
        file_content = await file.read()
        result = await file_service.upload_file(
            file_content, file.filename, path
        )
        return result
    except Exception as e:
        logger.error(f"Error uploading file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download")
async def download_file(
    path: str = Query(..., description="Relative path to file within workspace"),
):
    """
    Download a file from the workspace.

    Args:
        path: Relative path to file within workspace

    Returns:
        File content
    """
    try:
        file_service = get_file_service()
        file_content = await file_service.download_file(path)
        return Response(
            content=file_content,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{path.split("/")[-1]}"'},
        )
    except Exception as e:
        logger.error(f"Error downloading file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/delete")
async def delete_file(
    path: str = Query(
        ..., description="Relative path to file or directory within workspace"
    ),
):
    """
    Delete a file or directory from the workspace.

    Args:
        path: Relative path to file or directory within workspace

    Returns:
        Deletion confirmation
    """
    try:
        file_service = get_file_service()
        result = await file_service.delete_file(path)
        return result
    except Exception as e:
        logger.error(f"Error deleting file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rename")
async def rename_file(request: RenameRequest):
    """
    Rename a file or directory.

    Args:
        request: Rename request with old_path and new_path

    Returns:
        Rename confirmation with new path information
    """
    try:
        file_service = get_file_service()
        result = await file_service.rename_file(request.old_path, request.new_path)
        return result
    except Exception as e:
        logger.error(f"Error renaming file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mkdir")
async def create_directory(request: CreateDirectoryRequest):
    """
    Create a new directory.

    Args:
        request: Create directory request with path

    Returns:
        Creation confirmation with directory information
    """
    try:
        file_service = get_file_service()
        result = await file_service.create_directory(request.path)
        return result
    except Exception as e:
        logger.error(f"Error creating directory: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

