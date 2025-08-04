#!/bin/bash

# Development script for running the AI app in Docker with volume mounting

# Source shared Docker Compose utilities
source "$(dirname "$0")/docker-compose-utils.sh"

# Set the Docker Compose command
DOCKER_COMPOSE_CMD=$(get_docker_compose_cmd)

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
