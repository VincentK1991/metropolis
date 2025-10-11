# Usage & Cost Tracking

## Overview

The persistent session implementation now includes **usage and cost tracking** based on the Claude Agent SDK's `ResultMessage` type. This tracks costs and token usage for each message and cumulatively for each session.

## Implementation

### Backend Components

#### 1. ResultMessage from Claude Agent SDK

The SDK returns a `ResultMessage` at the end of each query with usage statistics:

```python
from claude_agent_sdk import ResultMessage

# During streaming:
async for message in client.receive_response():
    if isinstance(message, ResultMessage):
        cost_usd = message.total_cost_usd  # Cost in USD
        input_tokens = message.input_tokens  # Input tokens used
        output_tokens = message.output_tokens  # Output tokens used
```

Reference: `src/ulam/examples/quick_start.py` line 63-64

#### 2. Pydantic Models Updated

**ClaudeAgentMessage** (per-message tracking):
```python
class ClaudeAgentMessage(BaseModel):
    # ... existing fields ...
    cost_usd: Optional[float] = None
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
```

**ClaudeAgentSession** (cumulative tracking):
```python
class ClaudeAgentSession(BaseModel):
    # ... existing fields ...
    total_cost_usd: float = 0.0
    total_input_tokens: int = 0
    total_output_tokens: int = 0
```

#### 3. Agent Manager Captures Usage

In `src/ulam/services/agent_manager.py`:

```python
# During streaming
if isinstance(message, ResultMessage):
    cost_usd = message.total_cost_usd
    input_tokens = message.input_tokens
    output_tokens = message.output_tokens

# Save to message
assistant_msg = ClaudeAgentMessage(
    # ... other fields ...
    cost_usd=cost_usd,
    input_tokens=input_tokens,
    output_tokens=output_tokens,
)

# Update session cumulative totals
await session_store.update_session_usage(
    session_id,
    cost_usd=cost_usd or 0.0,
    input_tokens=input_tokens or 0,
    output_tokens=output_tokens or 0,
)
```

#### 4. SessionStore Method

New method in `src/ulam/db/session_store.py`:

```python
async def update_session_usage(
    self,
    claude_session_id: str,
    cost_usd: float = 0.0,
    input_tokens: int = 0,
    output_tokens: int = 0,
):
    """Update session cumulative usage statistics."""
    await self.sessions.update_one(
        {"claude_session_id": claude_session_id},
        {
            "$inc": {
                "total_cost_usd": cost_usd,
                "total_input_tokens": input_tokens,
                "total_output_tokens": output_tokens,
            },
            "$set": {"updated_at": datetime.now(UTC)},
        },
    )
```

### Frontend Display

#### SessionSidebar Component

Shows cost and token usage below each session:

```typescript
{session.total_cost_usd > 0 && (
  <div className="session-cost">
    ${session.total_cost_usd.toFixed(4)} ·
    {session.total_input_tokens}in / {session.total_output_tokens}out
  </div>
)}
```

**Example display**:
```
Untitled Session
session-abc123def456
4 messages · Just now
$0.0125 · 1234in / 567out
```

## MongoDB Schema

### Session Document with Usage
```json
{
  "_id": "...",
  "claude_session_id": "session-abc123",
  "message_count": 6,
  "total_cost_usd": 0.0245,
  "total_input_tokens": 2500,
  "total_output_tokens": 1200,
  "created_at": "2025-10-11T18:07:49Z",
  "updated_at": "2025-10-11T18:20:51Z"
}
```

### Message Document with Usage
```json
{
  "_id": "...",
  "session_id": "session-abc123",
  "sequence": 1,
  "role": "assistant",
  "content_blocks": [
    {"type": "thinking", "content": "..."},
    {"type": "text", "content": "..."}
  ],
  "duration_ms": 4154,
  "cost_usd": 0.0082,
  "input_tokens": 850,
  "output_tokens": 425
}
```

## Querying Usage Data

### Get Total Cost for a Session
```javascript
// In MongoDB
db.claude_agent_sdk_sessions.findOne(
  {claude_session_id: "session-abc123"},
  {total_cost_usd: 1, total_input_tokens: 1, total_output_tokens: 1}
)
```

### Get Per-Message Costs
```javascript
// Get all message costs for a session
db.claude_agent_sdk_messages.find(
  {session_id: "session-abc123", role: "assistant"},
  {sequence: 1, cost_usd: 1, input_tokens: 1, output_tokens: 1}
).sort({sequence: 1})
```

### Aggregate Usage Across All Sessions
```javascript
db.claude_agent_sdk_sessions.aggregate([
  {
    $group: {
      _id: null,
      total_cost: {$sum: "$total_cost_usd"},
      total_messages: {$sum: "$message_count"},
      total_input: {$sum: "$total_input_tokens"},
      total_output: {$sum: "$total_output_tokens"}
    }
  }
])
```

## Testing

After backend restart, send a message and check:

### 1. Backend Console
You should see output like:
```
Usage: cost=$0.0082, input=850, output=425
```

### 2. MongoDB Verification
```bash
mongosh mongodb://user:test1234@localhost:27017/agent_sessions

# Check session totals
db.claude_agent_sdk_sessions.find(
  {},
  {claude_session_id: 1, total_cost_usd: 1, total_input_tokens: 1, total_output_tokens: 1}
).pretty()

# Check message costs
db.claude_agent_sdk_messages.find(
  {role: "assistant"},
  {session_id: 1, sequence: 1, cost_usd: 1, input_tokens: 1, output_tokens: 1}
).limit(5).pretty()
```

### 3. Frontend Display
The SessionSidebar will show cost information below each session:
- **Cost**: `$0.0245` (4 decimal places)
- **Tokens**: `2500in / 1200out`

## Cost Monitoring

### Set Up Alerts (Future Enhancement)
```python
# Example: Alert if session cost exceeds threshold
async def check_cost_threshold(session_id: str, threshold: float = 1.0):
    session = await session_store.get_session(session_id)
    if session and session.total_cost_usd > threshold:
        # Send alert
        print(f"⚠️ Session {session_id} exceeded ${threshold} (current: ${session.total_cost_usd})")
```

### Export Cost Report
```python
# Get all sessions with costs
sessions = await session_store.list_sessions(limit=100)
total = sum(s.total_cost_usd for s in sessions)
print(f"Total cost across all sessions: ${total:.4f}")
```

## Key Features

✅ **Per-message tracking**: Cost and tokens stored for each assistant response
✅ **Cumulative session tracking**: Running totals maintained in session document
✅ **Frontend display**: Cost visible in session sidebar
✅ **MongoDB queries**: Easy to aggregate and analyze costs
✅ **Automatic updates**: Usage tracked automatically from ResultMessage

## References

- Claude Agent SDK Quick Start: `src/ulam/examples/quick_start.py`
- [Claude Agent SDK Tracking Costs and Usage](https://docs.claude.com/en/api/agent-sdk/tracking-costs)

