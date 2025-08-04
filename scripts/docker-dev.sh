#!/bin/bash

# Enable strict error handling
set -euo pipefail

# Development script for running the AI app in Docker with volume mounting

# Check if docker-compose-utils.sh exists and is readable
UTILS_PATH="$(dirname "$0")/docker-compose-utils.sh"
if [ ! -f "$UTILS_PATH" ] || [ ! -r "$UTILS_PATH" ]; then
    echo "❌ Error: Cannot find or read docker-compose-utils.sh at $UTILS_PATH"
    echo "   Please ensure the file exists and is readable."
    exit 1
fi

# Source shared Docker Compose utilities
source "$UTILS_PATH"

# Set the Docker Compose command
if ! DOCKER_COMPOSE_CMD=$(get_docker_compose_cmd); then
    echo "   Failed to detect Docker Compose. Please install Docker Compose and try again."
    exit 1
fi
readonly DOCKER_COMPOSE_CMD

echo "🚀 Starting AI app in Docker with volume mounting..."

# Check if docker-compose.dev.yml exists
if [ ! -f "docker-compose.dev.yml" ]; then
    echo "❌ docker-compose.dev.yml not found!"
    exit 1
fi

# Create prisma directory if it doesn't exist
mkdir -p prisma

# Run with docker-compose
$DOCKER_COMPOSE_CMD -f docker-compose.dev.yml up --build

echo "✅ Development environment started!"
echo "📊 Database changes will be persisted to PostgreSQL volume"
echo "🌐 App available at http://localhost:3000"
