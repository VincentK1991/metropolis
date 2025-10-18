"""Utility for copying workflow artifacts from temp folders to permanent storage."""

import shutil
from pathlib import Path
from typing import List


def copy_artifacts_from_temp_folder(temp_path: Path, run_id: str) -> List[str]:
    """
    Copy specific artifact types from temp folder to permanent storage.

    Only copies: .pdf, .pptx, .txt, .md, .xls, .xlsx, .csv, .html files
    Structure: artifacts/{run_id}/{artifact_filename}

    Args:
        temp_path: Path to the temporary folder containing artifacts
        run_id: Unique identifier for the workflow run

    Returns:
        List of artifact file paths that were copied
    """
    # Define allowed file extensions
    allowed_extensions = {
        ".pdf",
        ".pptx",
        ".txt",
        ".md",
        ".xls",
        ".xlsx",
        ".csv",
        ".html",
    }

    # Find files with allowed extensions
    files_to_copy = []
    for file_path in temp_path.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in allowed_extensions:
            files_to_copy.append(file_path)

    # Skip copying if no matching files found
    if not files_to_copy:
        return []

    # Create the destination directory: artifacts/{run_id}/
    artifacts_folder = Path("artifacts")
    destination_dir = artifacts_folder / run_id
    destination_dir.mkdir(parents=True, exist_ok=True)

    # Copy matching files to destination
    copied_files = []
    for file_path in files_to_copy:
        try:
            dest_path = destination_dir / file_path.name
            shutil.copy2(file_path, dest_path)
            copied_files.append(str(dest_path))
        except Exception as e:
            print(f"Error copying {file_path.name}: {e}")

    return copied_files
