"""REST API endpoints for session management."""

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException

from ulam.db.models import SessionMetadata
from ulam.db.session_store import SessionStore

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

# Global session store instance
_session_store: SessionStore | None = None


def get_session_store() -> SessionStore:
    """Get the global session store instance."""
    global _session_store
    if _session_store is None:
        raise RuntimeError(
            "SessionStore not initialized. Call init_session_store first."
        )
    return _session_store


def init_session_store(session_store: SessionStore):
    """Initialize the global session store instance."""
    global _session_store
    _session_store = session_store


@router.get("/")
async def list_sessions(limit: int = 20, skip: int = 0):
    """
    List recent sessions with metadata.

    Args:
        limit: Maximum number of sessions to return (default: 20)
        skip: Number of sessions to skip for pagination (default: 0)

    Returns:
        Dictionary with sessions list
    """
    session_store = get_session_store()
    sessions = await session_store.list_sessions(limit=limit, skip=skip)
    return {"sessions": [s.model_dump() for s in sessions]}


@router.get("/{claude_session_id}")
async def get_session_detail(claude_session_id: str):
    """
    Get session metadata and all messages.

    Args:
        claude_session_id: The Claude Agent SDK session ID

    Returns:
        Dictionary with session and messages

    Raises:
        HTTPException: 404 if session not found
    """
    session_store = get_session_store()
    session = await session_store.get_session(claude_session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = await session_store.get_session_messages(claude_session_id)

    return {
        "session": session.model_dump(),
        "messages": [m.model_dump() for m in messages],
    }


@router.delete("/{claude_session_id}")
async def delete_session(claude_session_id: str):
    """
    Delete a session and all its messages.

    Args:
        claude_session_id: The Claude Agent SDK session ID

    Returns:
        Success status

    Raises:
        HTTPException: 404 if session not found
    """
    session_store = get_session_store()
    success = await session_store.delete_session(claude_session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True}


@router.patch("/{claude_session_id}/metadata")
async def update_session_metadata(claude_session_id: str, metadata: SessionMetadata):
    """
    Update session title, tags, etc.

    Args:
        claude_session_id: The Claude Agent SDK session ID
        metadata: New metadata to set

    Returns:
        Success status

    Raises:
        HTTPException: 404 if session not found
    """
    session_store = get_session_store()
    success = await session_store.update_session(
        claude_session_id,
        {"metadata": metadata.model_dump(), "updated_at": datetime.now(UTC)},
    )
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"success": True}
