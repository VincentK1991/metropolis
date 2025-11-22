"""Agent-related routes."""

import logging
import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from containerized_agent.models import QueryRequest
from containerized_agent.services.agent_service import AgentService

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize agent service
agent_service = AgentService()


@router.get("/")
async def root():
    """Root endpoint."""
    logger.info("Root endpoint accessed")
    return {
        "message": "Containerized Claude Agent API",
        "version": "0.1.0",
        "endpoints": {
            "ping": "/ping",
            "query": "/query",
            "files": {
                "list": "GET /files/list?path=",
                "upload": "POST /files/upload",
                "download": "GET /files/download?path=",
                "delete": "DELETE /files/delete?path=",
                "rename": "POST /files/rename",
                "mkdir": "POST /files/mkdir",
            },
        },
    }


@router.get("/ping")
async def ping():
    """Health check endpoint to verify the API is live."""
    logger.info("Ping endpoint accessed")
    return {"status": "ok", "message": "pong"}


@router.post("/query")
async def query(request: QueryRequest):
    """Execute a query with optional session resumption.

    Args:
        request: Query request with user_input and optional session_id

    Returns:
        StreamingResponse with Server-Sent Events
    """
    session_info = request.session_id or "new"
    logger.info(
        f"Query endpoint accessed - session_id: {session_info}, "
        f"user_input length: {len(request.user_input)}"
    )

    # Verify API key is set
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY environment variable is not set")
        raise HTTPException(
            status_code=500,
            detail="ANTHROPIC_API_KEY environment variable is not set",
        )

    # Stream query results
    async def generate():
        try:
            event_count = 0
            query_gen = agent_service.query(request.user_input, request.session_id)
            async for event in query_gen:
                event_count += 1
                yield event
            logger.info(f"Query completed - total events streamed: {event_count}")
        except Exception as e:
            logger.error(f"Error during query streaming: {str(e)}", exc_info=True)
            raise

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
