"""Pydantic models for request and response validation."""

from typing import List, Optional

from pydantic import BaseModel


class QueryRequest(BaseModel):
    """Request model for query endpoint."""

    user_input: str
    session_id: Optional[str] = None


class RenameRequest(BaseModel):
    """Request model for rename endpoint."""

    old_path: str
    new_path: str


class CreateDirectoryRequest(BaseModel):
    """Request model for create directory endpoint."""

    path: str


class FileInfo(BaseModel):
    """File or directory information model."""

    name: str
    path: str
    absolute_path: str
    type: str
    size: Optional[int] = None
    modified: float
    created: Optional[float] = None


class DirectoryListing(BaseModel):
    """Directory listing response model."""

    path: str
    absolute_path: str
    items: List[dict]
