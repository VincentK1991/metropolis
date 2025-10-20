"""Multi-session agent manager for Claude Agent SDK."""

from datetime import UTC, datetime
from typing import AsyncGenerator, Dict, Optional

from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient, ResultMessage
from fastapi import WebSocket

from metropolis.db.models import ClaudeAgentMessage, ClaudeAgentSession, MessageRole
from metropolis.db.session_store import SessionStore
from metropolis.services.jsonl_handler import JSONLHandler
from metropolis.utils.websocket_handler import WebSocketStreamHandler


class AgentManager:
    """
    Manages multiple Claude SDK clients (one per session).

    Handles session creation, resumption, and message persistence.
    Accumulates streaming chunks in memory and saves complete messages.
    """

    def __init__(
        self,
        session_store: SessionStore,
        options: ClaudeAgentOptions,
        jsonl_handler: JSONLHandler,
    ):
        """
        Initialize the agent manager.

        Args:
            session_store: SessionStore instance for database operations
            options: ClaudeAgentOptions for creating SDK clients
            jsonl_handler: JSONLHandler instance for managing JSONL files
        """
        self.clients: Dict[str, ClaudeSDKClient] = {}  # claude_session_id -> client
        self.session_store = session_store
        self.options = options
        self.jsonl_handler = jsonl_handler
        # Accumulator for streaming chunks (session_id -> content_blocks)
        self.streaming_buffers: Dict[str, list[dict]] = {}

    def extract_session_id_from_message(self, message) -> Optional[str]:
        """
        Extract session ID from a Claude SDK message.

        The SDK includes sessionId in certain message types.

        Args:
            message: Message from Claude SDK

        Returns:
            Session ID if found, None otherwise
        """
        # Check if message has sessionId attribute directly
        if hasattr(message, "session_id"):
            return message.session_id

        # Check for sessionId in message dict representation
        if isinstance(message, dict) and "sessionId" in message:
            return message["sessionId"]

        return None

    async def create_session_with_first_query(
        self, prompt: str
    ) -> tuple[str, AsyncGenerator[dict, None]]:
        """
        Create a new SDK client with the user's first query and capture real session ID.

        The SDK generates a UUID session ID when processing the first query.
        This method sends the query and extracts the session ID from the response.

        Args:
            prompt: User's first message

        Returns:
            Tuple of (session_id, response_generator) where response_generator
            yields JSON messages for streaming to frontend

        Raises:
            Exception: If session ID cannot be captured
        """
        # Create new client
        client = ClaudeSDKClient(options=self.options)
        await client.__aenter__()

        # Send the first query
        await client.query(prompt)

        # We need to peek at the response to get the session ID
        # The SDK writes session info to the JSONL file
        # We'll need to read the JSONL file after the first message
        async def response_generator():
            handler = WebSocketStreamHandler()
            content_blocks = []
            start_time = datetime.now(UTC)
            cost_usd: Optional[float] = None
            input_tokens: Optional[int] = None
            output_tokens: Optional[int] = None
            session_id_captured: Optional[str] = None

            async for message in client.receive_response():
                # Try to extract session ID from message
                if session_id_captured is None:
                    session_id_captured = self.extract_session_id_from_message(message)

                # Extract usage information
                if isinstance(message, ResultMessage):
                    if hasattr(message, "total_cost_usd"):
                        cost_usd = message.total_cost_usd  # type: ignore
                    if hasattr(message, "usage"):
                        input_tokens = message.usage["input_tokens"]  # type: ignore
                        output_tokens = message.usage["output_tokens"]  # type: ignore

                # Process and yield chunks
                json_messages = handler.process_message(message)
                for json_msg in json_messages:
                    yield json_msg

                    # Accumulate chunks
                    if json_msg["type"] in ["text", "thinking"]:
                        if (
                            content_blocks
                            and content_blocks[-1]["type"] == json_msg["type"]
                        ):
                            content_blocks[-1]["content"] += json_msg["content"]
                        else:
                            content_blocks.append(
                                {
                                    "type": json_msg["type"],
                                    "content": json_msg["content"],
                                }
                            )
                    elif json_msg["type"] in ["tool_use", "tool_result"]:
                        content_blocks.append(json_msg)

            # After streaming completes, read JSONL file to get session ID
            # The SDK writes session info to the JSONL file
            if session_id_captured is None:
                # Read the JSONL files in the project directory
                # to find the newest session
                import os

                project_path = self.jsonl_handler.get_project_path()
                if project_path.exists():
                    jsonl_files = list(project_path.glob("*.jsonl"))
                    if jsonl_files:
                        # Get the most recently modified file
                        newest_file = max(jsonl_files, key=os.path.getmtime)
                        session_id_captured = newest_file.stem

            if not session_id_captured:
                raise Exception("Could not capture session ID from Claude SDK")

            # Store session in MongoDB
            session = ClaudeAgentSession(claude_session_id=session_id_captured)
            await self.session_store.create_session(session)

            # Save user message
            user_seq = 0
            user_msg = ClaudeAgentMessage(
                session_id=session_id_captured,
                sequence=user_seq,
                role=MessageRole.USER,
                content_blocks=[{"type": "text", "content": prompt}],
            )
            await self.session_store.save_message(user_msg)
            await self.session_store.increment_message_count(session_id_captured)

            # Save assistant message
            duration_ms = int((datetime.now(UTC) - start_time).total_seconds() * 1000)
            assistant_seq = 1
            assistant_msg = ClaudeAgentMessage(
                session_id=session_id_captured,
                sequence=assistant_seq,
                role=MessageRole.ASSISTANT,
                content_blocks=content_blocks,
                duration_ms=duration_ms,
                cost_usd=cost_usd,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
            )
            await self.session_store.save_message(assistant_msg)
            await self.session_store.increment_message_count(session_id_captured)

            # Update session usage
            if (
                cost_usd is not None
                or input_tokens is not None
                or output_tokens is not None
            ):
                await self.session_store.update_session_usage(
                    session_id_captured,
                    cost_usd=cost_usd or 0.0,
                    input_tokens=input_tokens or 0,
                    output_tokens=output_tokens or 0,
                )

            # Cache client
            self.clients[session_id_captured] = client
            self.streaming_buffers[session_id_captured] = []

            # Signal session created
            yield {"type": "session_id_captured", "session_id": session_id_captured}

            # Send complete signal
            yield {"type": "complete"}

        # We need to determine the session ID first before returning
        # Let's modify to return a special generator that yields session_id first
        return ("pending", response_generator())

    async def resume_session(self, claude_session_id: str) -> ClaudeSDKClient:
        """
        Resume an existing session using SDK's resume option.

        Restores JSONL file from MongoDB before creating SDK client.
        MongoDB is treated as the source of truth for conversation history.

        Args:
            claude_session_id: The Claude session ID to resume

        Returns:
            The Claude SDK client for this session
        """
        # Check if already cached
        if claude_session_id in self.clients:
            return self.clients[claude_session_id]

        # Restore JSONL file from MongoDB (overwrites local file)
        await self.jsonl_handler.restore_from_mongodb(
            claude_session_id, self.session_store
        )

        # Create new client with resume option
        resume_options = ClaudeAgentOptions(
            **{**self.options.__dict__, "resume": claude_session_id}
        )
        client = ClaudeSDKClient(options=resume_options)
        await client.__aenter__()

        # Cache it
        self.clients[claude_session_id] = client
        self.streaming_buffers[claude_session_id] = []

        return client

    async def send_query_with_persistence(
        self, claude_session_id: str, prompt: str, websocket: WebSocket
    ) -> AsyncGenerator[dict, None]:
        """
        Send query and persist complete messages.

        Handles chunk accumulation during streaming (matching frontend behavior).

        Args:
            claude_session_id: The Claude session ID
            prompt: User's prompt text
            websocket: WebSocket connection for streaming

        Yields:
            JSON messages to send via WebSocket
        """
        client = self.clients.get(claude_session_id)
        if not client:
            raise Exception(f"No client found for session {claude_session_id}")

        # Save user message
        user_seq = await self.session_store.get_next_sequence(claude_session_id)
        user_msg = ClaudeAgentMessage(
            session_id=claude_session_id,
            sequence=user_seq,
            role=MessageRole.USER,
            content_blocks=[{"type": "text", "content": prompt}],
        )
        await self.session_store.save_message(user_msg)
        await self.session_store.increment_message_count(claude_session_id)

        # Send query (client maintains context internally)
        await client.query(prompt)

        # Stream response and accumulate chunks
        handler = WebSocketStreamHandler()
        content_blocks = []
        start_time = datetime.now(UTC)

        # Usage tracking
        cost_usd: Optional[float] = None
        input_tokens: Optional[int] = None
        output_tokens: Optional[int] = None

        async for message in client.receive_response():
            # Check if this is a ResultMessage with usage stats
            if isinstance(message, ResultMessage):
                # Extract usage information
                if hasattr(message, "total_cost_usd"):
                    cost_usd = message.total_cost_usd  # type: ignore
                if hasattr(message, "usage"):
                    input_tokens = message.usage["input_tokens"]  # type: ignore
                if hasattr(message, "usage"):
                    output_tokens = message.usage["output_tokens"]  # type: ignore

                # print(
                #     f"Usage: cost=${cost_usd}, "
                #     f"input={input_tokens}, output={output_tokens}"
                # )

            # Process and yield chunks to frontend
            json_messages = handler.process_message(message)
            for json_msg in json_messages:
                yield json_msg

                # Accumulate chunks (same logic as frontend)
                if json_msg["type"] in ["text", "thinking"]:
                    # Append to last block of same type, or create new
                    if (
                        content_blocks
                        and content_blocks[-1]["type"] == json_msg["type"]
                    ):
                        content_blocks[-1]["content"] += json_msg["content"]
                    else:
                        content_blocks.append(
                            {"type": json_msg["type"], "content": json_msg["content"]}
                        )
                elif json_msg["type"] in ["tool_use", "tool_result"]:
                    # Add as new block
                    content_blocks.append(json_msg)

        # Save complete assistant message with usage stats
        duration_ms = int((datetime.now(UTC) - start_time).total_seconds() * 1000)
        assistant_seq = await self.session_store.get_next_sequence(claude_session_id)
        assistant_msg = ClaudeAgentMessage(
            session_id=claude_session_id,
            sequence=assistant_seq,
            role=MessageRole.ASSISTANT,
            content_blocks=content_blocks,
            duration_ms=duration_ms,
            cost_usd=cost_usd,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        )
        await self.session_store.save_message(assistant_msg)
        await self.session_store.increment_message_count(claude_session_id)

        # Update session cumulative usage
        if (
            cost_usd is not None
            or input_tokens is not None
            or output_tokens is not None
        ):
            await self.session_store.update_session_usage(
                claude_session_id,
                cost_usd=cost_usd or 0.0,
                input_tokens=input_tokens or 0,
                output_tokens=output_tokens or 0,
            )

        # Send complete signal
        yield {"type": "complete"}

    async def cleanup_client(self, claude_session_id: str):
        """
        Clean up a client after session ends.

        Args:
            claude_session_id: The Claude session ID
        """
        if claude_session_id in self.clients:
            client = self.clients.pop(claude_session_id)
            await client.__aexit__(None, None, None)
        if claude_session_id in self.streaming_buffers:
            del self.streaming_buffers[claude_session_id]

    async def cleanup_all(self):
        """Clean up all active clients."""
        for claude_session_id in list(self.clients.keys()):
            await self.cleanup_client(claude_session_id)


# Global instance
_agent_manager: Optional[AgentManager] = None


def get_agent_manager() -> AgentManager:
    """Get the global agent manager instance."""
    global _agent_manager
    if _agent_manager is None:
        raise RuntimeError(
            "AgentManager not initialized. Call init_agent_manager first."
        )
    return _agent_manager


def init_agent_manager(
    session_store: SessionStore,
    options: ClaudeAgentOptions,
    jsonl_handler: JSONLHandler,
):
    """
    Initialize the global agent manager.

    Args:
        session_store: SessionStore instance
        options: ClaudeAgentOptions for SDK clients
        jsonl_handler: JSONLHandler instance for managing JSONL files
    """
    global _agent_manager
    _agent_manager = AgentManager(session_store, options, jsonl_handler)
