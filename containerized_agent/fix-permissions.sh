#!/bin/bash

# Fix permissions on data directory
# This script fixes ownership and permissions so you can manage files normally

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${SCRIPT_DIR}/data/claude"

if [ ! -d "${DATA_DIR}" ]; then
    echo "Data directory does not exist: ${DATA_DIR}"
    exit 1
fi

echo "Fixing permissions on: ${DATA_DIR}"
echo ""

# Check if container is running
if [ "$(docker ps -q -f name=claude-agent-container)" ]; then
    echo "Container is running, fixing permissions via docker exec..."
    HOST_UID=$(id -u)
    HOST_GID=$(id -g)
    docker exec claude-agent-container chown -R ${HOST_UID}:${HOST_GID} /home/appuser/.claude 2>/dev/null || true
    docker exec claude-agent-container chmod -R u+rwX /home/appuser/.claude 2>/dev/null || true
    echo "✓ Permissions fixed via container"
else
    echo "Container is not running, fixing permissions with sudo..."
    echo "You may be prompted for your password."
    sudo chown -R $(id -u):$(id -g) "${DATA_DIR}"
    sudo chmod -R u+rwX "${DATA_DIR}"
    echo "✓ Permissions fixed"
fi

echo ""
echo "You can now manage files in ${DATA_DIR} normally"

