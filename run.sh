#!/bin/bash
# Run Docker containers for Metropolis frontend and backend

set -e

# Default values
BACKEND_PORT=${BACKEND_PORT:-8088}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Detect MongoDB host for container access
# On Linux, use Docker bridge gateway; on Docker Desktop, use host.docker.internal
if [ -z "${MONGODB_HOST}" ]; then
  # Try to detect Docker bridge gateway IP (works on Linux)
  DOCKER_GATEWAY=$(docker network inspect bridge --format '{{range .IPAM.Config}}{{.Gateway}}{{end}}' 2>/dev/null || echo "")

  if [ -n "${DOCKER_GATEWAY}" ]; then
    MONGODB_HOST="${DOCKER_GATEWAY}"
    echo "Detected Docker bridge gateway: ${MONGODB_HOST}"
  else
    # Fallback: use host.docker.internal (works on Docker Desktop)
    MONGODB_HOST="host.docker.internal"
    echo "Using host.docker.internal (Docker Desktop mode)"
  fi
fi

# Build MongoDB URI if not provided
if [ -z "${MONGODB_URI}" ]; then
  MONGODB_USER=${MONGODB_USER:-user}
  MONGODB_PASS=${MONGODB_PASS:-test1234}
  MONGODB_PORT=${MONGODB_PORT:-27017}
  MONGODB_URI="mongodb://${MONGODB_USER}:${MONGODB_PASS}@${MONGODB_HOST}:${MONGODB_PORT}/"
fi

CORS_ORIGINS=${CORS_ORIGINS:-"http://localhost:${FRONTEND_PORT}"}

# Run backend container
echo "Starting backend container..."
docker run -d \
  --name metropolis-backend \
  -p ${BACKEND_PORT}:8088 \
  -e MONGODB_URI="${MONGODB_URI}" \
  -e MONGODB_DATABASE="${MONGODB_DATABASE:-agent_sessions}" \
  -e CORS_ORIGINS="${CORS_ORIGINS}" \
  metropolis-backend:latest

# Run frontend container
echo "Starting frontend container..."
docker run -d \
  --name metropolis-frontend \
  -p ${FRONTEND_PORT}:80 \
  metropolis-frontend:latest

echo "Containers started!"
echo "Backend: http://localhost:${BACKEND_PORT}"
echo "Frontend: http://localhost:${FRONTEND_PORT}"

