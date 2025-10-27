"""Service for file upload/download in workspace threads."""

from pathlib import Path
from typing import Any

from fastapi import UploadFile

from metropolis.db.models import FileMetadata, WorkspaceThread
from metropolis.db.workspace_thread_store import WorkspaceThreadStore
from metropolis.dependencies.workspace_folder import get_execution_environment_folder
from metropolis.utils.file_utils import (
    get_file_extension,
    get_mime_type,
    sanitize_filename,
    validate_file_size,
    validate_file_type,
)


class FileService:
    """Service for managing file uploads/downloads in workspace threads."""

    def __init__(self, workspace_thread_store: WorkspaceThreadStore):
        """
        Initialize the file service.

        Args:
            workspace_thread_store: WorkspaceThreadStore instance
        """
        self.workspace_thread_store = workspace_thread_store

    async def upload_file(
        self, workspace_id: str, thread_id: str, file: UploadFile
    ) -> FileMetadata:
        """
        Upload file to execution environment and save metadata.

        Args:
            workspace_id: Workspace ID
            thread_id: Thread ID (claude_session_id)
            file: Uploaded file

        Returns:
            FileMetadata object

        Raises:
            ValueError: If file validation fails or thread not found
        """
        # Validate file type
        if not file.filename:
            raise ValueError("File must have a filename")

        file_ext = get_file_extension(file.filename)
        if not validate_file_type(file_ext):
            raise ValueError(
                f"File type .{file_ext} not allowed. "
                f"Allowed types: pptx, csv, pdf, txt, md, xlsx, html"
            )

        # Read file contents
        contents = await file.read()

        # Validate file size
        if not validate_file_size(len(contents)):
            raise ValueError("File too large (max 16 MB)")

        # Get thread and verify ownership
        thread: WorkspaceThread | None = await self.workspace_thread_store.get_thread(
            thread_id
        )
        if not thread or thread.workspace_id != workspace_id:
            raise ValueError("Thread not found")

        # Sanitize filename
        safe_filename = sanitize_filename(file.filename)

        # Get execution environment folder
        env_folder = get_execution_environment_folder(thread.execution_environment)

        # Save file
        file_path = env_folder / safe_filename
        with open(file_path, "wb") as f:
            f.write(contents)

        # Create metadata
        file_meta = FileMetadata(
            filename=safe_filename,
            file_size=len(contents),
            file_type=file_ext,
            mime_type=get_mime_type(safe_filename),
        )

        # Add to thread
        await self.workspace_thread_store.add_file_metadata(thread_id, file_meta)

        return file_meta

    async def list_files(
        self, workspace_id: str, thread_id: str
    ) -> list[dict[str, Any]]:
        """
        List all files in execution environment.

        Args:
            workspace_id: Workspace ID
            thread_id: Thread ID (claude_session_id)

        Returns:
            List of file info dictionaries

        Raises:
            ValueError: If thread not found
        """
        # Get thread
        thread: WorkspaceThread | None = await self.workspace_thread_store.get_thread(
            thread_id
        )
        if not thread or thread.workspace_id != workspace_id:
            raise ValueError("Thread not found")

        # Get execution environment folder
        env_folder = get_execution_environment_folder(thread.execution_environment)

        # Scan folder for all files
        all_files: list[dict[str, Any]] = []
        if env_folder.exists():
            for file_path in env_folder.iterdir():
                if file_path.is_file():
                    # Check if we have metadata
                    file_meta = None
                    for meta in thread.files:
                        if meta.filename == file_path.name:
                            file_meta = meta
                            break

                    all_files.append(
                        {
                            "filename": file_path.name,
                            "file_size": (
                                file_path.stat().st_size
                                if not file_meta
                                else file_meta.file_size
                            ),
                            "uploaded_at": (
                                file_meta.uploaded_at if file_meta else None
                            ),
                            "file_type": (
                                file_meta.file_type
                                if file_meta
                                else get_file_extension(file_path.name)
                            ),
                            "mime_type": (
                                file_meta.mime_type
                                if file_meta
                                else get_mime_type(file_path.name)
                            ),
                            "is_tracked": file_meta is not None,
                        }
                    )

        return all_files

    async def download_file(
        self, workspace_id: str, thread_id: str, filename: str
    ) -> tuple[Path, str]:
        """
        Get file path for download.

        Args:
            workspace_id: Workspace ID
            thread_id: Thread ID (claude_session_id)
            filename: Filename to download

        Returns:
            Tuple of (file_path, mime_type)

        Raises:
            ValueError: If thread not found
            FileNotFoundError: If file doesn't exist
        """
        # Get thread
        thread: WorkspaceThread | None = await self.workspace_thread_store.get_thread(
            thread_id
        )
        if not thread or thread.workspace_id != workspace_id:
            raise ValueError("Thread not found")

        # Sanitize filename
        safe_filename = sanitize_filename(filename)

        # Get file path
        env_folder = get_execution_environment_folder(thread.execution_environment)
        file_path = env_folder / safe_filename

        if not file_path.exists() or not file_path.is_file():
            raise FileNotFoundError(f"File {filename} not found")

        # Get MIME type
        mime_type = get_mime_type(safe_filename)

        return file_path, mime_type

    async def delete_file(
        self, workspace_id: str, thread_id: str, filename: str
    ) -> bool:
        """
        Delete file from execution environment.

        Args:
            workspace_id: Workspace ID
            thread_id: Thread ID (claude_session_id)
            filename: Filename to delete

        Returns:
            True if successful

        Raises:
            ValueError: If thread not found
        """
        # Get thread
        thread: WorkspaceThread | None = await self.workspace_thread_store.get_thread(
            thread_id
        )
        if not thread or thread.workspace_id != workspace_id:
            raise ValueError("Thread not found")

        # Sanitize filename
        safe_filename = sanitize_filename(filename)

        # Delete file
        env_folder = get_execution_environment_folder(thread.execution_environment)
        file_path = env_folder / safe_filename

        if file_path.exists():
            file_path.unlink()

        # Remove metadata
        await self.workspace_thread_store.remove_file_metadata(thread_id, safe_filename)

        return True
