#!/bin/bash
# Build Docker images for Metropolis frontend and backend

set -e

# Build backend image
echo "Building backend image..."
docker build -f Dockerfile.backend -t metropolis-backend:latest .

# Build frontend image
# Set VITE_API_BASE_URL to backend service URL (adjust as needed)
echo "Building frontend image..."
docker build -f Dockerfile.frontend \
  --build-arg VITE_API_BASE_URL="${VITE_API_BASE_URL:-http://localhost:8088}" \
  --build-arg VITE_WS_BASE_URL="${VITE_WS_BASE_URL:-}" \
  -t metropolis-frontend:latest .

echo "Build complete!"

