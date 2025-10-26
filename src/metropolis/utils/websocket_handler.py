from typing import Any

from claude_agent_sdk import AssistantMessage, UserMessage
from claude_agent_sdk.types import StreamEvent, ToolResultBlock, ToolUseBlock


class StreamHandler:
    """
    Handler for streaming messages via WebSocket or SSE with JSON formatting.

    This handler processes Claude SDK messages and converts them to JSON format
    suitable for both WebSocket and Server-Sent Events (SSE) streaming.
    """

    def __init__(self):
        """Initialize the stream handler."""
        self.last_message_type: str | None = None

    def process_message(self, message: Any) -> list[dict[str, Any]]:
        """Process any message type and return JSON messages for WebSocket.

        Args:
            message: Message from the Claude SDK (StreamEvent, AssistantMessage, etc.)

        Returns:
            List of JSON-serializable dictionaries to send via WebSocket
        """
        if isinstance(message, StreamEvent):
            return self._process_stream_event(message)
        elif isinstance(message, AssistantMessage):
            return self._process_assistant_message(message)
        elif isinstance(message, UserMessage):
            return self._process_user_message(message)
        return []

    def _process_stream_event(self, message: StreamEvent) -> list[dict[str, Any]]:
        """Internal method to process stream events."""
        if not isinstance(message, StreamEvent):
            return []

        event = message.event
        if event.get("type") != "content_block_delta":
            return []

        delta = event.get("delta", {})
        delta_type = delta.get("type")

        if delta_type == "thinking_delta":
            thinking_text = delta.get("thinking", "")
            if thinking_text:
                self.last_message_type = "thinking"
                return [{"type": "thinking", "content": thinking_text}]
        elif delta_type == "text_delta":
            text = delta.get("text", "")
            if text:
                self.last_message_type = "text"
                return [{"type": "text", "content": text}]

        return []

    def _process_assistant_message(
        self, message: AssistantMessage
    ) -> list[dict[str, Any]]:
        """Process AssistantMessage for tool use blocks."""
        results = []
        for block in message.content:
            if isinstance(block, ToolUseBlock):
                results.append(self._create_tool_use_message(block))
        return results

    def _process_user_message(self, message: UserMessage) -> list[dict[str, Any]]:
        """Process UserMessage for tool result blocks."""
        results = []
        for block in message.content:
            if isinstance(block, ToolResultBlock):
                results.append(self._create_tool_result_message(block))
        return results

    def _create_tool_use_message(self, block: ToolUseBlock) -> dict[str, Any]:
        """Create a tool use message for WebSocket.

        Args:
            block: ToolUseBlock containing tool name and input

        Returns:
            JSON-serializable dictionary
        """
        self.last_message_type = "tool_use"

        message = {
            "type": "tool_use",
            "toolName": block.name,
            "toolInput": block.input,
        }

        # Special handling for TodoWrite tool
        if block.name == "TodoWrite" and "todos" in block.input:
            message["todos"] = block.input["todos"]

        return message

    def _create_tool_result_message(self, block: ToolResultBlock) -> dict[str, Any]:
        """Create a tool result message for WebSocket.

        Args:
            block: ToolResultBlock containing tool result content

        Returns:
            JSON-serializable dictionary
        """
        self.last_message_type = "tool_result"

        tool_use_id = None
        if hasattr(block, "tool_use_id"):
            tool_use_id = block.tool_use_id

        return {
            "type": "tool_result",
            "content": str(block.content),
            "toolCallId": tool_use_id,
        }

    def reset(self) -> None:
        """Reset the handler state."""
        self.last_message_type = None


# Backwards compatibility alias
WebSocketStreamHandler = StreamHandler
