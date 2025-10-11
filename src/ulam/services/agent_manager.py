"""Multi-session agent manager for Claude Agent SDK."""

from datetime import UTC, datetime
from typing import AsyncGenerator, Dict, Optional

from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient, ResultMessage
from fastapi import WebSocket

from ulam.db.models import ClaudeAgentMessage, ClaudeAgentSession, MessageRole
from ulam.db.session_store import SessionStore
from ulam.utils.websocket_handler import WebSocketStreamHandler


class AgentManager:
    """
    Manages multiple Claude SDK clients (one per session).

    Handles session creation, resumption, and message persistence.
    Accumulates streaming chunks in memory and saves complete messages.
    """

    def __init__(self, session_store: SessionStore, options: ClaudeAgentOptions):
        """
        Initialize the agent manager.

        Args:
            session_store: SessionStore instance for database operations
            options: ClaudeAgentOptions for creating SDK clients
        """
        self.clients: Dict[str, ClaudeSDKClient] = {}  # claude_session_id -> client
        self.session_store = session_store
        self.options = options
        # Accumulator for streaming chunks (session_id -> content_blocks)
        self.streaming_buffers: Dict[str, list[dict]] = {}

    async def create_session(self) -> tuple[str, ClaudeSDKClient]:
        """
        Create a new Claude SDK client and capture session_id.

        Returns:
            Tuple of (claude_session_id, client)

        Raises:
            Exception: If session ID cannot be captured
        """
        # Create new client
        client = ClaudeSDKClient(options=self.options)
        await client.__aenter__()

        # The SDK generates a session ID internally
        # We'll use a combination of timestamp and random for uniqueness
        # until we get the first real query which will give us the actual session_id
        import uuid

        # Generate a temporary session ID
        temp_session_id = f"session-{uuid.uuid4().hex[:16]}"
        claude_session_id = temp_session_id

        print(f"Created new session: {claude_session_id}")

        # Store in MongoDB
        try:
            session = ClaudeAgentSession(claude_session_id=claude_session_id)
            await self.session_store.create_session(session)
        except Exception as e:
            print(f"Error creating session in MongoDB: {e}")
            raise

        # Cache client
        self.clients[claude_session_id] = client
        self.streaming_buffers[claude_session_id] = []

        return claude_session_id, client

    async def resume_session(self, claude_session_id: str) -> ClaudeSDKClient:
        """
        Resume an existing session using SDK's resume option.

        Args:
            claude_session_id: The Claude session ID to resume

        Returns:
            The Claude SDK client for this session
        """
        # Check if already cached
        if claude_session_id in self.clients:
            return self.clients[claude_session_id]

        # Create new client (SDK handles context restoration via resume)
        client = ClaudeSDKClient(options=self.options)
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
                if hasattr(message, "input_tokens"):
                    input_tokens = message.input_tokens  # type: ignore
                if hasattr(message, "output_tokens"):
                    output_tokens = message.output_tokens  # type: ignore

                print(
                    f"Usage: cost=${cost_usd}, "
                    f"input={input_tokens}, output={output_tokens}"
                )

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


def init_agent_manager(session_store: SessionStore, options: ClaudeAgentOptions):
    """
    Initialize the global agent manager.

    Args:
        session_store: SessionStore instance
        options: ClaudeAgentOptions for SDK clients
    """
    global _agent_manager
    _agent_manager = AgentManager(session_store, options)
