from contextlib import asynccontextmanager

from claude_agent_sdk import ClaudeAgentOptions, HookMatcher
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ulam.config.settings import db_config
from ulam.db.session_store import SessionStore
from ulam.hooks import validate_deck_on_write
from ulam.routes.agent_routes import router as agent_router
from ulam.routes.session_routes import init_session_store
from ulam.routes.session_routes import router as session_router
from ulam.services.agent_manager import init_agent_manager
from ulam.tools.test_tool import multiplication_server


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    # Startup
    print("Starting Ulam Agent API...")

    # Initialize MongoDB session store
    session_store = SessionStore(
        mongodb_uri=db_config.uri, database_name=db_config.database
    )
    await session_store.create_indexes()
    print("MongoDB session store initialized")

    # Initialize session store singleton
    init_session_store(session_store)

    # Initialize agent manager with Claude SDK options
    options = ClaudeAgentOptions(
        include_partial_messages=True,
        model="claude-sonnet-4-5",
        max_turns=100,
        permission_mode="bypassPermissions",
        mcp_servers={"multiplication": multiplication_server},
        hooks={"PostToolUse": [HookMatcher(hooks=[validate_deck_on_write])]},
        env={
            "MAX_THINKING_TOKENS": "4000",
        },
    )
    init_agent_manager(session_store, options)
    print("Agent manager initialized")

    yield

    # Shutdown
    print("Shutting down Ulam Agent API...")
    await session_store.close()
    print("MongoDB connection closed")


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
app.include_router(session_router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Ulam Agent API",
        "version": "1.0.0",
        "websocket": "/ws/agent",
        "sessions_api": "/api/sessions",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8088)
