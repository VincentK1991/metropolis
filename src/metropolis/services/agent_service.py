from typing import AsyncGenerator

from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient, HookMatcher
from fastapi import WebSocket

from metropolis.hooks import validate_deck_on_write
from metropolis.tools.test_tool import multiplication_server
from metropolis.utils.websocket_handler import WebSocketStreamHandler


class AgentService:
    """Service for managing Claude Agent SDK client and conversation."""

    def __init__(self):
        """Initialize the agent service."""
        self.client: ClaudeSDKClient | None = None
        self.options = ClaudeAgentOptions(
            include_partial_messages=True,
            model="claude-haiku-4-5",
            max_turns=100,
            permission_mode="bypassPermissions",
            mcp_servers={"multiplication": multiplication_server},
            hooks={"PostToolUse": [HookMatcher(hooks=[validate_deck_on_write])]},
            env={
                "MAX_THINKING_TOKENS": "4000",
            },
        )

    async def initialize(self):
        """Initialize the Claude SDK client."""
        if self.client is None:
            self.client = ClaudeSDKClient(options=self.options)
            await self.client.__aenter__()

    async def cleanup(self):
        """Cleanup the Claude SDK client."""
        if self.client is not None:
            await self.client.__aexit__(None, None, None)
            self.client = None

    async def send_query_stream(
        self, prompt: str, websocket: WebSocket
    ) -> AsyncGenerator[dict, None]:
        """Send a query to the agent and stream responses.

        Args:
            prompt: User's prompt/query
            websocket: WebSocket connection for streaming responses

        Yields:
            JSON messages to send via WebSocket
        """
        if self.client is None:
            await self.initialize()

        handler = WebSocketStreamHandler()

        # Send the query
        await self.client.query(prompt)

        # Process response - handles all message types
        async for message in self.client.receive_response():
            messages = handler.process_message(message)
            for msg in messages:
                yield msg

        # Send completion signal
        yield {"type": "complete"}


# Global instance
_agent_service: AgentService | None = None


def get_agent_service() -> AgentService:
    """Get or create the global agent service instance."""
    global _agent_service
    if _agent_service is None:
        _agent_service = AgentService()
    return _agent_service
