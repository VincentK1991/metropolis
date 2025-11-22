#!/bin/bash

# Script to query the containerized Claude Agent API and display streaming output nicely

set -e

# Default values
API_URL="${API_URL:-http://localhost:8089}"
SESSION_ID="${SESSION_ID:-}"

# Check if user input is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 'your query here' [session_id]"
    echo "Or set environment variables:"
    echo "  API_URL=http://localhost:8089"
    echo "  SESSION_ID=optional-session-id"
    echo ""
    echo "Example: $0 'Hello, what can you do?'"
    echo "Example: $0 'Continue from where we left off' 'abc123-session-id'"
    exit 1
fi

USER_INPUT="$1"
SESSION_ID="${2:-${SESSION_ID}}"

# Build request body
if [ -z "$SESSION_ID" ]; then
    REQUEST_BODY=$(cat <<EOF
{
  "user_input": "$USER_INPUT"
}
EOF
)
else
    REQUEST_BODY=$(cat <<EOF
{
  "user_input": "$USER_INPUT",
  "session_id": "$SESSION_ID"
}
EOF
)
fi

echo "Querying: $API_URL/query"
if [ -n "$SESSION_ID" ]; then
    echo "Session ID: $SESSION_ID"
fi
echo "Input: $USER_INPUT"
echo ""
echo "--- Response ---"
echo ""

# Create a temporary Python script for parsing
TMP_SCRIPT=$(mktemp)
cat > "$TMP_SCRIPT" <<'PYTHON_EOF'
import json
import sys

for line in sys.stdin:
    line = line.strip()
    if not line or not line.startswith('data: '):
        continue

    json_str = line[6:]  # Remove 'data: ' prefix

    try:
        data = json.loads(json_str)
        msg_type = data.get('type', 'unknown')

        if msg_type == 'session_created':
            session_id = data.get('session_id', '')
            print(f'\n\033[1;32m[SESSION CREATED: {session_id}]\033[0m\n', flush=True)
        elif msg_type == 'text':
            content = data.get('content', '')
            print(content, end='', flush=True)
        elif msg_type == 'thinking':
            content = data.get('content', '')
            print(f'\n\033[1;33m[THINKING]\033[0m {content}', end='', flush=True)
        elif msg_type == 'tool_use':
            tool_name = data.get('toolName', 'unknown')
            print(f'\n\033[1;36m[TOOL USE: {tool_name}]\033[0m', flush=True)
        elif msg_type == 'tool_result':
            content = str(data.get('content', ''))
            if len(content) > 200:
                content = content[:200] + '...'
            print(f'\n\033[1;35m[TOOL RESULT]\033[0m {content}', flush=True)
        elif msg_type == 'complete':
            print('\n\n\033[1;32m[COMPLETE]\033[0m', flush=True)
        else:
            print(f'\n[{msg_type}] {json.dumps(data)}', flush=True)
    except Exception:
        # If JSON parsing fails, print raw data
        print(json_str, flush=True)
PYTHON_EOF

# Make request and process SSE stream
curl -s -X POST "$API_URL/query" \
    -H "Content-Type: application/json" \
    -d "$REQUEST_BODY" \
    --no-buffer | python3 "$TMP_SCRIPT"

# Cleanup
rm -f "$TMP_SCRIPT"

echo ""
echo ""
echo "--- End of Response ---"
