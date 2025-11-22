# Containerized Claude Agent API

A containerized FastAPI backend that provides a sandbox execution environment for Claude Agent SDK.

## Features

- POST `/query` endpoint for executing queries with Claude Agent SDK
- Support for session creation and resumption
- Server-Sent Events (SSE) streaming responses
- CORS enabled for cross-origin requests
- Runs on port 8089

## Prerequisites

- Docker installed
- `ANTHROPIC_API_KEY` environment variable set

## Building the Docker Image

### Using the build script (recommended):

```bash
cd containerized_agent
./docker-build.sh
```

Or specify a custom tag:

```bash
./docker-build.sh v1.0.0
```

### Manual build:

```bash
cd containerized_agent
docker build -t containerized-claude-agent .
```

## Running the Container

### Using the run script (recommended):

The run script automatically handles volume mounts for statefulness and checks for the API key:

```bash
cd containerized_agent
export ANTHROPIC_API_KEY="your-api-key-here"
./docker-run.sh
```

Or specify a custom image tag:

```bash
./docker-run.sh v1.0.0
```

The script will:
- Create a `data/` directory for persistent storage
- Mount the Claude session data directory (`~/.claude`) to persist sessions across container restarts
- Run the container in detached mode with auto-restart
- Display helpful commands for managing the container

### Manual run:

```bash
# Create data directory first
mkdir -p ./data/claude

# Run with volume mount for statefulness
docker run -d \
  --name claude-agent-container \
  -p 8089:8089 \
  -e ANTHROPIC_API_KEY="your-api-key-here" \
  -v "$(pwd)/data/claude:/root/.claude" \
  --restart unless-stopped \
  containerized-claude-agent
```

### Managing the Container

```bash
# View logs
docker logs -f claude-agent-container

# Stop the container
docker stop claude-agent-container

# Start the container (if stopped)
docker start claude-agent-container

# Remove the container
docker rm claude-agent-container
```

### Cleanup

To remove the container, image, and optionally the data directory:

```bash
# Remove container and image (preserves data directory)
./docker-cleanup.sh

# Remove container, image, AND data directory
CLEANUP_DATA=true ./docker-cleanup.sh

# Remove specific image tag
./docker-cleanup.sh v1.0.0
```

The cleanup script will:
- Stop and remove the container
- Remove the Docker image
- Optionally remove the data directory (if `CLEANUP_DATA=true`)

## Statefulness

The container uses volume mounts to persist session data:
- **Session data**: Mounted at `./data/claude` (maps to `/root/.claude` in container)
- **JSONL files**: Stored in `./data/claude/projects/` directory
- Sessions persist across container restarts, allowing you to resume conversations using the `session_id`

## API Usage

### POST /query

Execute a query with optional session resumption.

**Request Body:**
```json
{
  "user_input": "Your question or prompt here",
  "session_id": "optional-session-id-to-resume"
}
```

**Response:**
Server-Sent Events stream with the following message types:
- `session_created`: Contains the session_id when a new session is created
- `text`: Text content from the assistant
- `thinking`: Thinking process content
- `tool_use`: Tool usage information
- `tool_result`: Tool execution results
- `complete`: Indicates the stream has finished

**Example using curl:**
```bash
curl -X POST http://localhost:8089/query \
  -H "Content-Type: application/json" \
  -d '{"user_input": "Hello, what can you do?"}' \
  --no-buffer
```

**Example using JavaScript (fetch):**
```javascript
const response = await fetch('http://localhost:8089/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    user_input: 'Hello, what can you do?',
    session_id: null // or existing session_id to resume
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      console.log('Event:', data);
    }
  }
}
```

## Session Management

- **New Session**: Omit `session_id` or set it to `null`. The API will create a new session and return the `session_id` in a `session_created` event.
- **Resume Session**: Provide an existing `session_id` to continue a previous conversation.

## Development

### Local Setup (without Docker)

1. Install `uv`:
```bash
pip install uv
```

2. Install dependencies:
```bash
cd containerized_agent
uv sync
```

3. Install Claude Code:
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

4. Set environment variable:
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

5. Run the application:
```bash
uv run uvicorn containerized_agent.main:app --host 0.0.0.0 --port 8089
```

## Configuration

The service uses the following Claude Agent SDK configuration:
- Model: `claude-sonnet-4-5`
- Max turns: 100
- Permission mode: `bypassPermissions`
- Max thinking tokens: 4000

## License

Part of the Metropolis project.

