#!/bin/bash

# Local deployment script with hot reloading
# Runs the FastAPI app directly with uvicorn --reload

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if ANTHROPIC_API_KEY is set
if [ -z "${ANTHROPIC_API_KEY}" ]; then
    echo "Error: ANTHROPIC_API_KEY environment variable is not set"
    echo "Please set it before running:"
    echo "  export ANTHROPIC_API_KEY='your-api-key-here'"
    exit 1
fi

cd "${SCRIPT_DIR}"

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "Error: uv is not installed"
    echo "Install it with: pip install uv"
    exit 1
fi

# Sync dependencies if needed
if [ ! -f "uv.lock" ]; then
    echo "Installing dependencies..."
    uv sync
fi

# Run with hot reload
PORT=${PORT:-8089}
echo "Starting local server on http://localhost:${PORT}"
echo "Hot reload enabled - changes will auto-reload"
echo "Press Ctrl+C to stop"
echo ""

uv run uvicorn containerized_agent.main:app --host 0.0.0.0 --port "${PORT}" --reload

