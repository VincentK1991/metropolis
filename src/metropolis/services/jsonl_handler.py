"""Handler for Claude Agent SDK JSONL session files."""

import os
from pathlib import Path
from typing import Optional

from metropolis.db.session_store import SessionStore


class JSONLHandler:
    """
    Manages JSONL session files for Claude Agent SDK.

    Handles reading/writing local JSONL files and syncing with MongoDB
    for multi-pod session resumption.
    """

    def __init__(self, workspace_root: Optional[str] = None):
        """
        Initialize the JSONL handler.

        Args:
            workspace_root: Root path of the workspace. If None, uses current directory.
        """
        self.workspace_root = workspace_root or os.getcwd()

    def get_project_path(self) -> Path:
        """
        Get the project directory path for JSONL files.

        Uses the Claude SDK convention: .claude/projects/{encoded_project_name}/
        The project name is derived from the workspace root path.

        Returns:
            Path to the project directory
        """
        # Encode the workspace path to create a valid directory name
        # Replace path separators with hyphens
        project_name = self.workspace_root.replace(os.sep, "-")
        # Note: SDK keeps the leading dash, e.g., "-home-user-project"

        # Construct the path following Claude SDK convention
        home_dir = Path.home()
        project_path = home_dir / ".claude" / "projects" / project_name

        return project_path

    def get_session_file_path(self, session_id: str) -> Path:
        """
        Get the full path to a session's JSONL file.

        Args:
            session_id: The Claude session ID

        Returns:
            Path to the session JSONL file
        """
        project_path = self.get_project_path()
        return project_path / f"{session_id}.jsonl"

    def ensure_directory_exists(self):
        """Create the project directory if it doesn't exist."""
        project_path = self.get_project_path()
        project_path.mkdir(parents=True, exist_ok=True)

    def read_jsonl_file(self, session_id: str) -> list[str]:
        """
        Read a JSONL file and return its lines.

        Args:
            session_id: The Claude session ID

        Returns:
            List of raw JSONL line strings (without newlines)
        """
        file_path = self.get_session_file_path(session_id)

        if not file_path.exists():
            return []

        lines = []
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                # Strip newline characters but keep the content
                stripped = line.rstrip("\n\r")
                if stripped:  # Skip empty lines
                    lines.append(stripped)

        return lines

    def write_jsonl_file(self, session_id: str, lines: list[str]):
        """
        Write lines to a JSONL file (overwrites existing file).

        Args:
            session_id: The Claude session ID
            lines: List of raw JSONL line strings
        """
        self.ensure_directory_exists()
        file_path = self.get_session_file_path(session_id)

        with open(file_path, "w", encoding="utf-8") as f:
            for line in lines:
                f.write(line + "\n")

    async def persist_to_mongodb(self, session_id: str, session_store: SessionStore):
        """
        Read local JSONL file and save to MongoDB.

        Called when WebSocket disconnects to backup session history.

        Args:
            session_id: The Claude session ID
            session_store: SessionStore instance for database operations
        """
        lines = self.read_jsonl_file(session_id)
        if lines:
            await session_store.save_jsonl_lines(session_id, lines)

    async def restore_from_mongodb(self, session_id: str, session_store: SessionStore):
        """
        Read from MongoDB and write local JSONL file (overwrites existing).

        Called when resuming a session to restore conversation history.
        MongoDB is treated as the source of truth.

        Args:
            session_id: The Claude session ID
            session_store: SessionStore instance for database operations
        """
        lines = await session_store.get_jsonl_lines(session_id)
        if lines:
            self.write_jsonl_file(session_id, lines)
