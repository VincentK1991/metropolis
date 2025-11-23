#!/bin/bash
set -e

# Note: Volume initialization is now handled by Kubernetes init container
# This entrypoint just ensures the directory structure exists as a fallback
# and fixes permissions if needed

# Ensure /home/appuser/.claude directory structure exists (fallback)
if [ ! -d "/home/appuser/.claude" ]; then
    echo "Warning: /home/appuser/.claude not found, creating..."
    mkdir -p /home/appuser/.claude
fi

# Create projects directory if it doesn't exist (fallback)
if [ ! -d "/home/appuser/.claude/projects" ]; then
    echo "Creating /home/appuser/.claude/projects directory..."
    mkdir -p /home/appuser/.claude/projects
fi

# Ensure skills directory exists (init container should have populated it)
if [ ! -d "/home/appuser/.claude/skills" ]; then
    echo "Warning: /home/appuser/.claude/skills not found, initializing..."
    mkdir -p /home/appuser/.claude/skills
    # Only copy if init container didn't run (fallback)
    if [ -d "/opt/claude-skills" ] && [ -n "$(ls -A /opt/claude-skills 2>/dev/null)" ]; then
        cp -r /opt/claude-skills/* /home/appuser/.claude/skills/ 2>/dev/null || true
        echo "Skills initialized (fallback)"
    fi
fi

# Fix permissions (in case volume mount changed them)
chmod -R u+rwX /home/appuser/.claude 2>/dev/null || true

# Execute the original command
exec "$@"

