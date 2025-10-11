import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from ulam.services.agent_service import get_agent_service

router = APIRouter()


@router.websocket("/ws/agent")
async def websocket_agent_endpoint(websocket: WebSocket):
    """WebSocket endpoint for agent communication.

    Receives user messages and streams back agent responses.
    """
    await websocket.accept()
    agent_service = get_agent_service()

    try:
        # Initialize agent service if not already initialized
        await agent_service.initialize()

        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)

            if message_data.get("type") == "query":
                prompt = message_data.get("content", "")

                # Stream responses back to client
                async for response_msg in agent_service.send_query_stream(
                    prompt, websocket
                ):
                    await websocket.send_text(json.dumps(response_msg))

    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
        except:
            pass
    finally:
        # Note: We don't cleanup the agent service here to maintain conversation context
        # The service will be cleaned up on application shutdown
        pass


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return JSONResponse({"status": "healthy"})
