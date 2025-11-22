"""Service for proxying file operations to containerized agent."""

import logging
from typing import Optional

import httpx

from metropolis.config.settings import containerized_agent_config

logger = logging.getLogger(__name__)


class ContainerizedFileService:
    """Service for proxying file operations to containerized agent."""

    def __init__(self):
        """Initialize the containerized file service."""
        self.base_url = containerized_agent_config.url.rstrip("/")

    async def list_directory(self, path: str = "") -> dict:
        """
        List directory contents.

        Args:
            path: Relative path within workspace. Defaults to workspace root.

        Returns:
            Directory listing dictionary
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/files/list",
                params={"path": path} if path else None,
            )
            response.raise_for_status()
            return response.json()

    async def upload_file(
        self, file_content: bytes, filename: str, path: str = ""
    ) -> dict:
        """
        Upload a file to the workspace.

        Args:
            file_content: File content as bytes
            filename: Name of the file
            path: Relative directory path within workspace. Defaults to workspace root.

        Returns:
            Upload confirmation dictionary
        """
        async with httpx.AsyncClient(timeout=60.0) as client:
            files = {"file": (filename, file_content)}
            data = {"path": path} if path else {}
            response = await client.post(
                f"{self.base_url}/files/upload",
                files=files,
                data=data,
            )
            response.raise_for_status()
            return response.json()

    async def download_file(self, path: str) -> bytes:
        """
        Download a file from the workspace.

        Args:
            path: Relative path to file within workspace

        Returns:
            File content as bytes
        """
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(
                f"{self.base_url}/files/download",
                params={"path": path},
            )
            response.raise_for_status()
            return response.content

    async def delete_file(self, path: str) -> dict:
        """
        Delete a file or directory from the workspace.

        Args:
            path: Relative path to file or directory within workspace

        Returns:
            Deletion confirmation dictionary
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.delete(
                f"{self.base_url}/files/delete",
                params={"path": path},
            )
            response.raise_for_status()
            return response.json()

    async def rename_file(self, old_path: str, new_path: str) -> dict:
        """
        Rename a file or directory.

        Args:
            old_path: Current relative path within workspace
            new_path: New relative path within workspace

        Returns:
            Rename confirmation dictionary
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/files/rename",
                json={"old_path": old_path, "new_path": new_path},
            )
            response.raise_for_status()
            return response.json()

    async def create_directory(self, path: str) -> dict:
        """
        Create a new directory.

        Args:
            path: Relative path within workspace

        Returns:
            Creation confirmation dictionary
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/files/mkdir",
                json={"path": path},
            )
            response.raise_for_status()
            return response.json()

