import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from metropolis.config.settings import db_config
from metropolis.db.containerized_agent_store import ContainerizedAgentStore
from metropolis.db.session_store import SessionStore
from metropolis.db.skill_store import SkillStore
from metropolis.db.workflow_store import WorkflowStore
from metropolis.db.workspace_store import WorkspaceStore
from metropolis.db.workspace_thread_store import WorkspaceThreadStore
from metropolis.routes.agent_routes import router as agent_router
from metropolis.routes.agent_v2_file_routes import (
    init_file_service as init_v2_file_service,
)
from metropolis.routes.agent_v2_file_routes import router as agent_v2_file_router
from metropolis.routes.agent_v2_routes import (
    init_agent_service as init_v2_agent_service,
)
from metropolis.routes.agent_v2_routes import router as agent_v2_router
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
from metropolis.services.containerized_agent_service import ContainerizedAgentService
from metropolis.services.containerized_file_service import ContainerizedFileService
from metropolis.services.file_service import FileService
from metropolis.services.jsonl_handler import JSONLHandler
from metropolis.services.k8s_pod_manager import PodManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    # Startup
    logger.info("Starting Metropolis Agent API...")

    # Initialize MongoDB session store
    session_store = SessionStore(
        mongodb_uri=db_config.uri, database_name=db_config.database
    )
    await session_store.create_indexes()
    logger.info("MongoDB session store initialized")

    # Initialize session store singleton
    init_session_store(session_store)

    # Initialize MongoDB skill store
    skill_store = SkillStore(
        mongodb_uri=db_config.uri, database_name=db_config.database
    )
    await skill_store.create_indexes()
    logger.info("MongoDB skill store initialized")

    # Initialize skill store singleton
    init_skill_store(skill_store)

    # Initialize MongoDB workflow store
    workflow_store = WorkflowStore(
        mongodb_uri=db_config.uri, database_name=db_config.database
    )
    await workflow_store.create_indexes()
    logger.info("MongoDB workflow store initialized")

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
    logger.info("MongoDB workspace store initialized")

    # Initialize MongoDB workspace thread store
    workspace_thread_store = WorkspaceThreadStore(
        mongodb_uri=db_config.uri, database_name=db_config.database
    )
    await workspace_thread_store.create_indexes()
    logger.info("MongoDB workspace thread store initialized")

    # Initialize workspace store singletons
    init_workspace_store(workspace_store)
    init_workspace_thread_store(workspace_thread_store)
    init_workspace_skill_store(skill_store)

    # Initialize file service
    file_service = FileService(workspace_thread_store)
    init_file_service(file_service)
    logger.info("File service initialized")

    # Initialize JSONL handler
    jsonl_handler = JSONLHandler()
    logger.info("JSONL handler initialized")

    init_agent_manager(session_store, main_agent_option, jsonl_handler)
    logger.info("Agent manager initialized")

    # Initialize MongoDB containerized agent store
    containerized_agent_store = ContainerizedAgentStore(
        mongodb_uri=db_config.uri, database_name=db_config.database
    )
    await containerized_agent_store.create_indexes()
    logger.info("MongoDB containerized agent store initialized")

    # Initialize PodManager for Kubernetes pod lifecycle management
    pod_manager = PodManager()
    try:
        await pod_manager.initialize()
        logger.info("PodManager initialized")
    except Exception as e:
        logger.warning(f"Failed to initialize PodManager: {e}")
        logger.info("Containerized agent will use static URL configuration")
        pod_manager = None

    # Initialize containerized agent service
    containerized_agent_service = ContainerizedAgentService(
        containerized_agent_store, pod_manager=pod_manager
    )
    init_v2_agent_service(containerized_agent_service, containerized_agent_store)
    logger.info("Containerized agent service initialized")

    # Initialize containerized file service
    containerized_file_service = ContainerizedFileService()
    init_v2_file_service(containerized_file_service)
    logger.info("Containerized file service initialized")

    # Start background task for pod cleanup
    cleanup_task = None
    if pod_manager:

        async def cleanup_loop():
            """Background task to periodically clean up idle pods."""
            while True:
                try:
                    await asyncio.sleep(60)  # Run every minute
                    await pod_manager.cleanup_idle_pods()
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Error in pod cleanup loop: {e}", exc_info=True)

        cleanup_task = asyncio.create_task(cleanup_loop())
        logger.info("Pod cleanup background task started")

    yield

    # Shutdown
    logger.info("Shutting down Metropolis Agent API...")

    # Cancel cleanup task if running
    if cleanup_task:
        cleanup_task.cancel()
        try:
            await cleanup_task
        except asyncio.CancelledError:
            pass
        logger.info("Pod cleanup task stopped")

    # Close PodManager
    if pod_manager:
        await pod_manager.close()
        logger.info("PodManager closed")

    await session_store.close()
    await skill_store.close()
    await workflow_store.close()
    await workspace_store.close()
    await workspace_thread_store.close()
    await containerized_agent_store.close()
    logger.info("MongoDB connection closed")


# Create FastAPI application
app = FastAPI(
    title="Metropolis Agent API",
    description="WebSocket API for Claude Agent SDK",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
# Get allowed origins from environment variable, with defaults for development
cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env:
    # Split comma-separated list and strip whitespace
    allow_origins = [
        origin.strip() for origin in cors_origins_env.split(",") if origin.strip()
    ]
else:
    # Default development origins
    allow_origins = [
        "http://localhost:3000",
        "http://localhost:5173",  # Vite default port
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
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
app.include_router(agent_v2_router)
app.include_router(agent_v2_file_router)


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
        "agent_v2_api": "/api/v2/agent",
        "agent_v2_files_api": "/api/v2/agent/files",
    }


if __name__ == "__main__":
    import uvicorn

    # Binding to 0.0.0.0 is intentional for server to accept external connections
    uvicorn.run(app, host="0.0.0.0", port=8088)  # pyright: ignore[reportGeneralTypeIssues]
