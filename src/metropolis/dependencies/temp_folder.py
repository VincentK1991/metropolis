"""FastAPI dependency for temp folder management."""

import shutil
import tempfile
from pathlib import Path
from typing import AsyncGenerator


class TempFolderManager:
    """Manager for temporary folder lifecycle."""

    def __init__(self):
        self.temp_path: Path | None = None

    def create_temp_folder(self) -> Path:
        """Create a temporary directory."""
        # Ensure temp_folder directory exists
        temp_folder_dir = Path("temp_folder")
        temp_folder_dir.mkdir(parents=True, exist_ok=True)

        # Create temporary directory
        temp_dir = tempfile.mkdtemp(prefix="workflow_", dir=str(temp_folder_dir))
        self.temp_path = Path(temp_dir)
        self.temp_path.chmod(0o755)
        return self.temp_path

    def cleanup(self):
        """Clean up the temporary directory."""
        if self.temp_path and self.temp_path.exists():
            shutil.rmtree(self.temp_path)
            self.temp_path = None


async def get_temp_folder() -> AsyncGenerator[Path, None]:
    """
    FastAPI dependency that provides a temp folder with automatic cleanup.

    This is a proper dependency injection pattern that:
    1. Creates temp folder when request starts
    2. Provides the path to the route handler
    3. Automatically cleans up when request ends (even on exceptions)

    Usage:
        @router.post("/endpoint")
        async def my_endpoint(temp_path: Path = Depends(get_temp_folder)):
            # Use temp_path directly
            pass
        # temp_path is automatically cleaned up
    """
    manager = TempFolderManager()
    temp_path = manager.create_temp_folder()

    try:
        yield temp_path
    finally:
        manager.cleanup()
