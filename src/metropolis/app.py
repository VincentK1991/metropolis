from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from metropolis.config.settings import db_config
from metropolis.db.session_store import SessionStore
from metropolis.db.skill_store import SkillStore
from metropolis.db.workflow_store import WorkflowStore
from metropolis.db.workspace_store import WorkspaceStore
from metropolis.db.workspace_thread_store import WorkspaceThreadStore
from metropolis.routes.agent_routes import router as agent_router
from metropolis.routes.session_routes import init_session_store
from metropolis.routes.session_routes import router as session_router
from metropolis.routes.skill_routes import init_skill_store
from metropolis.routes.skill_routes import router as skill_router
from metropolis.routes.workflow_routes import init_workflow_store
from metropolis.routes.workflow_routes import router as workflow_router
from metropolis.routes.workspace_routes import (
    init_file_service,
    init_workspace_store,
    init_workspace_thread_store,
)
from metropolis.routes.workspace_routes import (
    init_skill_store as init_workspace_skill_store,
)
from metropolis.routes.workspace_routes import router as workspace_router
from metropolis.services.agent_manager import init_agent_manager
from metropolis.services.agent_service import main_agent_option
from metropolis.services.file_service import FileService
from metropolis.services.jsonl_handler import JSONLHandler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    # Startup
    print("Starting Metropolis Agent API...")

    # Initialize MongoDB session store
    session_store = SessionStore(
        mongodb_uri=db_config.uri, database_name=db_config.database
    )
    await session_store.create_indexes()
    print("MongoDB session store initialized")

    # Initialize session store singleton
    init_session_store(session_store)

    # Initialize MongoDB skill store
    skill_store = SkillStore(
        mongodb_uri=db_config.uri, database_name=db_config.database
    )
    await skill_store.create_indexes()
    print("MongoDB skill store initialized")

    # Initialize skill store singleton
    init_skill_store(skill_store)

    # Initialize MongoDB workflow store
    workflow_store = WorkflowStore(
        mongodb_uri=db_config.uri, database_name=db_config.database
    )
    await workflow_store.create_indexes()
    print("MongoDB workflow store initialized")

    # Initialize workflow store singleton
    init_workflow_store(workflow_store)

    # Initialize skill store for workflow routes as well
    from metropolis.routes.workflow_routes import (
        init_skill_store as init_workflow_skill_store,
    )

    init_workflow_skill_store(skill_store)

    # Initialize MongoDB workspace store
    workspace_store = WorkspaceStore(
        mongodb_uri=db_config.uri, database_name=db_config.database
    )
    await workspace_store.create_indexes()
    print("MongoDB workspace store initialized")

    # Initialize MongoDB workspace thread store
    workspace_thread_store = WorkspaceThreadStore(
        mongodb_uri=db_config.uri, database_name=db_config.database
    )
    await workspace_thread_store.create_indexes()
    print("MongoDB workspace thread store initialized")

    # Initialize workspace store singletons
    init_workspace_store(workspace_store)
    init_workspace_thread_store(workspace_thread_store)
    init_workspace_skill_store(skill_store)

    # Initialize file service
    file_service = FileService(workspace_thread_store)
    init_file_service(file_service)
    print("File service initialized")

    # Initialize JSONL handler
    jsonl_handler = JSONLHandler()
    print("JSONL handler initialized")

    init_agent_manager(session_store, main_agent_option, jsonl_handler)
    print("Agent manager initialized")

    yield

    # Shutdown
    print("Shutting down Metropolis Agent API...")
    await session_store.close()
    await skill_store.close()
    await workflow_store.close()
    await workspace_store.close()
    await workspace_thread_store.close()
    print("MongoDB connection closed")


# Create FastAPI application
app = FastAPI(
    title="Metropolis Agent API",
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
app.include_router(skill_router)
app.include_router(workflow_router)
app.include_router(workspace_router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Metropolis Agent API",
        "version": "1.0.0",
        "websocket": "/ws/agent",
        "sessions_api": "/api/sessions",
        "skills_api": "/api/skills",
        "workflows_api": "/api/workflows",
        "workflow_runs_api": "/api/workflow-runs",
        "workspaces_api": "/api/workspaces",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8088)
