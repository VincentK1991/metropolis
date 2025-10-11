import json
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from ulam.services.agent_manager import get_agent_manager

router = APIRouter()


@router.websocket("/ws/agent")
async def websocket_agent_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for agent communication with session management.

    Handles session initialization, resumption, and query streaming.
    Each WebSocket connection is associated with one session.
    """
    await websocket.accept()
    agent_manager = get_agent_manager()

    claude_session_id: Optional[str] = None

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)

            if message_data.get("type") == "init_session":
                # Initialize or resume session
                requested_session_id = message_data.get("claude_session_id")

                if requested_session_id:
                    # Resume existing session
                    claude_session_id = requested_session_id
                    if claude_session_id:  # Type guard
                        await agent_manager.resume_session(claude_session_id)

                        # Load historical messages
                        messages = (
                            await agent_manager.session_store.get_session_messages(
                                claude_session_id
                            )
                        )

                        await websocket.send_text(
                            json.dumps(
                                {
                                    "type": "session_ready",
                                    "claude_session_id": claude_session_id,
                                    "messages": [
                                        msg.model_dump(mode="json") for msg in messages
                                    ],
                                },
                                default=str,
                            )
                        )
                else:
                    # Create new session
                    claude_session_id, _ = await agent_manager.create_session()

                    await websocket.send_text(
                        json.dumps(
                            {
                                "type": "session_ready",
                                "claude_session_id": claude_session_id,
                                "messages": [],
                            },
                            default=str,
                        )
                    )

            elif message_data.get("type") == "query":
                if not claude_session_id:
                    await websocket.send_text(
                        json.dumps(
                            {"type": "error", "message": "No session initialized"}
                        )
                    )
                    continue

                prompt = message_data.get("content", "")

                # Stream with persistence
                async for response_msg in agent_manager.send_query_with_persistence(
                    claude_session_id, prompt, websocket
                ):
                    await websocket.send_text(json.dumps(response_msg))

    except WebSocketDisconnect:
        print(f"WebSocket disconnected for session {claude_session_id}")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            error_msg = json.dumps({"type": "error", "message": str(e)})
            await websocket.send_text(error_msg)
        except Exception as send_error:
            print(f"Failed to send error message: {send_error}")
    finally:
        # Optionally cleanup client (or keep alive for quick reconnect)
        # For now, we keep clients alive for reconnection
        pass


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return JSONResponse({"status": "healthy"})
