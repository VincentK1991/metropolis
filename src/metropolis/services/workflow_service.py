"""Service for executing workflows using Claude Agent SDK."""

import json
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import AsyncGenerator

from claude_agent_sdk import ClaudeSDKClient

from metropolis.db.models import WorkflowRun
from metropolis.db.skill_store import SkillStore
from metropolis.db.workflow_store import WorkflowStore
from metropolis.services.agent_service import get_workflow_agent_option
from metropolis.utils.artifact_handler import copy_artifacts_from_temp_folder
from metropolis.utils.websocket_handler import StreamHandler


class WorkflowService:
    """Service for executing workflows with streaming results."""

    def __init__(self, skill_store: SkillStore, workflow_store: WorkflowStore):
        self.skill_store = skill_store
        self.workflow_store = workflow_store
        self.stream_handler = StreamHandler()

    async def execute_workflow(
        self, skill_id: str, user_input: str, temp_path: Path
    ) -> AsyncGenerator[str, None]:
        """
        Execute a workflow and stream the results.

        Args:
            skill_id: ID of the skill to execute as workflow
            user_input: User's natural language input
            temp_path: Temporary folder path for execution

        Yields:
            Server-Sent Events formatted strings
        """
        # Generate run ID and create workflow run record
        run_id = str(uuid.uuid4())
        workflow_run = WorkflowRun(
            skill_id=skill_id,
            user_input=user_input,
            status="running",
        )

        try:
            # Create workflow run in database
            created_run = await self.workflow_store.create_workflow_run(workflow_run)
            run_id = created_run.id

            # Send initial event with run_id
            start_event = {"type": "start", "run_id": run_id}
            yield f"data: {json.dumps(start_event)}\n\n"

            # Verify skill exists
            skill = await self.skill_store.get_skill(skill_id)
            if not skill:
                error_msg = f"Skill with ID '{skill_id}' not found"
                error_event = {"type": "error", "error": error_msg}
                yield f"data: {json.dumps(error_event)}\n\n"
                await self.workflow_store.update_workflow_run(
                    run_id,
                    {
                        "status": "failed",
                        "execution_log": [
                            {
                                "type": "error",
                                "content": error_msg,
                                "timestamp": datetime.now(UTC).isoformat(),
                            }
                        ],
                    },
                )
                return

            # Configure Claude Agent options
            options = get_workflow_agent_option(skill_id, temp_path)

            execution_log = []
            content_blocks = []

            # Execute workflow with Claude Agent SDK
            async with ClaudeSDKClient(options=options) as client:
                # Send query with skill_id to prime the agent
                query = f"{user_input}\n\nskill_id = {skill_id}"
                await client.query(query)

                # Stream responses
                async for message in client.receive_response():
                    # Convert message to stream format for SSE
                    ws_messages = self.stream_handler.process_message(message)

                    for ws_message in ws_messages:
                        # Stream to frontend (keep real-time streaming)
                        yield f"data: {json.dumps(ws_message)}\n\n"

                        # Accumulate chunks using the same logic as agent_manager
                        if ws_message["type"] in ["text", "thinking"]:
                            # Append to last block of same type, or create new
                            if (
                                content_blocks
                                and content_blocks[-1]["type"] == ws_message["type"]
                            ):
                                content_blocks[-1]["content"] += ws_message["content"]
                            else:
                                content_blocks.append(
                                    {
                                        "type": ws_message["type"],
                                        "content": ws_message["content"],
                                    }
                                )
                        elif ws_message["type"] in ["tool_use", "tool_result"]:
                            # Add as new block (complete tool messages)
                            content_blocks.append(ws_message)

                # Set execution log to complete content blocks
                execution_log = content_blocks

            # Copy artifacts after execution completes
            artifact_paths = copy_artifacts_from_temp_folder(temp_path, run_id)

            # Update workflow run with completion
            await self.workflow_store.update_workflow_run(
                run_id,
                {
                    "status": "completed",
                    "artifact_paths": artifact_paths,
                    "execution_log": execution_log,
                },
            )

            # Send completion event
            completion_data = {
                "type": "complete",
                "run_id": run_id,
                "artifact_paths": artifact_paths,
            }
            yield f"data: {json.dumps(completion_data)}\n\n"

        except Exception as e:
            error_msg = str(e)

            # Update workflow run with error
            error_log = [
                {
                    "type": "error",
                    "content": error_msg,
                    "timestamp": datetime.now(UTC).isoformat(),
                }
            ]
            await self.workflow_store.update_workflow_run(
                run_id,
                {
                    "status": "failed",
                    "execution_log": execution_log + error_log
                    if "execution_log" in locals()
                    else error_log,
                },
            )

            # Send error event
            error_event = {"type": "error", "error": error_msg}
            yield f"data: {json.dumps(error_event)}\n\n"
