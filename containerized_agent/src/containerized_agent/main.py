"""FastAPI application for containerized Claude Agent SDK."""

import logging
import os
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from containerized_agent.agent_service import AgentService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Containerized Claude Agent API",
    description="Sandbox execution environment for Claude Agent SDK",
    version="0.1.0",
)

# Configure CORS - allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize agent service
agent_service = AgentService()


class QueryRequest(BaseModel):
    """Request model for query endpoint."""

    user_input: str
    session_id: Optional[str] = None


@app.get("/")
async def root():
    """Root endpoint."""
    logger.info("Root endpoint accessed")
    return {
        "message": "Containerized Claude Agent API",
        "version": "0.1.0",
        "endpoints": {
            "ping": "/ping",
            "query": "/query",
        },
    }


@app.get("/ping")
async def ping():
    """Health check endpoint to verify the API is live."""
    logger.info("Ping endpoint accessed")
    return {"status": "ok", "message": "pong"}


@app.post("/query")
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


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8089"))
    logger.info(f"Starting server on 0.0.0.0:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
