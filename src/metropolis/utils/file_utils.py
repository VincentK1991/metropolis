"""File validation and utility functions."""

import mimetypes
import os
from pathlib import Path

ALLOWED_FILE_TYPES = {
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "csv": "text/csv",
    "pdf": "application/pdf",
    "txt": "text/plain",
    "md": "text/markdown",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "html": "text/html",
}

MAX_FILE_SIZE = 16 * 1024 * 1024  # 16 MB


def get_file_extension(filename: str) -> str:
    """
    Get file extension without dot.

    Args:
        filename: The filename to extract extension from

    Returns:
        File extension in lowercase without dot
    """
    return Path(filename).suffix.lstrip(".").lower()


def validate_file_type(file_ext: str) -> bool:
    """
    Check if file type is allowed.

    Args:
        file_ext: File extension without dot

    Returns:
        True if allowed, False otherwise
    """
    return file_ext in ALLOWED_FILE_TYPES


def validate_file_size(size: int) -> bool:
    """
    Check if file size is within limit.

    Args:
        size: File size in bytes

    Returns:
        True if within limit, False otherwise
    """
    return size <= MAX_FILE_SIZE


def sanitize_filename(filename: str) -> str:
    """
    Remove path traversal and dangerous characters from filename.

    Args:
        filename: Original filename

    Returns:
        Sanitized filename
    """
    # Get just the basename (removes any path)
    name = os.path.basename(filename)

    # Remove any remaining path separators
    name = name.replace("/", "").replace("\\", "")

    # Remove null bytes
    name = name.replace("\0", "")

    # If empty after sanitization, use default
    if not name:
        name = "unnamed_file"

    return name


def get_mime_type(filename: str) -> str:
    """
    Get MIME type for filename.

    Args:
        filename: Filename to get MIME type for

    Returns:
        MIME type string
    """
    ext = get_file_extension(filename)

    # Try our known types first
    if ext in ALLOWED_FILE_TYPES:
        return ALLOWED_FILE_TYPES[ext]

    # Fallback to mimetypes module
    mime_type, _ = mimetypes.guess_type(filename)
    return mime_type or "application/octet-stream"


def format_file_size(size_bytes: int) -> str:
    """
    Format bytes to human readable size.

    Args:
        size_bytes: File size in bytes

    Returns:
        Formatted file size string (e.g., "1.5 MB")
    """
    size = float(size_bytes)
    for unit in ["B", "KB", "MB", "GB"]:
        if size < 1024.0:
            return f"{size:.1f} {unit}"
        size /= 1024.0
    return f"{size:.1f} TB"
