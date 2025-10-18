import json
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from metropolis.services.agent_manager import get_agent_manager

router = APIRouter()


@router.websocket("/ws/agent")
async def websocket_agent_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for agent communication with session management.

    Handles session initialization, resumption, and query streaming.
    Each WebSocket connection is associated with one session.

    Protocol:
    - New session: Send query without session_id, backend captures SDK session ID
    - Resume session: Send init_session with session_id, backend restores JSONL
    - Queries: Send query messages, backend streams responses
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
                # Resume existing session
                requested_session_id = message_data.get("claude_session_id")

                if requested_session_id:
                    claude_session_id = requested_session_id
                    # Restore JSONL from MongoDB and create SDK client
                    await agent_manager.resume_session(claude_session_id)

                    # Load historical messages
                    messages = await agent_manager.session_store.get_session_messages(
                        claude_session_id
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
                    # Invalid - init_session requires session_id
                    await websocket.send_text(
                        json.dumps(
                            {
                                "type": "error",
                                "message": "init_session requires claude_session_id",
                            }
                        )
                    )

            elif message_data.get("type") == "query":
                prompt = message_data.get("content", "")
                session_id_in_message = message_data.get("session_id")

                # Check if this is the first query (no session yet)
                if not claude_session_id and not session_id_in_message:
                    # First query - create new session
                    (
                        _,
                        response_gen,
                    ) = await agent_manager.create_session_with_first_query(prompt)

                    # Stream the response
                    async for response_msg in response_gen:
                        await websocket.send_text(json.dumps(response_msg))

                        # Capture session ID when it's emitted
                        if response_msg.get("type") == "session_id_captured":
                            claude_session_id = response_msg.get("session_id")
                            # Notify frontend of the real session ID
                            await websocket.send_text(
                                json.dumps(
                                    {
                                        "type": "session_created",
                                        "session_id": claude_session_id,
                                    }
                                )
                            )

                elif claude_session_id or session_id_in_message:
                    # Subsequent query - use existing session
                    if session_id_in_message:
                        claude_session_id = session_id_in_message

                    if not claude_session_id:
                        await websocket.send_text(
                            json.dumps(
                                {"type": "error", "message": "No session initialized"}
                            )
                        )
                        continue

                    # Stream with persistence
                    async for response_msg in agent_manager.send_query_with_persistence(
                        claude_session_id, prompt, websocket
                    ):
                        await websocket.send_text(json.dumps(response_msg))
                else:
                    await websocket.send_text(
                        json.dumps(
                            {"type": "error", "message": "No session initialized"}
                        )
                    )

    except WebSocketDisconnect:
        print(f"WebSocket disconnected for session {claude_session_id}")
    except Exception as e:
        print(f"WebSocket error: {e}")
        import traceback

        traceback.print_exc()
        try:
            error_msg = json.dumps({"type": "error", "message": str(e)})
            await websocket.send_text(error_msg)
        except Exception as send_error:
            print(f"Failed to send error message: {send_error}")
    finally:
        # Persist JSONL to MongoDB when WebSocket disconnects
        if claude_session_id:
            try:
                from metropolis.services.jsonl_handler import JSONLHandler

                jsonl_handler = JSONLHandler()
                await jsonl_handler.persist_to_mongodb(
                    claude_session_id, agent_manager.session_store
                )
                print(f"Persisted JSONL for session {claude_session_id} to MongoDB")
            except Exception as e:
                print(f"Error persisting JSONL to MongoDB: {e}")


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return JSONResponse({"status": "healthy"})
