"""File management routes."""

import logging

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse

from containerized_agent.models import CreateDirectoryRequest, RenameRequest
from containerized_agent.services.file_service import (
    FileService,
    FileServiceError,
    PathOutsideWorkspaceError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/files", tags=["files"])

# Initialize file service
file_service = FileService()

# Maximum upload size: 10 MB
MAX_UPLOAD_SIZE = 10 * 1024 * 1024


@router.get("/list")
async def list_directory(
    path: str = Query("", description="Relative path within workspace"),
):
    """List directory contents.

    Args:
        path: Relative path within workspace. Defaults to workspace root.

    Returns:
        Directory listing with files and folders
    """
    try:
        result = file_service.list_directory(path)
        logger.info(f"Listed directory: {path}")
        return result
    except PathOutsideWorkspaceError as e:
        logger.warning(f"Path outside workspace: {path}")
        raise HTTPException(status_code=400, detail=str(e)) from e
    except FileNotFoundError as e:
        logger.warning(f"Directory not found: {path}")
        raise HTTPException(status_code=404, detail=str(e)) from e
    except NotADirectoryError as e:
        logger.warning(f"Path is not a directory: {path}")
        raise HTTPException(status_code=400, detail=str(e)) from e
    except FileServiceError as e:
        logger.error(f"File service error: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Unexpected error listing directory: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),  # noqa: B008
    path: str = Form(
        "", description="Relative directory path within workspace to upload to"
    ),
):
    """Upload a file to the workspace.

    Args:
        file: File to upload
        path: Relative directory path within workspace. Defaults to workspace root.

    Returns:
        Upload confirmation with file information
    """
    try:
        # Validate path if provided
        if path:
            file_service.validate_path(path)
            target_dir = file_service.validate_path(path)
            if not target_dir.is_dir():
                raise HTTPException(
                    status_code=400, detail=f"Path is not a directory: {path}"
                )
        else:
            target_dir = file_service.workspace_dir

        # Check file size
        file_content = await file.read()
        file_size = len(file_content)
        if file_size > MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"File size {file_size} exceeds maximum allowed size of "
                    f"{MAX_UPLOAD_SIZE} bytes"
                ),
            )

        # Validate target file path
        target_file_path = target_dir / file.filename
        relative_target = str(target_file_path.relative_to(file_service.workspace_dir))
        file_service.validate_path(relative_target)

        # Write file
        target_file_path.write_bytes(file_content)
        logger.info(f"Uploaded file: {target_file_path}")

        # Get file info
        file_info = file_service.get_file_info(relative_target)

        return {
            "message": "File uploaded successfully",
            "file": file_info,
        }
    except PathOutsideWorkspaceError as e:
        logger.warning(f"Path outside workspace: {path}")
        raise HTTPException(status_code=400, detail=str(e)) from e
    except HTTPException:
        raise
    except FileServiceError as e:
        logger.error(f"File service error: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Unexpected error uploading file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.get("/download")
async def download_file(
    path: str = Query(..., description="Relative path to file within workspace"),
):
    """Download a file from the workspace.

    Args:
        path: Relative path to file within workspace

    Returns:
        FileResponse with the file content
    """
    try:
        resolved_path = file_service.validate_path(path)

        if not resolved_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {path}")

        if resolved_path.is_dir():
            raise HTTPException(
                status_code=400, detail=f"Path is a directory, not a file: {path}"
            )

        logger.info(f"Downloading file: {resolved_path}")
        return FileResponse(
            path=str(resolved_path),
            filename=resolved_path.name,
            media_type="application/octet-stream",
        )
    except PathOutsideWorkspaceError as e:
        logger.warning(f"Path outside workspace: {path}")
        raise HTTPException(status_code=400, detail=str(e)) from e
    except HTTPException:
        raise
    except FileServiceError as e:
        logger.error(f"File service error: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Unexpected error downloading file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.delete("/delete")
async def delete_file(
    path: str = Query(
        ..., description="Relative path to file or directory within workspace"
    ),
):
    """Delete a file or directory from the workspace.

    Args:
        path: Relative path to file or directory within workspace

    Returns:
        Deletion confirmation
    """
    try:
        result = file_service.delete_path(path)
        logger.info(f"Deleted path: {path}")
        return result
    except PathOutsideWorkspaceError as e:
        logger.warning(f"Path outside workspace: {path}")
        raise HTTPException(status_code=400, detail=str(e)) from e
    except FileNotFoundError as e:
        logger.warning(f"Path not found: {path}")
        raise HTTPException(status_code=404, detail=str(e)) from e
    except FileServiceError as e:
        logger.error(f"File service error: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Unexpected error deleting path: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.post("/rename")
async def rename_file(request: RenameRequest):
    """Rename a file or directory.

    Args:
        request: Rename request with old_path and new_path

    Returns:
        Rename confirmation with new path information
    """
    try:
        result = file_service.rename_path(request.old_path, request.new_path)
        logger.info(f"Renamed {request.old_path} to {request.new_path}")
        return result
    except PathOutsideWorkspaceError as e:
        logger.warning(
            f"Path outside workspace: {request.old_path} or {request.new_path}"
        )
        raise HTTPException(status_code=400, detail=str(e)) from e
    except FileNotFoundError as e:
        logger.warning(f"Path not found: {request.old_path}")
        raise HTTPException(status_code=404, detail=str(e)) from e
    except FileExistsError as e:
        logger.warning(f"Path already exists: {request.new_path}")
        raise HTTPException(status_code=409, detail=str(e)) from e
    except FileServiceError as e:
        logger.error(f"File service error: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Unexpected error renaming path: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e


@router.post("/mkdir")
async def create_directory(request: CreateDirectoryRequest):
    """Create a new directory.

    Args:
        request: Create directory request with path

    Returns:
        Creation confirmation with directory information
    """
    try:
        result = file_service.create_directory(request.path)
        logger.info(f"Created directory: {request.path}")
        return result
    except PathOutsideWorkspaceError as e:
        logger.warning(f"Path outside workspace: {request.path}")
        raise HTTPException(status_code=400, detail=str(e)) from e
    except FileExistsError as e:
        logger.warning(f"Path already exists: {request.path}")
        raise HTTPException(status_code=409, detail=str(e)) from e
    except FileServiceError as e:
        logger.error(f"File service error: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Unexpected error creating directory: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e
