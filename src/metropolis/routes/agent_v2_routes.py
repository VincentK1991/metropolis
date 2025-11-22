"""Agent v2 routes for containerized agent integration."""

import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from metropolis.db.containerized_agent_store import ContainerizedAgentStore
from metropolis.services.containerized_agent_service import ContainerizedAgentService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/agent", tags=["agent v2"])

# Global service instance (will be initialized in app.py)
_agent_service: Optional[ContainerizedAgentService] = None
_store: Optional[ContainerizedAgentStore] = None


def init_agent_service(
    service: ContainerizedAgentService, store: ContainerizedAgentStore
):
    """Initialize the agent service singleton."""
    global _agent_service, _store
    _agent_service = service
    _store = store


def get_agent_service() -> ContainerizedAgentService:
    """Get the agent service instance."""
    if _agent_service is None:
        raise RuntimeError("Agent service not initialized")
    return _agent_service


def get_store() -> ContainerizedAgentStore:
    """Get the store instance."""
    if _store is None:
        raise RuntimeError("Store not initialized")
    return _store


class QueryRequest(BaseModel):
    """Request model for query endpoint."""

    user_input: str
    session_id: Optional[str] = None


class RenameSessionRequest(BaseModel):
    """Request model for renaming a session."""

    title: str


@router.post("/query")
async def query(request: QueryRequest):
    """
    Execute a query with optional session resumption.

    Args:
        request: Query request with user_input and optional session_id

    Returns:
        StreamingResponse with Server-Sent Events
    """
    logger.info(
        f"Query endpoint accessed - session_id: {request.session_id or 'new'}, "
        f"user_input length: {len(request.user_input)}"
    )

    agent_service = get_agent_service()

    # Stream query results
    async def generate():
        try:
            query_gen = agent_service.query(request.user_input, request.session_id)
            async for event in query_gen:
                yield event
            logger.info("Query completed")
        except Exception as e:
            logger.error(f"Error during query streaming: {str(e)}", exc_info=True)
            error_event = {"type": "error", "error": str(e)}
            yield f"data: {json.dumps(error_event)}\n\n"

    logger.info("Starting query stream")
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )


@router.get("/sessions")
async def list_sessions(
    limit: int = Query(20, ge=1, le=100), skip: int = Query(0, ge=0)
):
    """
    List containerized agent sessions.

    Args:
        limit: Maximum number of sessions to return
        skip: Number of sessions to skip (for pagination)

    Returns:
        Paginated list of sessions with metadata
    """
    store = get_store()
    sessions = await store.list_sessions(limit=limit, skip=skip)
    total = await store.get_total_session_count()
    return {
        "sessions": [session.model_dump(by_alias=True) for session in sessions],
        "total": total,
        "limit": limit,
        "skip": skip,
    }


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """
    Get session details.

    Args:
        session_id: The session ID

    Returns:
        Session details
    """
    store = get_store()
    session = await store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session.model_dump(by_alias=True)


@router.get("/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    limit: int = Query(50, ge=1, le=500),
    skip: int = Query(0, ge=0),
    reverse: bool = Query(False, description="If True, return newest messages first"),
):
    """
    Get messages for a session with pagination.

    Args:
        session_id: The session ID
        limit: Maximum number of messages to return
        skip: Number of messages to skip (for pagination)
        reverse: If True, return newest messages first (for loading recent messages)

    Returns:
        Paginated list of messages with metadata
    """
    store = get_store()
    # Verify session exists
    session = await store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = await store.get_session_messages(
        session_id, limit=limit, skip=skip, reverse=reverse
    )
    total = await store.get_session_message_count(session_id)
    return {
        "messages": [message.model_dump(by_alias=True) for message in messages],
        "total": total,
        "limit": limit,
        "skip": skip,
    }


@router.patch("/sessions/{session_id}/rename")
async def rename_session(session_id: str, request: RenameSessionRequest):
    """
    Rename a session by updating its title.

    Args:
        session_id: The session ID
        request: Rename request with new title

    Returns:
        Updated session details
    """
    store = get_store()
    session = await store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Update session title
    updated = await store.update_session(session_id, {"metadata.title": request.title})
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update session")

    # Return updated session
    updated_session = await store.get_session(session_id)
    if not updated_session:
        raise HTTPException(
            status_code=500, detail="Failed to retrieve updated session"
        )
    return updated_session.model_dump(by_alias=True)


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """
    Delete a session and all its messages.

    Args:
        session_id: The session ID

    Returns:
        Deletion confirmation
    """
    store = get_store()
    deleted = await store.delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session deleted successfully"}
