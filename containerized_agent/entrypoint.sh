#!/bin/bash
set -e

# Copy skills to mounted volume if they don't exist
# This handles the case where the volume mount overwrites the image contents
if [ ! -d "/home/appuser/.claude/skills" ] || [ -z "$(ls -A /home/appuser/.claude/skills 2>/dev/null)" ]; then
    echo "Initializing Claude skills in mounted volume..."
    mkdir -p /home/appuser/.claude/skills
    cp -r /opt/claude-skills/* /home/appuser/.claude/skills/ 2>/dev/null || true
    echo "Skills initialized"
fi

# Execute the original command
exec "$@"

