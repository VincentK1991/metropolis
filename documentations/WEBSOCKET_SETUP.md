# WebSocket Agent Backend & Frontend Setup

This document describes the WebSocket-based architecture for connecting the Claude Agent SDK backend with the React frontend.

## Architecture Overview

### Backend (FastAPI + WebSocket)
- **Port**: 8088
- **WebSocket Endpoint**: `ws://localhost:8088/ws/agent`
- **Health Check**: `http://localhost:8088/health`

### Frontend (React + WebSocket)
- Connects to backend via WebSocket
- Real-time streaming of agent responses
- Support for multiple message content types

## Starting the Application

### 1. Start the Backend

**Option 1: Using convenience script**
```bash
# From the project root
./start_backend.sh
```

**Option 2: After activating venv**
```bash
source .venv/bin/activate
python run_backend.py
```

**Option 3: Direct venv python**
```bash
.venv/bin/python run_backend.py
```

**Option 4: Using uvicorn directly**
```bash
source .venv/bin/activate
uvicorn ulam.app:app --host 0.0.0.0 --port 8088 --reload
```

The backend will:
- Initialize the Claude Agent SDK client
- Start WebSocket server on port 8088
- Enable CORS for frontend ports (3000, 5173, 5174)

### 2. Start the Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not done)
npm install

# Start development server
npm run dev
```

The frontend will typically run on:
- Vite default: `http://localhost:5173`
- Alternative: `http://localhost:5174` or `http://localhost:3000`

## Message Flow

### User to Backend
```json
{
  "type": "query",
  "content": "User's message text"
}
```

### Backend to Frontend (Streaming)

#### Text Content
```json
{
  "type": "text",
  "content": "Streamed text chunk..."
}
```

#### Thinking Content
```json
{
  "type": "thinking",
  "content": "Claude's internal reasoning..."
}
```

#### Tool Use
```json
{
  "type": "tool_use",
  "toolName": "ToolName",
  "toolInput": { "param": "value" }
}
```

#### Tool Result
```json
{
  "type": "tool_result",
  "content": "Tool execution result",
  "toolCallId": "optional-id"
}
```

#### TodoWrite (Special Tool)
```json
{
  "type": "tool_use",
  "toolName": "TodoWrite",
  "toolInput": { ... },
  "todos": [
    {
      "status": "pending" | "in_progress" | "completed",
      "content": "Task description"
    }
  ]
}
```

#### Completion Signal
```json
{
  "type": "complete"
}
```

## Frontend Components

### Key Files

1. **`frontend/src/types/chat.ts`**
   - TypeScript type definitions for messages

2. **`frontend/src/api/agentService.ts`**
   - WebSocket connection management
   - Message sending/receiving

3. **`frontend/src/hooks/useAgentChat.ts`**
   - React hook for chat state management
   - Message accumulation and streaming

4. **`frontend/src/components/TodoTable.tsx`**
   - Display todo lists with progress bars
   - Color-coded status indicators

5. **`frontend/src/components/ChatMessage.tsx`**
   - Render different message types
   - Collapsible tool use/result sections
   - Special TodoWrite rendering

6. **`frontend/src/components/ChatPanel.tsx`**
   - Main chat interface
   - Connection status indicators
   - Message list with auto-scroll

## Backend Components

### Key Files

1. **`src/ulam/utils/websocket_handler.py`**
   - Converts Claude SDK messages to WebSocket JSON
   - Similar to StreamPrintHandler but for WebSocket

2. **`src/ulam/services/agent_service.py`**
   - Manages ClaudeSDKClient instance
   - Maintains conversation context
   - Streams responses via WebSocket

3. **`src/ulam/routes/agent_routes.py`**
   - WebSocket endpoint handler
   - Message routing and error handling

4. **`src/ulam/app.py`**
   - FastAPI application setup
   - CORS configuration
   - Lifecycle management

## Display Features

### Message Types

1. **Thinking** (Gray, Italic, Indented)
   - Shows Claude's reasoning process
   - Displayed inline with content

2. **Text** (Normal, Cyan-ish Background)
   - Main assistant response text
   - Streamed character-by-character

3. **Tool Use** (Purple Chip, Collapsible)
   - Shows tool name in collapsed state
   - Expandable to see full input details
   - Special TodoWrite displays table

4. **Tool Result** (Yellow Chip, Collapsible)
   - Shows "Tool Result" in collapsed state
   - Expandable to see execution result

5. **TodoWrite Table** (Special Component)
   - Progress bar showing completion percentage
   - Color-coded status badges (✅ 🔧 ⏳)
   - Formatted table with #, Status, Task columns

## Connection Management

- Auto-connects on component mount
- Connection status indicator in header
- Streaming indicator during active responses
- Error display banner when issues occur
- Graceful reconnection handling

## Configuration

### Backend Configuration
Located in `src/ulam/services/agent_service.py`:
```python
ClaudeAgentOptions(
    include_partial_messages=True,
    model="claude-sonnet-4-5",
    max_turns=100,
    permission_mode="bypassPermissions",
    mcp_servers={"multiplication": multiplication_server},
    hooks={"PostToolUse": [...]},
    env={"MAX_THINKING_TOKENS": "4000"},
)
```

### Frontend Configuration
Located in `frontend/src/api/agentService.ts`:
```typescript
const WS_BASE_URL = 'ws://localhost:8088'
```

## Troubleshooting

### Backend Issues
- Check if port 8088 is available
- Verify Claude API credentials are set
- Check MCP server configurations
- Review console logs for errors

### Frontend Issues
- Verify backend is running first
- Check browser console for WebSocket errors
- Ensure CORS is properly configured
- Verify WebSocket URL matches backend port

### Connection Issues
- Check firewall settings
- Verify network connectivity
- Ensure WebSocket protocol is supported
- Review browser security settings

