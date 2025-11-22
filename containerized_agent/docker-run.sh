#!/bin/bash

# Run script for containerized Claude Agent API
# This script runs the Docker container with volume mounts for statefulness

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE_NAME="containerized-claude-agent"
IMAGE_TAG="${1:-latest}"
CONTAINER_NAME="claude-agent-container"

# Check if ANTHROPIC_API_KEY is set
if [ -z "${ANTHROPIC_API_KEY}" ]; then
    echo "Error: ANTHROPIC_API_KEY environment variable is not set"
    echo "Please set it before running:"
    echo "  export ANTHROPIC_API_KEY='your-api-key-here'"
    exit 1
fi

# Create data directory for persistent storage if it doesn't exist
DATA_DIR="${SCRIPT_DIR}/data"
mkdir -p "${DATA_DIR}/claude"
mkdir -p "${DATA_DIR}/workspace"

# Create claude projects directory structure
mkdir -p "${DATA_DIR}/claude/projects"

echo "Starting container: ${CONTAINER_NAME}"
echo "Image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo "Data directory: ${DATA_DIR}"
echo ""

# Stop and remove existing container if it exists
if [ "$(docker ps -aq -f name=${CONTAINER_NAME})" ]; then
    echo "Stopping existing container..."
    docker stop ${CONTAINER_NAME} > /dev/null 2>&1 || true
    echo "Removing existing container..."
    docker rm ${CONTAINER_NAME} > /dev/null 2>&1 || true
fi

# Run the container with volume mounts for statefulness
# Using /home/appuser/.claude since we run as non-root user
# Mount workspace directory for agent working files
docker run -d \
    --name ${CONTAINER_NAME} \
    -p 8089:8089 \
    -e ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY}" \
    -e AGENT_WORKING_DIR="/app/workspace" \
    -v "${DATA_DIR}/claude:/home/appuser/.claude" \
    -v "${DATA_DIR}/workspace:/app/workspace" \
    --restart unless-stopped \
    ${IMAGE_NAME}:${IMAGE_TAG}

# Wait a moment for container to start
sleep 2

# Fix permissions on mounted volume so host user can access all directories
echo "Fixing permissions on data directory..."
if [ "$(docker ps -q -f name=${CONTAINER_NAME})" ]; then
    # Get current user's UID and GID
    HOST_UID=$(id -u)
    HOST_GID=$(id -g)

    # Fix permissions inside container (using appuser's home directory and workspace)
    docker exec ${CONTAINER_NAME} chown -R ${HOST_UID}:${HOST_GID} /home/appuser/.claude 2>/dev/null || true
    docker exec ${CONTAINER_NAME} chmod -R u+rwX /home/appuser/.claude 2>/dev/null || true
    docker exec ${CONTAINER_NAME} chown -R ${HOST_UID}:${HOST_GID} /app/workspace 2>/dev/null || true
    docker exec ${CONTAINER_NAME} chmod -R u+rwX /app/workspace 2>/dev/null || true

    # Ensure Claude skills are copied to mounted volume (backup in case entrypoint didn't run)
    if ! docker exec ${CONTAINER_NAME} test -d /home/appuser/.claude/skills 2>/dev/null || \
       [ -z "$(docker exec ${CONTAINER_NAME} ls -A /home/appuser/.claude/skills 2>/dev/null)" ]; then
        echo "Copying Claude skills to mounted volume..."
        docker exec ${CONTAINER_NAME} bash -c "mkdir -p /home/appuser/.claude/skills && cp -r /opt/claude-skills/* /home/appuser/.claude/skills/ 2>/dev/null || true" || true
        docker exec ${CONTAINER_NAME} chown -R ${HOST_UID}:${HOST_GID} /home/appuser/.claude/skills 2>/dev/null || true
        echo "✓ Skills copied"
    fi

    echo "✓ Permissions fixed"
else
    echo "Warning: Container not running, skipping permission fix"
fi

echo "Container started successfully!"
echo ""
echo "Container name: ${CONTAINER_NAME}"
echo "API endpoint: http://localhost:8089"
echo "Data persisted in: ${DATA_DIR}"
echo ""
echo "To view logs:"
echo "  docker logs -f ${CONTAINER_NAME}"
echo ""
echo "To stop the container:"
echo "  docker stop ${CONTAINER_NAME}"
echo ""
echo "To remove the container:"
echo "  docker rm ${CONTAINER_NAME}"

