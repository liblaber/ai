#!/bin/bash

# Development script for running the AI app in Docker with volume mounting

# Detect which Docker Compose command is available
detect_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    elif docker compose version &> /dev/null; then
        echo "docker compose"
    else
        echo "❌ Neither 'docker-compose' nor 'docker compose' is available!"
        exit 1
    fi
}

# Set the Docker Compose command
DOCKER_COMPOSE_CMD=$(detect_docker_compose)
echo "📦 Using Docker Compose command: $DOCKER_COMPOSE_CMD"

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
