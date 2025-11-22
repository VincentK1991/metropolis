#!/bin/bash

# Build script for containerized Claude Agent API
# This script builds the Docker image for the containerized agent

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE_NAME="containerized-claude-agent"
IMAGE_TAG="${1:-latest}"

echo "Building Docker image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo "Working directory: ${SCRIPT_DIR}"

cd "${SCRIPT_DIR}"

docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" .

echo ""
echo "Build complete!"
echo "Image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo ""
echo "To run the container, use:"
echo "  ./docker-run.sh"

