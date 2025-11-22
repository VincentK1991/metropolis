"""Service for managing Claude Agent SDK sessions and streaming responses."""

import json
import logging
import os
from pathlib import Path
from typing import AsyncGenerator, Optional

from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient

from containerized_agent.stream_handler import StreamHandler

logger = logging.getLogger(__name__)

# Working directory for agent files (mounted as volume)
WORKING_DIR = Path(os.getenv("AGENT_WORKING_DIR", "/app/workspace"))


class AgentService:
    """Service for managing Claude SDK clients and streaming responses."""

    def __init__(self):
        """Initialize the agent service."""
        self.stream_handler = StreamHandler()
        # Ensure working directory exists
        WORKING_DIR.mkdir(parents=True, exist_ok=True)
        logger.info(f"Agent working directory: {WORKING_DIR}")

    def extract_session_id_from_message(self, message) -> Optional[str]:
        """Extract session ID from a Claude SDK message.

        Args:
            message: Message from Claude SDK

        Returns:
            Session ID if found, None otherwise
        """
        # Check if message has session_id attribute directly
        if hasattr(message, "session_id"):
            return message.session_id

        # Check for sessionId in message dict representation
        if isinstance(message, dict) and "sessionId" in message:
            return message["sessionId"]

        return None

    def _get_agent_options(
        self, session_id: Optional[str] = None
    ) -> ClaudeAgentOptions:
        """Create Claude Agent options.

        Args:
            session_id: Optional session ID to resume from

        Returns:
            ClaudeAgentOptions configured for the service
        """
        if session_id:
            logger.info(f"Creating agent options to resume session: {session_id}")
        else:
            logger.info("Creating agent options for new session")

        logger.info(f"Using working directory: {WORKING_DIR}")

        options = ClaudeAgentOptions(
            include_partial_messages=True,
            model="claude-haiku-4-5",
            max_turns=100,
            setting_sources=["user", "project"],
            permission_mode="bypassPermissions",
            cwd=WORKING_DIR,
            system_prompt={
                "type": "preset",
                "preset": "claude_code",
                "append": f"""
            always work within the working directory {WORKING_DIR}
            do not work outside of this working directory.
            if a task requires running python code and python library is required
            use uv as package manager to install python library.
            """,
            },
            env={
                "MAX_THINKING_TOKENS": "4000",
            },
        )

        if session_id:
            options.resume = session_id

        return options

    async def query(
        self, user_input: str, session_id: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """Execute a query with optional session resumption.

        Args:
            user_input: User's input message
            session_id: Optional session ID to resume from

        Yields:
            SSE-formatted strings (data: {json}\n\n)
        """
        session_info = session_id or "new"
        logger.info(
            f"Starting query - session_id: {session_info}, "
            f"input length: {len(user_input)}"
        )

        options = self._get_agent_options(session_id)
        # If resuming, we already know the session_id, so set it upfront
        # If new session, we'll capture it from the first message
        captured_session_id: Optional[str] = session_id
        is_new_session = session_id is None
        message_count = 0
        event_count = 0

        try:
            async with ClaudeSDKClient(options=options) as client:
                logger.info("Claude SDK client initialized, sending query")
                # Send query
                await client.query(user_input)
                logger.info("Query sent, starting to receive responses")

                # Stream responses
                async for message in client.receive_response():
                    message_count += 1
                    # Only capture session ID and send session_created for new sessions
                    if is_new_session and captured_session_id is None:
                        extracted_id = self.extract_session_id_from_message(message)
                        if extracted_id:
                            captured_session_id = extracted_id
                            logger.info(f"Captured session ID: {captured_session_id}")
                            # Send session_created event only for new sessions
                            session_event = {
                                "type": "session_created",
                                "session_id": captured_session_id,
                            }
                            yield f"data: {json.dumps(session_event)}\n\n"
                            event_count += 1

                    # Process message and stream results
                    messages = self.stream_handler.process_message(message)
                    for msg in messages:
                        event_count += 1
                        if msg.get("type") in ["text", "thinking"]:
                            content_len = len(msg.get("content", ""))
                            logger.debug(
                                f"Streaming {msg['type']} chunk: {content_len} chars"
                            )
                        elif msg.get("type") in ["tool_use", "tool_result"]:
                            logger.info(
                                f"Streaming {msg['type']}: {msg.get('toolName', 'N/A')}"
                            )
                        yield f"data: {json.dumps(msg)}\n\n"

            logger.info(
                f"Query completed - messages received: {message_count}, "
                f"events streamed: {event_count}"
            )
        except Exception as e:
            logger.error(f"Error during query execution: {str(e)}", exc_info=True)
            raise

        # Send completion event
        completion_event = {"type": "complete"}
        yield f"data: {json.dumps(completion_event)}\n\n"
        logger.info("Completion event sent")
