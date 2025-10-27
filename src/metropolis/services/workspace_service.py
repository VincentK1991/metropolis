"""Service for workspace thread management with SSE streaming."""

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import AsyncGenerator, Optional
from uuid import uuid4

from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient

from metropolis.db.models import (
    MessageRole,
    SessionMetadata,
    Workspace,
    WorkspaceMessage,
    WorkspaceThread,
)
from metropolis.db.skill_store import SkillStore
from metropolis.db.workspace_store import WorkspaceStore
from metropolis.db.workspace_thread_store import WorkspaceThreadStore
from metropolis.dependencies.workspace_folder import get_execution_environment_folder
from metropolis.services.jsonl_handler import JSONLHandler
from metropolis.tools import skill_server
from metropolis.utils.websocket_handler import StreamHandler


class WorkspaceService:
    """Service for managing workspace threads with SSE streaming."""

    def __init__(
        self,
        workspace_store: WorkspaceStore,
        workspace_thread_store: WorkspaceThreadStore,
        skill_store: SkillStore,
    ):
        self.workspace_store = workspace_store
        self.workspace_thread_store = workspace_thread_store
        self.skill_store = skill_store
        self.stream_handler = StreamHandler()
        self.jsonl_handler = JSONLHandler()

    async def create_thread(
        self, workspace_id: str, title: Optional[str] = None
    ) -> Optional[str]:
        """
        Create a new thread (session) in a workspace.

        Args:
            workspace_id: The workspace ID
            title: Optional thread title

        Returns:
            The thread ID (claude_session_id) if successful, None otherwise
        """
        # Verify workspace exists
        workspace = await self.workspace_store.get_workspace(workspace_id)
        if not workspace:
            return None

        # Thread will be created when first message is sent
        # Return a placeholder that indicates thread creation is pending
        return "pending"

    async def get_workspace_agent_options(
        self, workspace_id: str, working_dir: Path, resume: Optional[str] = None
    ) -> Optional[ClaudeAgentOptions]:
        """
        Get Claude Agent options configured for a workspace.

        Loads all workspace skills and includes them in the system prompt.

        Args:
            workspace_id: The workspace ID
            working_dir: Working directory path for execution
            resume: Optional session ID to resume existing conversation

        Returns:
            ClaudeAgentOptions configured with workspace skills, or None if
            workspace not found
        """
        workspace: Workspace | None = await self.workspace_store.get_workspace(
            workspace_id
        )
        if not workspace:
            return None

        # Load all workspace skills
        # skills_content = []
        skills_text: str = ""
        for skill_id in workspace.skill_ids:
            skills_text += f" skill id: {skill_id}"
        skills_text = f"You have access to the following skills: {skills_text}"

        # Build options with optional resume parameter
        options_dict = {
            "include_partial_messages": True,
            "model": "claude-haiku-4-5",
            "cwd": working_dir,
            "system_prompt": {
                "type": "preset",
                "preset": "claude_code",
                "append": (
                    f"""You are working in a workspace called """
                    f""""{workspace.name}".
                    {workspace.description}

                    You have access to the following skills and capabilities:

                    {skills_text}

                    Use these skills to help the user accomplish their tasks.
                    Always work within the folder {working_dir} and do not """
                    """work outside of it.
                    """
                ),
            },
            "max_turns": 100,
            "permission_mode": "bypassPermissions",
            "mcp_servers": {"skill-server": skill_server},
            "env": {
                "MAX_THINKING_TOKENS": "4000",
            },
        }

        # Add resume parameter if provided
        if resume:
            options_dict["resume"] = resume

        options = ClaudeAgentOptions(**options_dict)

        return options

    async def chat_in_workspace(
        self,
        workspace_id: str,
        user_input: str,
        thread_id: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Send a message in a workspace thread with SSE streaming.

        Args:
            workspace_id: The workspace ID
            user_input: User's message
            thread_id: Optional existing thread ID (claude_session_id), or
                None/"pending" for new thread

        Yields:
            Server-Sent Events formatted strings
        """
        try:
            # Verify workspace exists
            workspace: Workspace | None = await self.workspace_store.get_workspace(
                workspace_id
            )
            if not workspace:
                error_event = {"type": "error", "error": "Workspace not found"}
                yield f"data: {json.dumps(error_event)}\n\n"
                return

            content_blocks = []
            start_time = datetime.now(UTC)

            # Create or resume thread
            if thread_id and thread_id != "pending":
                # Resume existing thread - look up by claude_session_id
                thread: (
                    WorkspaceThread | None
                ) = await self.workspace_thread_store.get_thread(thread_id)
                if not thread or thread.workspace_id != workspace_id:
                    error_event = {"type": "error", "error": "Thread not found"}
                    yield f"data: {json.dumps(error_event)}\n\n"
                    return

                # Get execution environment folder
                env_folder = get_execution_environment_folder(
                    thread.execution_environment
                )
                print(f"Resuming thread: {thread_id}")
                print(f"Execution environment: {thread.execution_environment}")
                print(f"Using folder: {env_folder}")

                # Restore JSONL from MongoDB for session resumption
                print(f"Restoring JSONL for thread: {thread_id}")

                # Use JSONL handler with the execution environment folder
                env_jsonl_handler = JSONLHandler(workspace_root=str(env_folder))
                await env_jsonl_handler.restore_from_mongodb(
                    thread_id, self.workspace_thread_store
                )

                # Check if JSONL was restored
                jsonl_lines: list[
                    str
                ] = await self.workspace_thread_store.get_jsonl_lines(thread_id)
                print(f"JSONL lines restored: {len(jsonl_lines)} lines")

                # Verify JSONL file exists
                jsonl_file_path = env_jsonl_handler.get_session_file_path(thread_id)
                print(f"JSONL file path: {jsonl_file_path}")
                print(f"JSONL file exists: {jsonl_file_path.exists()}")

                # Get agent options with resume parameter (resume = claude_session_id)
                options: (
                    ClaudeAgentOptions | None
                ) = await self.get_workspace_agent_options(
                    workspace_id, env_folder, resume=thread_id
                )
                if not options:
                    error_event = {
                        "type": "error",
                        "error": "Failed to configure agent",
                    }
                    yield f"data: {json.dumps(error_event)}\n\n"
                    return

                # Create SDK client with resume option
                async with ClaudeSDKClient(options=options) as client:
                    # Save user message first
                    user_seq: int = await self.workspace_thread_store.get_next_sequence(
                        thread_id
                    )
                    user_msg = WorkspaceMessage(
                        claude_session_id=thread_id,
                        sequence=user_seq,
                        role=MessageRole.USER,
                        content_blocks=[{"type": "text", "content": user_input}],
                    )
                    await self.workspace_thread_store.save_message(user_msg)
                    await self.workspace_thread_store.increment_message_count(thread_id)

                    # Send message
                    await client.query(user_input)

                    # Stream responses
                    async for message in client.receive_response():
                        messages = self.stream_handler.process_message(message)
                        for msg in messages:
                            yield f"data: {json.dumps(msg)}\n\n"

                            # Accumulate content blocks
                            if msg["type"] in ["text", "thinking"]:
                                if (
                                    content_blocks
                                    and content_blocks[-1]["type"] == msg["type"]
                                ):
                                    content_blocks[-1]["content"] += msg["content"]
                                else:
                                    content_blocks.append(
                                        {"type": msg["type"], "content": msg["content"]}
                                    )
                            elif msg["type"] in ["tool_use", "tool_result"]:
                                content_blocks.append(msg)

                    # Save assistant message
                    duration_ms = int(
                        (datetime.now(UTC) - start_time).total_seconds() * 1000
                    )
                    assistant_seq: int = (
                        await self.workspace_thread_store.get_next_sequence(thread_id)
                    )
                    assistant_msg = WorkspaceMessage(
                        claude_session_id=thread_id,
                        sequence=assistant_seq,
                        role=MessageRole.ASSISTANT,
                        content_blocks=content_blocks,
                        duration_ms=duration_ms,
                    )
                    await self.workspace_thread_store.save_message(assistant_msg)
                    await self.workspace_thread_store.increment_message_count(thread_id)

                # Persist JSONL to MongoDB after client exits (outside async with)
                print(f"Persisting JSONL for thread: {thread_id}")

                # Use JSONL handler with the execution environment folder
                env_jsonl_handler = JSONLHandler(workspace_root=str(env_folder))
                await env_jsonl_handler.persist_to_mongodb(
                    thread_id, self.workspace_thread_store
                )

                # Check what was persisted
                jsonl_lines_after: list[
                    str
                ] = await self.workspace_thread_store.get_jsonl_lines(thread_id)
                print(f"JSONL lines persisted: {len(jsonl_lines_after)} lines")

            else:
                # Create new thread - generate execution_environment FIRST
                # Execution environment is independent of claude_session_id
                execution_environment = str(uuid4())
                env_folder = get_execution_environment_folder(execution_environment)

                print("Creating new thread")
                print(f"Execution environment: {execution_environment}")
                print(f"Using folder: {env_folder}")

                # Get options without resume (new thread)
                options_new: (
                    ClaudeAgentOptions | None
                ) = await self.get_workspace_agent_options(workspace_id, env_folder)
                if not options_new:
                    error_event = {
                        "type": "error",
                        "error": "Failed to configure agent",
                    }
                    yield f"data: {json.dumps(error_event)}\n\n"
                    return

                async with ClaudeSDKClient(options=options_new) as client:
                    # Send first message
                    await client.query(user_input)

                    captured_session_id = None

                    # Stream responses
                    async for message in client.receive_response():
                        # Capture session ID using hasattr check
                        if hasattr(message, "session_id") and not captured_session_id:
                            session_id_value = message.session_id  # type: ignore
                            if session_id_value:
                                captured_session_id = session_id_value

                                print(
                                    f"Captured claude_session_id: {captured_session_id}"
                                )

                                # Create thread in database with both IDs
                                thread = WorkspaceThread(
                                    workspace_id=workspace_id,
                                    execution_environment=execution_environment,
                                    claude_session_id=captured_session_id,
                                    metadata=SessionMetadata(
                                        title=f"Thread in {workspace.name}"
                                    ),
                                )
                                await self.workspace_thread_store.create_thread(thread)

                                # Notify frontend of thread creation
                                # (use claude_session_id as thread_id)
                                thread_event = {
                                    "type": "thread_created",
                                    "thread_id": captured_session_id,
                                }
                                yield f"data: {json.dumps(thread_event)}\n\n"

                        messages = self.stream_handler.process_message(message)
                        for msg in messages:
                            yield f"data: {json.dumps(msg)}\n\n"

                            # Accumulate content blocks
                            if msg["type"] in ["text", "thinking"]:
                                if (
                                    content_blocks
                                    and content_blocks[-1]["type"] == msg["type"]
                                ):
                                    content_blocks[-1]["content"] += msg["content"]
                                else:
                                    content_blocks.append(
                                        {"type": msg["type"], "content": msg["content"]}
                                    )
                            elif msg["type"] in ["tool_use", "tool_result"]:
                                content_blocks.append(msg)

                    # Save messages to database if we have a session
                    if captured_session_id:
                        # Save user message
                        user_msg = WorkspaceMessage(
                            claude_session_id=captured_session_id,
                            sequence=0,
                            role=MessageRole.USER,
                            content_blocks=[{"type": "text", "content": user_input}],
                        )
                        await self.workspace_thread_store.save_message(user_msg)

                        # Save assistant message
                        duration_ms = int(
                            (datetime.now(UTC) - start_time).total_seconds() * 1000
                        )
                        assistant_msg = WorkspaceMessage(
                            claude_session_id=captured_session_id,
                            sequence=1,
                            role=MessageRole.ASSISTANT,
                            content_blocks=content_blocks,
                            duration_ms=duration_ms,
                        )
                        await self.workspace_thread_store.save_message(assistant_msg)

                        # Update message count (2 messages: user + assistant)
                        await self.workspace_thread_store.update_thread(
                            captured_session_id, {"message_count": 2}
                        )

                # Persist JSONL to MongoDB after client exits
                if captured_session_id:
                    print(f"Persisting JSONL for new thread: {captured_session_id}")

                    # Use JSONL handler with execution environment folder
                    env_jsonl_handler = JSONLHandler(workspace_root=str(env_folder))

                    # Check if JSONL file exists
                    jsonl_file_path = env_jsonl_handler.get_session_file_path(
                        captured_session_id
                    )
                    print(f"JSONL file path: {jsonl_file_path}")
                    print(f"JSONL file exists: {jsonl_file_path.exists()}")

                    # Persist to MongoDB
                    await env_jsonl_handler.persist_to_mongodb(
                        captured_session_id, self.workspace_thread_store
                    )

                    # Verify what was saved
                    jsonl_lines_new: list[
                        str
                    ] = await self.workspace_thread_store.get_jsonl_lines(
                        captured_session_id
                    )
                    print(
                        f"JSONL lines persisted to MongoDB: "
                        f"{len(jsonl_lines_new)} lines"
                    )

            # Send completion event
            completion_event = {"type": "complete"}
            yield f"data: {json.dumps(completion_event)}\n\n"

        except Exception as e:
            import traceback

            error_msg = str(e)
            traceback_msg = traceback.format_exc()

            # Print to console for debugging
            print(f"Error in chat_in_workspace: {error_msg}")
            print(f"Traceback:\n{traceback_msg}")

            # Stream error to frontend
            error_event = {"type": "error", "error": error_msg}
            yield f"data: {json.dumps(error_event)}\n\n"
