# Quick Start Guide

## Start the Application

### Terminal 1: Backend

**Option 1: Using the convenience script**
```bash
cd /home/vkieuvongngam/exploration/ulam
./start_backend.sh
```

**Option 2: With manual activation**
```bash
cd /home/vkieuvongngam/exploration/ulam
source .venv/bin/activate
python run_backend.py
```

**Option 3: Direct venv python**
```bash
cd /home/vkieuvongngam/exploration/ulam
.venv/bin/python run_backend.py
```

### Terminal 2: Frontend
```bash
cd /home/vkieuvongngam/exploration/ulam/frontend
npm run dev
```

## URLs
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:8088
- **Health Check**: http://localhost:8088/health
- **WebSocket**: ws://localhost:8088/ws/agent

## First Time Setup

### Backend
```bash
# Install dependencies with uv
uv sync
```

### Frontend
```bash
cd frontend
npm install
```

## Key Files Created

### Backend (Python/FastAPI)
- `src/ulam/utils/websocket_handler.py` - Message formatter
- `src/ulam/services/agent_service.py` - Claude SDK client manager
- `src/ulam/routes/agent_routes.py` - WebSocket routes
- `src/ulam/app.py` - FastAPI application
- `run_backend.py` - Backend startup script

### Frontend (React/TypeScript)
- `frontend/src/types/chat.ts` - Type definitions
- `frontend/src/api/agentService.ts` - WebSocket client
- `frontend/src/hooks/useAgentChat.ts` - Chat hook
- `frontend/src/components/TodoTable.tsx` - Todo display
- `frontend/src/components/ChatMessage.tsx` - Enhanced (multi-content)
- `frontend/src/components/ChatPanel.tsx` - Updated (WebSocket)

## Features Implemented

✅ Real-time streaming (character-by-character)
✅ Thinking visible (gray, indented)
✅ Tool use/result (collapsible, collapsed by default)
✅ TodoWrite special table rendering
✅ Continuous conversation context
✅ Connection status indicators
✅ Error handling
✅ Auto-scroll
✅ Visual differentiation of content types

## Troubleshooting

### Port 8088 already in use
```bash
# Find and kill the process
lsof -ti:8088 | xargs kill -9
```

### Frontend can't connect
1. Check backend is running: http://localhost:8088/health
2. Check console for WebSocket errors
3. Verify CORS settings in `src/ulam/app.py`

### Dependencies missing
```bash
# Backend
uv sync

# Frontend
cd frontend && npm install
```

## Test It Works

1. Start backend and frontend
2. Open browser to http://localhost:5173
3. Wait for "Online" indicator
4. Type: "Create a todo list for making breakfast"
5. Watch:
   - Gray thinking text appears
   - Normal response text streams
   - TodoWrite tool with table renders
   - Progress bar shows completion

## Documentation

- `WEBSOCKET_SETUP.md` - Detailed architecture and setup
- `IMPLEMENTATION_SUMMARY.md` - Complete implementation details
- This file - Quick reference

Enjoy your WebSocket-powered Claude Agent! 🚀

