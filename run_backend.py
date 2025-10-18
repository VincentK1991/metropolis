#!/usr/bin/env python3
"""Script to run the Metropolis backend server.

This script should be run with the virtual environment Python:
    .venv/bin/python run_backend.py

Or after activating the virtual environment:
    source .venv/bin/activate
    python run_backend.py
"""

import sys
from pathlib import Path

# Add src directory to Python path
src_path = Path(__file__).parent / "src"
sys.path.insert(0, str(src_path))

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "metropolis.app:app",
        host="0.0.0.0",
        port=8088,
        reload=False,  # Enable auto-reload during development
        log_level="info",
    )
