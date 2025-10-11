from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ulam.routes.agent_routes import router as agent_router
from ulam.services.agent_service import get_agent_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    # Startup
    agent_service = get_agent_service()
    await agent_service.initialize()
    print("Agent service initialized")
    yield
    # Shutdown
    await agent_service.cleanup()
    print("Agent service cleaned up")


# Create FastAPI application
app = FastAPI(
    title="Ulam Agent API",
    description="WebSocket API for Claude Agent SDK",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",  # Vite default port
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(agent_router, tags=["agent"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Ulam Agent API",
        "version": "1.0.0",
        "websocket": "/ws/agent",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8088)

