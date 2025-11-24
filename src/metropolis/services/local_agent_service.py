"""Service for proxying queries to local agent and managing sessions."""

import asyncio
import json
import logging
from datetime import UTC, datetime
from typing import AsyncGenerator, Optional

import httpx

from metropolis.db.local_agent_store import LocalAgentStore
from metropolis.db.models import (
    ContainerizedAgentMessage,
    ContainerizedAgentSession,
    MessageRole,
)
from metropolis.services.session_title_service import SessionTitleService

logger = logging.getLogger(__name__)


class LocalAgentService:
    """Service for managing local agent queries with streaming and persistence."""

    def __init__(self, store: LocalAgentStore):
        """
        Initialize the local agent service.

        Args:
            store: LocalAgentStore instance for MongoDB operations
        """
        self.store = store
        self.base_url = "http://localhost:8090"
        self.title_service = SessionTitleService()

    async def query(
        self,
        user_input: str,
        session_id: Optional[str] = None,
        user_id: str = "default",
    ) -> AsyncGenerator[str, None]:
        """
        Proxy query to local agent, stream responses, and save to MongoDB.

        Args:
            user_input: User's input message
            session_id: Optional session ID to resume from
            user_id: User identifier (unused for local, kept for API compatibility)

        Yields:
            SSE-formatted strings (data: {json}\n\n)
        """
        try:
            content_blocks = []
            start_time = datetime.now(UTC)
            captured_session_id: Optional[str] = None
            title_task: Optional[asyncio.Task] = None

            logger.info(
                f"[LOCAL_QUERY_START] Starting query for user_id={user_id}, "
                f"session_id={session_id}, user_input_length={len(user_input)}"
            )

            base_url = self.base_url
            logger.info(f"[HTTP_REQUEST] Using base_url: {base_url}")

            # Prepare request body
            request_body = {"user_input": user_input}
            if session_id:
                request_body["session_id"] = session_id

            logger.info(
                f"[HTTP_REQUEST] Prepared request body: {json.dumps(request_body)}"
            )

            # Check if session exists (for resume)
            if session_id:
                logger.info(f"[SESSION_CHECK] Checking if session exists: {session_id}")
                existing_session = await self.store.get_session(session_id)
                if not existing_session:
                    logger.warning(f"[SESSION_CHECK] Session not found: {session_id}")
                    error_event = {"type": "error", "error": "Session not found"}
                    yield f"data: {json.dumps(error_event)}\n\n"
                    return

                logger.info("[SESSION_CHECK] Session found, saving user message...")
                # Save user message first
                user_seq = await self.store.get_next_sequence(session_id)
                user_msg = ContainerizedAgentMessage(
                    session_id=session_id,
                    sequence=user_seq,
                    role=MessageRole.USER,
                    content_blocks=[{"type": "text", "content": user_input}],
                )
                await self.store.save_message(user_msg)
                await self.store.increment_message_count(session_id)
                captured_session_id = session_id
                logger.info(f"[SESSION_CHECK] User message saved, sequence={user_seq}")

            # Make HTTP request to local agent
            query_url = f"{base_url}/query"
            logger.info(
                f"[HTTP_REQUEST] Making POST request to {query_url} "
                f"with timeout=300s, headers={{'Accept': 'text/event-stream'}}"
            )

            try:
                async with httpx.AsyncClient(timeout=300.0) as client:
                    logger.info(
                        "[HTTP_REQUEST] HTTP client created, starting stream..."
                    )
                    async with client.stream(
                        "POST",
                        query_url,
                        json=request_body,
                        headers={"Accept": "text/event-stream"},
                    ) as response:
                        logger.info(
                            f"[HTTP_RESPONSE] Received response: status={response.status_code}, "
                            f"headers={dict(response.headers)}"
                        )
                        response.raise_for_status()
                        logger.info(
                            "[HTTP_RESPONSE] Response status OK, starting to read stream..."
                        )

                        buffer = ""
                        async for chunk in response.aiter_text():
                            logger.debug(
                                f"[HTTP_STREAM] Received chunk: {len(chunk)} bytes"
                            )
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
                                    msg_type = data.get("type")
                                    logger.debug(
                                        f"[HTTP_STREAM] Parsed event type: {msg_type}"
                                    )

                                    # Handle session_created event
                                    if (
                                        msg_type == "session_created"
                                        and not captured_session_id
                                    ):
                                        captured_session_id = data.get("session_id")
                                        if captured_session_id:
                                            logger.info(
                                                f"Captured session ID: {captured_session_id}"
                                            )

                                            # Create session in database
                                            session = ContainerizedAgentSession(
                                                claude_session_id=captured_session_id,
                                            )
                                            await self.store.create_session(session)

                                            # Save user message
                                            user_msg = ContainerizedAgentMessage(
                                                session_id=captured_session_id,
                                                sequence=0,
                                                role=MessageRole.USER,
                                                content_blocks=[
                                                    {
                                                        "type": "text",
                                                        "content": user_input,
                                                    }
                                                ],
                                            )
                                            await self.store.save_message(user_msg)

                                            # Send session_created event to frontend
                                            yield f"data: {json.dumps(data)}\n\n"

                                            # Generate title asynchronously (only for new sessions)
                                            # Start the task
                                            title_task = asyncio.create_task(
                                                self._generate_and_update_title(
                                                    captured_session_id, user_input
                                                )
                                            )

                                    # Handle content blocks
                                    elif msg_type in ["text", "thinking"]:
                                        # Accumulate content blocks
                                        if (
                                            content_blocks
                                            and content_blocks[-1]["type"] == msg_type
                                        ):
                                            content_blocks[-1]["content"] += data.get(
                                                "content", ""
                                            )
                                        else:
                                            content_blocks.append(
                                                {
                                                    "type": msg_type,
                                                    "content": data.get("content", ""),
                                                }
                                            )
                                        yield f"data: {json.dumps(data)}\n\n"

                                    elif msg_type in ["tool_use", "tool_result"]:
                                        content_blocks.append(data)
                                        yield f"data: {json.dumps(data)}\n\n"

                                    elif msg_type == "complete":
                                        # Save assistant message if we have a session
                                        if captured_session_id and content_blocks:
                                            duration_ms = int(
                                                (
                                                    datetime.now(UTC) - start_time
                                                ).total_seconds()
                                                * 1000
                                            )
                                            assistant_seq = (
                                                await self.store.get_next_sequence(
                                                    captured_session_id
                                                )
                                            )
                                            assistant_msg = ContainerizedAgentMessage(
                                                session_id=captured_session_id,
                                                sequence=assistant_seq,
                                                role=MessageRole.ASSISTANT,
                                                content_blocks=content_blocks,
                                                duration_ms=duration_ms,
                                            )
                                            await self.store.save_message(assistant_msg)
                                            await self.store.increment_message_count(
                                                captured_session_id
                                            )

                                        yield f"data: {json.dumps(data)}\n\n"

                                        # Check if title generation is complete and yield event
                                        if title_task and not title_task.done():
                                            # Wait a bit for title generation (non-blocking check)
                                            try:
                                                title = await asyncio.wait_for(
                                                    title_task, timeout=0.1
                                                )
                                                if title:
                                                    title_event = {
                                                        "type": "session_title_generated",
                                                        "session_id": captured_session_id,
                                                        "title": title,
                                                    }
                                                    yield (
                                                        f"data: {json.dumps(title_event)}\n\n"
                                                    )
                                            except asyncio.TimeoutError:
                                                # Title not ready yet, will be updated in DB
                                                # Frontend can refresh to see it
                                                pass
                                        elif title_task and title_task.done():
                                            # Title already generated, yield it now
                                            try:
                                                title = title_task.result()
                                                if title:
                                                    title_event = {
                                                        "type": "session_title_generated",
                                                        "session_id": captured_session_id,
                                                        "title": title,
                                                    }
                                                    yield (
                                                        f"data: {json.dumps(title_event)}\n\n"
                                                    )
                                            except Exception:
                                                # Title generation failed, skip
                                                pass

                                    else:
                                        # Forward unknown event types
                                        logger.debug(
                                            f"[HTTP_STREAM] Forwarding unknown event type: {msg_type}"
                                        )
                                        yield f"data: {json.dumps(data)}\n\n"

                                except json.JSONDecodeError as e:
                                    logger.warning(
                                        f"[HTTP_STREAM] Failed to parse JSON: {json_str[:100]}, error: {e}"
                                    )
                                    continue

                        # Process any remaining buffer
                        if buffer.strip().startswith("data: "):
                            json_str = buffer[6:].strip()
                            try:
                                data = json.loads(json_str)
                                yield f"data: {json.dumps(data)}\n\n"
                            except json.JSONDecodeError:
                                pass

                        logger.info(
                            f"[HTTP_STREAM] Finished reading stream from {query_url}"
                        )

            except httpx.HTTPStatusError as e:
                logger.error(
                    f"[HTTP_ERROR] HTTP status error from local agent: "
                    f"status={e.response.status_code}, url={query_url}, error={e}",
                    exc_info=True,
                )
                error_event = {
                    "type": "error",
                    "error": f"HTTP error: {e.response.status_code}",
                }
                yield f"data: {json.dumps(error_event)}\n\n"
            except httpx.ConnectError as e:
                logger.error(
                    f"[HTTP_ERROR] Connection error - cannot reach local agent at {query_url}: {e}",
                    exc_info=True,
                )
                error_event = {
                    "type": "error",
                    "error": f"Connection error: Cannot reach local agent at {query_url}",
                }
                yield f"data: {json.dumps(error_event)}\n\n"
            except httpx.TimeoutException as e:
                logger.error(
                    f"[HTTP_ERROR] Timeout error connecting to {query_url}: {e}",
                    exc_info=True,
                )
                error_event = {
                    "type": "error",
                    "error": "Timeout error: Local agent did not respond in time",
                }
                yield f"data: {json.dumps(error_event)}\n\n"
        except Exception as e:
            logger.error(
                f"[ERROR] Unexpected error in local agent query: {e}",
                exc_info=True,
            )
            error_event = {"type": "error", "error": str(e)}
            yield f"data: {json.dumps(error_event)}\n\n"

    async def _generate_and_update_title(self, session_id: str, user_query: str) -> str:
        """
        Generate a title for the session and update it in the database.

        This runs as a background task. Returns the generated title.

        Args:
            session_id: The session ID to update
            user_query: The user's first query

        Returns:
            The generated title, or "Untitled Session" if generation fails
        """
        try:
            title = await self.title_service.generate_title(user_query)
            # Update metadata.title using dot notation for nested field
            await self.store.update_session(session_id, {"metadata.title": title})
            logger.info(f"Generated title '{title}' for session {session_id}")
            return title
        except Exception as e:
            logger.error(
                f"Failed to generate title for session {session_id}: {e}", exc_info=True
            )
            return "Untitled Session"

