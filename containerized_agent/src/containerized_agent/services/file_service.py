"""Service for managing files within the workspace directory."""

import logging
import os
import shutil
from pathlib import Path
from typing import Dict, Optional

logger = logging.getLogger(__name__)

# Working directory for agent files (mounted as volume)
WORKING_DIR = Path(os.getenv("AGENT_WORKING_DIR", "/app/workspace"))


class FileServiceError(Exception):
    """Base exception for file service errors."""

    pass


class PathOutsideWorkspaceError(FileServiceError):
    """Raised when a path is outside the workspace directory."""

    pass


class FileService:
    """Service for managing files within the workspace directory."""

    def __init__(self, workspace_dir: Optional[Path] = None):
        """Initialize the file service.

        Args:
            workspace_dir: Optional workspace directory path. Defaults to WORKING_DIR.
        """
        self.workspace_dir = Path(workspace_dir) if workspace_dir else WORKING_DIR
        # Ensure workspace directory exists
        self.workspace_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"FileService initialized with workspace: {self.workspace_dir}")

    def validate_path(self, path: str) -> Path:
        """Validate that a path is within the workspace directory.

        Args:
            path: Relative or absolute path to validate

        Returns:
            Resolved Path object within workspace

        Raises:
            PathOutsideWorkspaceError: If path is outside workspace
        """
        # Resolve the path
        if os.path.isabs(path):
            resolved = Path(path).resolve()
        else:
            resolved = (self.workspace_dir / path).resolve()

        # Ensure the resolved path is within workspace
        try:
            # Use commonpath to check if workspace is a prefix of resolved path
            common = os.path.commonpath([self.workspace_dir.resolve(), resolved])
            if common != str(self.workspace_dir.resolve()):
                raise PathOutsideWorkspaceError(
                    f"Path {path} is outside workspace directory"
                )
        except ValueError:
            # ValueError occurs when paths don't have a common path
            raise PathOutsideWorkspaceError(
                f"Path {path} is outside workspace directory"
            )

        return resolved

    def list_directory(self, path: str = "") -> Dict:
        """List files and directories in the specified path.

        Args:
            path: Relative path within workspace. Defaults to workspace root.

        Returns:
            Dictionary with directory listing information

        Raises:
            PathOutsideWorkspaceError: If path is outside workspace
            FileNotFoundError: If path doesn't exist
            NotADirectoryError: If path is not a directory
        """
        resolved_path = self.validate_path(path)

        if not resolved_path.exists():
            raise FileNotFoundError(f"Path does not exist: {path}")

        if not resolved_path.is_dir():
            raise NotADirectoryError(f"Path is not a directory: {path}")

        items = []
        for item in sorted(resolved_path.iterdir()):
            try:
                stat = item.stat()
                items.append(
                    {
                        "name": item.name,
                        "path": str(item.relative_to(self.workspace_dir)),
                        "type": "directory" if item.is_dir() else "file",
                        "size": stat.st_size if item.is_file() else None,
                        "modified": stat.st_mtime,
                    }
                )
            except (OSError, PermissionError) as e:
                logger.warning(f"Error accessing {item}: {e}")
                # Skip items we can't access
                continue  # noqa: BLE001, TRY301

        return {
            "path": str(resolved_path.relative_to(self.workspace_dir)),
            "absolute_path": str(resolved_path),
            "items": items,
        }

    def get_file_info(self, path: str) -> Dict:
        """Get file or directory metadata.

        Args:
            path: Relative path within workspace

        Returns:
            Dictionary with file/directory information

        Raises:
            PathOutsideWorkspaceError: If path is outside workspace
            FileNotFoundError: If path doesn't exist
        """
        resolved_path = self.validate_path(path)

        if not resolved_path.exists():
            raise FileNotFoundError(f"Path does not exist: {path}")

        stat = resolved_path.stat()
        return {
            "name": resolved_path.name,
            "path": str(resolved_path.relative_to(self.workspace_dir)),
            "absolute_path": str(resolved_path),
            "type": "directory" if resolved_path.is_dir() else "file",
            "size": stat.st_size if resolved_path.is_file() else None,
            "modified": stat.st_mtime,
            "created": stat.st_ctime,
        }

    def create_directory(self, path: str) -> Dict:
        """Create a new directory.

        Args:
            path: Relative path within workspace

        Returns:
            Dictionary with created directory information

        Raises:
            PathOutsideWorkspaceError: If path is outside workspace
            FileExistsError: If directory already exists
        """
        resolved_path = self.validate_path(path)

        if resolved_path.exists():
            raise FileExistsError(f"Path already exists: {path}")

        resolved_path.mkdir(parents=True, exist_ok=False)
        logger.info(f"Created directory: {resolved_path}")

        return {
            "path": str(resolved_path.relative_to(self.workspace_dir)),
            "absolute_path": str(resolved_path),
            "message": "Directory created successfully",
        }

    def delete_path(self, path: str) -> Dict:
        """Delete a file or directory.

        Args:
            path: Relative path within workspace

        Returns:
            Dictionary with deletion confirmation

        Raises:
            PathOutsideWorkspaceError: If path is outside workspace
            FileNotFoundError: If path doesn't exist
        """
        resolved_path = self.validate_path(path)

        if not resolved_path.exists():
            raise FileNotFoundError(f"Path does not exist: {path}")

        if resolved_path.is_dir():
            shutil.rmtree(resolved_path)
            logger.info(f"Deleted directory: {resolved_path}")
        else:
            resolved_path.unlink()
            logger.info(f"Deleted file: {resolved_path}")

        return {
            "path": str(resolved_path.relative_to(self.workspace_dir)),
            "message": "Path deleted successfully",
        }

    def rename_path(self, old_path: str, new_path: str) -> Dict:
        """Rename a file or directory.

        Args:
            old_path: Current relative path within workspace
            new_path: New relative path within workspace

        Returns:
            Dictionary with rename confirmation

        Raises:
            PathOutsideWorkspaceError: If either path is outside workspace
            FileNotFoundError: If old_path doesn't exist
            FileExistsError: If new_path already exists
        """
        old_resolved = self.validate_path(old_path)
        new_resolved = self.validate_path(new_path)

        if not old_resolved.exists():
            raise FileNotFoundError(f"Path does not exist: {old_path}")

        if new_resolved.exists():
            raise FileExistsError(f"Path already exists: {new_path}")

        old_resolved.rename(new_resolved)
        logger.info(f"Renamed {old_resolved} to {new_resolved}")

        return {
            "old_path": str(old_resolved.relative_to(self.workspace_dir)),
            "new_path": str(new_resolved.relative_to(self.workspace_dir)),
            "message": "Path renamed successfully",
        }
