# Metropolis

 An AI-powered agent web application for building intelligent workflows and automation systems, implemented in Claude Agent SDK.

## Quick Start

1. uv venv -p 3.12
2. source .venv/bin/activate
3. uv sync
4. ./start_backend.sh
5. cd frontend && npm install && npm run dev

## Capabilities

Metropolis provides a comprehensive platform for building and deploying intelligent AI agents with the Claude Agent SDK:

- **Claude Agent SDK Integration**: Leverages the Claude Agent SDK to build intelligent, autonomous agents capable of reasoning, planning, and executing complex tasks.

- **Real-time WebSocket Communication**: Establishes persistent, bidirectional WebSocket connections between the frontend and Claude agents, enabling real-time interaction and streaming responses.

- **Tool Use & Code Execution**: Agents can utilize custom tools and execute code dynamically, allowing for flexible task automation and data manipulation through registered tool servers.

- **Persistent Session Management**: Maintains user sessions and agent state in MongoDB, enabling long-running conversations and workflow continuity across user interactions.

- **Skill Storage**: Store and manage reusable AI skills for complex tasks that require consistent high quality output.

- **AI Workflow Automation**: Design and execute workflow automation with Claude agents, including building presentation deck, data analysis, or information gathering.

- **Multiple Data Export Formats**: Support for generating outputs in various formats including PowerPoint presentations, PDFs, and Excel spreadsheets through built-in content generation tools.

## Tech Stack

### Backend
- **Runtime**: Python 3.12
- **Framework**: FastAPI with Uvicorn
- **API Communication**: WebSocket + REST
- **Validation**: Pydantic
- **AI/Agent**: Claude Agent SDK

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS with Typography plugin
- **Routing**: TanStack React Router with DevTools
- **Data Fetching**: TanStack React Query + Axios
- **Markdown Rendering**: React Markdown with GFM and raw HTML support
- **Code Highlighting**: React Syntax Highlighter

### Data & Persistence
- **Database**: MongoDB
- **Session Storage**: SessionStore (MongoDB-backed)
- **Skill Storage**: SkillStore (MongoDB-backed)
- **Workflow Storage**: WorkflowStore (MongoDB-backed)

### Additional Technologies
- **Artifact Generation**: via python code execution

## Architecture

### System Overview

Metropolis follows a client-server architecture with a clear separation between the frontend and backend components:

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React SPA)                 │
│         (TypeScript, Vite, TailwindCSS, React Router)   │
└────────────────────┬────────────────────────────────────┘
                     │
          WebSocket + REST APIs
                     │
┌────────────────────┴────────────────────────────────────┐
│              FastAPI Backend (Python)                   │
│                                                          │
│  ┌───────────────────────────────────────────────────┐ │
│  │         Agent Routes & Session Management          │ │
│  │  - WebSocket agent endpoint (/ws/agent)           │ │
│  │  - Session CRUD operations                        │ │
│  │  - Skill management                               │ │
│  │  - Workflow orchestration                         │ │
│  └───────────────────────────────────────────────────┘ │
│                                                          │
│  ┌───────────────────────────────────────────────────┐ │
│  │      Agent Management & Tool Integration           │ │
│  │  - Claude Agent SDK initialization                │ │
│  │  - Tool server registration (Skill, Test)         │ │
│  │  - Agent lifecycle management                     │ │
│  │  - Hook system for validation & processing        │ │
│  └───────────────────────────────────────────────────┘ │
│                                                          │
│  ┌───────────────────────────────────────────────────┐ │
│  │        MongoDB Persistence Layer                   │ │
│  │  - SessionStore (conversations & state)           │ │
│  │  - SkillStore (reusable skills & definitions)    │ │
│  │  - WorkflowStore (workflow configurations)        │ │
│  └───────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Key Components

**Frontend**
- React SPA with TanStack ecosystem (Router, Query)
- Real-time WebSocket client for agent communication
- REST API client for session, skill, and workflow management
- Markdown rendering with syntax highlighting for agent responses

**Backend API**
- **Agent Routes**: WebSocket endpoint for real-time agent interaction
- **Session Routes**: Manage user sessions and conversation history
- **Skill Routes**: CRUD operations for skill definitions and storage
- **Workflow Routes**: Design and execute AI workflows

**Agent System**
- Claude Agent SDK with configurable options (model, max turns, permissions)
- Tool servers: Skill execution server and test/multiplication server
- Hook system for validation and post-processing
- JSONL handler for structured data logging

**Data Layer**
- MongoDB collections for sessions, skills, and workflows
- Indexed for optimal query performance
- Automatic lifecycle management (create, read, update, delete)

### Data Flow

1. User interacts with React frontend
2. Frontend sends requests via WebSocket (agent) or REST APIs (sessions, skills, workflows)
3. Backend processes requests through appropriate routers and services
4. Claude Agent executes tasks, uses tools, and generates responses
5. Results are persisted to MongoDB
6. Responses are streamed back to frontend in real-time
