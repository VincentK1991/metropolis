#!/bin/bash
# Convenience script to start the backend with proper venv activation

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Activate virtual environment
source "$SCRIPT_DIR/.venv/bin/activate"

# Run the backend
python "$SCRIPT_DIR/run_backend.py"

