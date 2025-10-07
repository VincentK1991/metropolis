from typing import Any

from claude_agent_sdk import AssistantMessage, UserMessage
from claude_agent_sdk.types import StreamEvent, ToolResultBlock, ToolUseBlock


class StreamPrintHandler:
    """Handler for printing streaming messages with colored formatting."""

    # ANSI color codes
    THINKING_COLOR = "\033[90m"  # Gray
    ASSISTANT_COLOR = "\033[96m"  # Cyan
    TOOL_USE_COLOR = "\033[95m"  # Magenta
    TOOL_RESULT_COLOR = "\033[93m"  # Yellow
    RESET_COLOR = "\033[0m"

    def __init__(self, use_colors: bool = True):
        """Initialize the print handler.

        Args:
            use_colors: Whether to use ANSI colors for output
        """
        self.use_colors = use_colors
        self.last_message_type: str | None = None

    def process_message(self, message: Any) -> None:
        """Process and print any message type with appropriate formatting.

        Args:
            message: Message from the Claude SDK (StreamEvent, AssistantMessage, etc.)
        """
        if isinstance(message, StreamEvent):
            self._process_stream_event(message)
        elif isinstance(message, AssistantMessage):
            self._process_assistant_message(message)
        elif isinstance(message, UserMessage):
            self._process_user_message(message)

    def process_stream_event(self, message: StreamEvent) -> None:
        """Process and print a stream event with appropriate formatting.

        Args:
            message: StreamEvent from the Claude SDK
        """
        self._process_stream_event(message)

    def _process_stream_event(self, message: StreamEvent) -> None:
        """Internal method to process stream events."""
        if not isinstance(message, StreamEvent):
            return

        event = message.event
        if event.get("type") != "content_block_delta":
            return

        delta = event.get("delta", {})
        delta_type = delta.get("type")

        if delta_type == "thinking_delta":
            self._print_thinking(delta.get("thinking", ""))
        elif delta_type == "text_delta":
            self._print_assistant(delta.get("text", ""))

    def _process_assistant_message(self, message: AssistantMessage) -> None:
        """Process AssistantMessage for tool use blocks."""
        for block in message.content:
            if isinstance(block, ToolUseBlock):
                self._print_tool_use(block)

    def _process_user_message(self, message: UserMessage) -> None:
        """Process UserMessage for tool result blocks."""
        for block in message.content:
            if isinstance(block, ToolResultBlock):
                self._print_tool_result(block)

    def _print_thinking(self, text: str) -> None:
        """Print thinking text with appropriate formatting and color.

        Args:
            text: The thinking text chunk to print
        """
        if self.last_message_type != "thinking":
            prefix = "\n    Claude (thinking): "
            if self.use_colors:
                print(
                    f"{self.THINKING_COLOR}{prefix}",
                    end="",
                    flush=True,
                )
            else:
                print(prefix, end="", flush=True)
            self.last_message_type = "thinking"

        if self.use_colors:
            print(f"{text}", end="", flush=True)
        else:
            print(text, end="", flush=True)

    def _print_assistant(self, text: str) -> None:
        """Print assistant text with appropriate formatting and color.

        Args:
            text: The assistant text chunk to print
        """
        if self.last_message_type != "assistant":
            # Reset color before assistant message if we were in thinking mode
            if self.last_message_type == "thinking" and self.use_colors:
                print(self.RESET_COLOR, end="", flush=True)

            prefix = "\nClaude (assistant): "
            if self.use_colors:
                print(
                    f"{self.ASSISTANT_COLOR}{prefix}",
                    end="",
                    flush=True,
                )
            else:
                print(prefix, end="", flush=True)
            self.last_message_type = "assistant"

        print(text, end="", flush=True)

    def _print_tool_use(self, block: ToolUseBlock) -> None:
        """Print tool use block with appropriate formatting and color.

        Args:
            block: ToolUseBlock containing tool name and input
        """
        # Reset previous color if needed
        if self.use_colors and self.last_message_type is not None:
            print(self.RESET_COLOR, end="", flush=True)

        if self.use_colors:
            print(
                f"\n{self.TOOL_USE_COLOR}🔧 Tool Use: {block.name}{self.RESET_COLOR}",
                flush=True,
            )
            print(f"{self.TOOL_USE_COLOR}Input: {block.input}{self.RESET_COLOR}")
        else:
            print(f"\n🔧 Tool Use: {block.name}", flush=True)
            print(f"Input: {block.input}")

        self.last_message_type = "tool_use"

    def _print_tool_result(self, block: ToolResultBlock) -> None:
        """Print tool result block with appropriate formatting and color.

        Args:
            block: ToolResultBlock containing tool result content
        """
        # Reset previous color if needed
        if self.use_colors and self.last_message_type is not None:
            print(self.RESET_COLOR, end="", flush=True)

        content_preview = str(block.content)
        # Truncate long content for readability
        # if len(content_preview) > 500:
        #     content_preview = content_preview[:500] + "..."

        if self.use_colors:
            print(
                f"\n{self.TOOL_RESULT_COLOR}📊 Tool Result:{self.RESET_COLOR}",
                flush=True,
            )
            print(f"{self.TOOL_RESULT_COLOR}{content_preview}{self.RESET_COLOR}")
        else:
            print("\n📊 Tool Result:", flush=True)
            print(content_preview)

        self.last_message_type = "tool_result"

    def reset(self) -> None:
        """Reset the handler state and colors."""
        if self.use_colors and self.last_message_type is not None:
            print(self.RESET_COLOR, end="", flush=True)
        self.last_message_type = None

    def finalize(self) -> None:
        """Finalize output by printing newline and resetting colors."""
        if self.use_colors:
            print(self.RESET_COLOR)
        else:
            print()
        self.last_message_type = None
