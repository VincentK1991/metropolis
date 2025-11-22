#!/bin/bash

# Cleanup script for containerized Claude Agent API
# This script removes the container, volumes, and image

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE_NAME="containerized-claude-agent"
IMAGE_TAG="${1:-latest}"
CONTAINER_NAME="claude-agent-container"
DATA_DIR="${SCRIPT_DIR}/data"

echo "Cleaning up containerized Claude Agent resources..."
echo ""

# Stop and remove container if it exists
if [ "$(docker ps -aq -f name=${CONTAINER_NAME})" ]; then
    echo "Stopping container: ${CONTAINER_NAME}"
    docker stop ${CONTAINER_NAME} > /dev/null 2>&1 || true

    echo "Removing container: ${CONTAINER_NAME}"
    docker rm ${CONTAINER_NAME} > /dev/null 2>&1 || true
    echo "✓ Container removed"
else
    echo "No container found: ${CONTAINER_NAME}"
fi

echo ""

# Remove image if it exists
if [ "$(docker images -q ${IMAGE_NAME}:${IMAGE_TAG} 2> /dev/null)" ]; then
    echo "Removing image: ${IMAGE_NAME}:${IMAGE_TAG}"
    docker rmi ${IMAGE_NAME}:${IMAGE_TAG} > /dev/null 2>&1 || true
    echo "✓ Image removed"
else
    echo "No image found: ${IMAGE_NAME}:${IMAGE_TAG}"
fi

# Also remove any untagged versions of the image
if [ "$(docker images -q ${IMAGE_NAME} 2> /dev/null)" ]; then
    echo "Removing untagged image: ${IMAGE_NAME}"
    docker rmi ${IMAGE_NAME} > /dev/null 2>&1 || true
    echo "✓ Untagged image removed"
fi

echo ""

# Optionally remove data directory (commented out by default for safety)
# Uncomment the following lines if you want to also delete the persistent data
if [ "${CLEANUP_DATA:-false}" = "true" ]; then
    if [ -d "${DATA_DIR}" ]; then
        echo "Removing data directory: ${DATA_DIR}"
        rm -rf "${DATA_DIR}"
        echo "✓ Data directory removed"
    else
        echo "No data directory found: ${DATA_DIR}"
    fi
else
    echo "Data directory preserved: ${DATA_DIR}"
    echo "  (Set CLEANUP_DATA=true to remove it)"
fi

echo ""
echo "Cleanup complete!"
echo ""
echo "To also remove the data directory, run:"
echo "  CLEANUP_DATA=true ./docker-cleanup.sh"

