"""Pydantic models for MongoDB collections."""

from datetime import UTC, datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class SessionMetadata(BaseModel):
    """Optional metadata for a session."""

    title: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    user_id: Optional[str] = None


class ClaudeAgentSession(BaseModel):
    """
    Represents a Claude Agent SDK session.

    The claude_session_id is the session ID returned by the SDK
    in the initial system message (message.session_id).
    """

    id: Optional[str] = Field(default=None, alias="_id")
    claude_session_id: str = Field(..., description="Session ID from Claude Agent SDK")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    message_count: int = Field(default=0)
    metadata: SessionMetadata = Field(default_factory=SessionMetadata)
    is_active: bool = Field(default=True)

    # Cumulative usage tracking
    total_cost_usd: float = Field(
        default=0.0, description="Total cost in USD for this session"
    )
    total_input_tokens: int = Field(default=0, description="Total input tokens used")
    total_output_tokens: int = Field(default=0, description="Total output tokens used")

    class Config:
        populate_by_name = True


class MessageRole(str, Enum):
    """Message roles in conversation."""

    USER = "user"
    ASSISTANT = "assistant"


class ClaudeAgentMessage(BaseModel):
    """
    Represents a single message in a conversation.

    Stores complete messages only (after streaming finishes).
    The content_blocks array matches the frontend's structure:
    [{type: 'text', content: '...'}, {type: 'thinking', content: '...'}, ...]
    """

    id: Optional[str] = Field(default=None, alias="_id")
    session_id: str = Field(..., description="References claude_session_id")
    sequence: int = Field(..., description="Order in conversation (0-indexed)")
    role: MessageRole

    # Array of content blocks (text, thinking, tool_use, tool_result)
    # This matches the frontend's ChatMessage.contents structure
    content_blocks: list[dict[str, Any]] = Field(default_factory=list)

    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    duration_ms: Optional[int] = None  # Time to generate (for assistant messages)

    # Usage tracking (for assistant messages)
    cost_usd: Optional[float] = Field(
        default=None, description="Cost in USD for this response"
    )
    input_tokens: Optional[int] = Field(default=None, description="Input tokens used")
    output_tokens: Optional[int] = Field(default=None, description="Output tokens used")

    class Config:
        populate_by_name = True
