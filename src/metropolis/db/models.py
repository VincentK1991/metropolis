"""Pydantic models for MongoDB collections."""

from datetime import UTC, datetime
from enum import Enum
from typing import Any, List, Optional

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
    workspace_id: Optional[str] = Field(
        default=None, description="Optional workspace ID for workspace threads"
    )
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


class ClaudeAgentJSONLLine(BaseModel):
    """
    Represents a single line from a Claude Agent SDK JSONL session file.

    Minimal model to store JSONL conversation history for session resumption
    across multiple pods. Each line is stored as-is from the .jsonl file.
    """

    id: Optional[str] = Field(default=None, alias="_id")
    session_id: str = Field(..., description="References claude_session_id")
    line_number: int = Field(..., description="Sequential line number (0-indexed)")
    line: str = Field(..., description="Raw JSONL line string")

    class Config:
        populate_by_name = True


class ClaudeAgentSkill(BaseModel):
    """
    Represents a markdown skill for AI agents.

    Skills are markdown documents that represent capabilities
    or knowledge that can be given to AI agents.
    """

    id: Optional[str] = Field(default=None, alias="_id")
    title: str = Field(..., description="Skill title")
    content: str = Field(..., description="Markdown content")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Config:
        populate_by_name = True


class WorkflowRun(BaseModel):
    """
    Pydantic model for workflow run history.

    Tracks execution of skills as workflows with results and artifacts.
    """

    id: Optional[str] = Field(default=None, alias="_id")
    skill_id: str = Field(..., description="Associated skill ID")
    user_input: str = Field(..., description="User's natural language input")
    artifact_paths: List[str] = Field(
        default=[], description="Paths to generated artifacts"
    )
    execution_log: List[dict] = Field(
        default=[], description="Formatted execution messages"
    )
    status: str = Field(
        default="running", description="Execution status: running, completed, failed"
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    completed_at: Optional[datetime] = None

    class Config:
        populate_by_name = True


class Workspace(BaseModel):
    """
    Represents a workspace containing multiple skills.

    Users can create workspaces and associate multiple skills with them.
    Threads (sessions) within a workspace can access all workspace skills.
    """

    id: Optional[str] = Field(default=None, alias="_id")
    name: str = Field(..., description="Workspace name")
    description: str = Field(default="", description="Workspace description")
    skill_ids: List[str] = Field(
        default_factory=list, description="List of skill IDs in this workspace"
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Config:
        populate_by_name = True


class FileMetadata(BaseModel):
    """Embedded document for file metadata in WorkspaceThread."""

    filename: str = Field(..., description="Original filename")
    file_size: int = Field(..., description="File size in bytes")
    file_type: str = Field(..., description="File extension (pptx, csv, etc)")
    mime_type: str = Field(..., description="MIME type")
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    uploaded_by: Optional[str] = Field(default=None, description="User ID (future)")

    class Config:
        populate_by_name = True


class WorkspaceThread(BaseModel):
    """
    Represents a workspace thread (conversation session).

    Separates concerns between execution environment (our UUID for folder)
    and Claude session ID (SDK's thread identifier).
    """

    id: Optional[str] = Field(default=None, alias="_id")
    workspace_id: str = Field(..., description="References workspace")
    execution_environment: str = Field(
        ..., description="UUID for execution folder path (independent of session ID)"
    )
    claude_session_id: str = Field(
        ...,
        description="Session ID from Claude Agent SDK (used as thread_id in routes)",
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    message_count: int = Field(default=0)
    metadata: SessionMetadata = Field(default_factory=SessionMetadata)
    is_active: bool = Field(default=True)

    # Cumulative usage tracking
    total_cost_usd: float = Field(
        default=0.0, description="Total cost in USD for this thread"
    )
    total_input_tokens: int = Field(default=0, description="Total input tokens used")
    total_output_tokens: int = Field(default=0, description="Total output tokens used")

    # File uploads
    files: List["FileMetadata"] = Field(
        default_factory=list, description="Uploaded files metadata (embedded)"
    )

    class Config:
        populate_by_name = True


class WorkspaceMessage(BaseModel):
    """
    Represents a single message in a workspace thread.

    Stores complete messages only (after streaming finishes).
    The content_blocks array matches the frontend's structure:
    [{type: 'text', content: '...'}, {type: 'thinking', content: '...'}, ...]
    """

    id: Optional[str] = Field(default=None, alias="_id")
    claude_session_id: str = Field(..., description="References claude_session_id")
    sequence: int = Field(..., description="Order in conversation (0-indexed)")
    role: MessageRole

    # Array of content blocks (text, thinking, tool_use, tool_result)
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


class WorkspaceThreadJSONLLine(BaseModel):
    """
    Represents a single line from a Claude Agent SDK JSONL session file for workspace threads.

    Stores JSONL conversation history for session resumption.
    Each line is stored as-is from the .jsonl file.
    """

    id: Optional[str] = Field(default=None, alias="_id")
    claude_session_id: str = Field(..., description="References claude_session_id")
    line_number: int = Field(..., description="Sequential line number (0-indexed)")
    line: str = Field(..., description="Raw JSONL line string")

    class Config:
        populate_by_name = True
