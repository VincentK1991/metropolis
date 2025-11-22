#!/usr/bin/env python3
"""Query the containerized Claude Agent API and display streaming output nicely."""

import json
import os
import sys
from typing import Any, Optional

import chz
import httpx


class StreamPrintHandler:
    """Handler for printing streaming messages with colored formatting."""

    # ANSI color codes
    THINKING_COLOR = "\033[90m"  # Gray
    ASSISTANT_COLOR = "\033[96m"  # Cyan
    TOOL_USE_COLOR = "\033[95m"  # Magenta
    TOOL_RESULT_COLOR = "\033[93m"  # Yellow
    SESSION_COLOR = "\033[1;32m"  # Bold Green
    RESET_COLOR = "\033[0m"

    def __init__(self, use_colors: bool = True):
        """Initialize the print handler.

        Args:
            use_colors: Whether to use ANSI colors for output
        """
        self.use_colors = use_colors
        self.last_message_type: Optional[str] = None

    def process_message(self, data: dict[str, Any]) -> None:
        """Process and print a message from the SSE stream.

        Args:
            data: Dictionary containing message data from SSE stream
        """
        msg_type = data.get("type", "unknown")

        if msg_type == "session_created":
            self._print_session_created(data.get("session_id", ""))
        elif msg_type == "text":
            self._print_text(data.get("content", ""))
        elif msg_type == "thinking":
            self._print_thinking(data.get("content", ""))
        elif msg_type == "tool_use":
            self._print_tool_use(data)
        elif msg_type == "tool_result":
            self._print_tool_result(data.get("content", ""))
        elif msg_type == "complete":
            self._print_complete()
        else:
            print(f"\n[{msg_type}] {json.dumps(data)}", flush=True)

    def _print_session_created(self, session_id: str) -> None:
        """Print session created message."""
        if self.use_colors:
            msg = f"\n{self.SESSION_COLOR}[SESSION CREATED: {session_id}]"
            msg += f"{self.RESET_COLOR}\n"
            print(msg, flush=True)
        else:
            print(f"\n[SESSION CREATED: {session_id}]\n", flush=True)
        self.last_message_type = "session_created"

    def _print_text(self, text: str) -> None:
        """Print assistant text with appropriate formatting and color.

        Args:
            text: The text chunk to print
        """
        if self.last_message_type != "text":
            # Reset color if we were in thinking mode
            if self.last_message_type == "thinking" and self.use_colors:
                print(self.RESET_COLOR, end="", flush=True)

            prefix = "\nClaude: "
            if self.use_colors:
                print(f"{self.ASSISTANT_COLOR}{prefix}", end="", flush=True)
            else:
                print(prefix, end="", flush=True)
            self.last_message_type = "text"

        print(text, end="", flush=True)

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

    def _print_tool_use(self, data: dict[str, Any]) -> None:
        """Print tool use block with appropriate formatting and color.

        Args:
            data: Dictionary containing tool_use message data
        """
        # Reset previous color if needed
        if self.use_colors and self.last_message_type is not None:
            print(self.RESET_COLOR, end="", flush=True)

        tool_name = data.get("toolName", "unknown")
        tool_input = data.get("toolInput", {})

        if self.use_colors:
            print(
                f"\n{self.TOOL_USE_COLOR}🔧 Tool Use: {tool_name}{self.RESET_COLOR}",
                flush=True,
            )
        else:
            print(f"\n🔧 Tool Use: {tool_name}", flush=True)

        # Special handling for TodoWrite tool
        if tool_name == "TodoWrite" and "todos" in data:
            self._print_todo_table(data["todos"])
        elif tool_input:
            if self.use_colors:
                print(f"{self.TOOL_USE_COLOR}Input: {tool_input}{self.RESET_COLOR}")
            else:
                print(f"Input: {tool_input}")

        self.last_message_type = "tool_use"

    def _print_tool_result(self, content: str) -> None:
        """Print tool result block with appropriate formatting and color.

        Args:
            content: The tool result content
        """
        # Reset previous color if needed
        if self.use_colors and self.last_message_type is not None:
            print(self.RESET_COLOR, end="", flush=True)

        # Truncate long content for readability
        content_preview = str(content)
        if len(content_preview) > 500:
            content_preview = content_preview[:500] + "..."

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

    def _print_todo_table(self, todos: list[dict]) -> None:
        """Print todo list in a nicely formatted table.

        Args:
            todos: List of todo dictionaries with status, content, etc.
        """
        if not todos:
            return

        # Calculate statistics
        completed = len([t for t in todos if t.get("status") == "completed"])
        in_progress = len([t for t in todos if t.get("status") == "in_progress"])
        pending = len([t for t in todos if t.get("status") == "pending"])
        total = len(todos)

        # Progress header
        if self.use_colors:
            print(
                f"\n{self.TOOL_USE_COLOR}📋 Todo Progress: "
                f"{completed}/{total} completed, "
                f"{in_progress} in progress, "
                f"{pending} pending{self.RESET_COLOR}"
            )
        else:
            print(
                f"\n📋 Todo Progress: "
                f"{completed}/{total} completed, "
                f"{in_progress} in progress, "
                f"{pending} pending"
            )

        # Progress bar
        if total > 0:
            progress_ratio = completed / total
            bar_length = 20
            filled_length = int(bar_length * progress_ratio)
            bar = "█" * filled_length + "░" * (bar_length - filled_length)
            percentage = int(progress_ratio * 100)

            if self.use_colors:
                print(f"{self.TOOL_USE_COLOR}[{bar}] {percentage}%{self.RESET_COLOR}")
            else:
                print(f"[{bar}] {percentage}%")

        # Table header
        print(
            "\n┌─────┬─────────────┬─────────────────────────────────────────────────┐"
        )
        print("│  #  │   Status    │                    Task                         │")
        print("├─────┼─────────────┼─────────────────────────────────────────────────┤")

        # Table rows
        for i, todo in enumerate(todos, 1):
            status = todo.get("status", "pending")
            content = todo.get("content", "")

            # Status icons and colors
            if status == "completed":
                icon = "✅"
                status_text = "Completed"
                color = "\033[32m" if self.use_colors else ""  # Green
            elif status == "in_progress":
                icon = "🔧"
                status_text = "In Progress"
                color = "\033[33m" if self.use_colors else ""  # Yellow
            else:  # pending
                icon = "⏳"
                status_text = "Pending"
                color = "\033[37m" if self.use_colors else ""  # White/Gray

            # Truncate content if too long
            max_content_length = 47
            if len(content) > max_content_length:
                content = content[: max_content_length - 3] + "..."

            reset = self.RESET_COLOR if self.use_colors else ""

            print(
                f"│ {i:2d}  │ {color}{icon} {status_text:<8}{reset} │ "
                f"{color}{content:<47}{reset} │"
            )

        # Table footer
        print("└─────┴─────────────┴─────────────────────────────────────────────────┘")

    def _print_complete(self) -> None:
        """Print completion message."""
        if self.use_colors:
            print(f"\n\n{self.SESSION_COLOR}[COMPLETE]{self.RESET_COLOR}", flush=True)
        else:
            print("\n\n[COMPLETE]", flush=True)
        self.last_message_type = None

    def finalize(self) -> None:
        """Finalize output by printing newline and resetting colors."""
        if self.use_colors:
            print(self.RESET_COLOR)
        else:
            print()
        self.last_message_type = None


@chz.chz
class QueryConfig:
    """Configuration for querying the containerized Claude Agent API."""

    user_input: str
    session_id: str = ""
    api_url: str = "http://localhost:8089"


def main():
    """Main function to query the API and display streaming output."""
    # Parse command-line arguments using chz
    # chz.entrypoint handles --help and errors by calling sys.exit()
    config = chz.entrypoint(QueryConfig)

    # Apply environment variable fallbacks for optional parameters
    user_input = config.user_input
    session_id = config.session_id or os.getenv("SESSION_ID", "")
    api_url = config.api_url or os.getenv("API_URL", "http://localhost:8089")

    # Build request body
    request_body = {"user_input": user_input}
    if session_id:
        request_body["session_id"] = session_id

    print(f"Querying: {api_url}/query")
    if session_id:
        print(f"Session ID: {session_id}")
    print(f"Input: {user_input}")
    print("")
    print("--- Response ---")
    print("")

    # Initialize print handler
    handler = StreamPrintHandler(use_colors=True)

    try:
        # Make request and process SSE stream
        with httpx.stream(
            "POST",
            f"{api_url}/query",
            json=request_body,
            headers={"Accept": "text/event-stream"},
            timeout=300.0,
        ) as response:
            response.raise_for_status()

            buffer = ""
            for chunk in response.iter_text():
                buffer += chunk

                # Process complete lines
                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    line = line.strip()

                    if not line or not line.startswith("data: "):
                        continue

                    # Extract JSON data
                    json_str = line[6:]  # Remove 'data: ' prefix

                    try:
                        data = json.loads(json_str)
                        handler.process_message(data)
                    except json.JSONDecodeError:
                        # If JSON parsing fails, skip
                        continue

            # Process any remaining buffer
            if buffer.strip().startswith("data: "):
                json_str = buffer[6:].strip()
                try:
                    data = json.loads(json_str)
                    handler.process_message(data)
                except json.JSONDecodeError:
                    pass

    except httpx.HTTPError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\nInterrupted by user", file=sys.stderr)
        sys.exit(1)
    finally:
        handler.finalize()
        print("")
        print("--- End of Response ---")


if __name__ == "__main__":
    main()
