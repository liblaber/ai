#!/bin/bash

# Enable strict error handling
set -euo pipefail

# Database setup script for PostgreSQL in Docker

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

echo "🗄️  Setting up PostgreSQL database..."

# Check if docker-compose.dev.yml exists
if [ ! -f "docker-compose.dev.yml" ]; then
    echo "❌ docker-compose.dev.yml not found!"
    exit 1
fi

# Start the database service only
echo "🚀 Starting PostgreSQL database..."
$DOCKER_COMPOSE_CMD -f docker-compose.dev.yml up -d postgres

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until $DOCKER_COMPOSE_CMD -f docker-compose.dev.yml exec -T postgres pg_isready -U liblab -d liblab -q; do
	  echo "Waiting for PostgreSQL to be ready..."
	  sleep 2
done

# Run database migrations
echo "🔄 Running database migrations..."
$DOCKER_COMPOSE_CMD -f docker-compose.dev.yml exec ai-app-dev pnpm prisma migrate deploy

# Generate Prisma client
echo "🔧 Generating Prisma client..."
$DOCKER_COMPOSE_CMD -f docker-compose.dev.yml exec ai-app-dev pnpm prisma generate

# Seed the database (if seed script exists)
if [ -f "prisma/seed.ts" ]; then
    echo "🌱 Seeding database..."
    $DOCKER_COMPOSE_CMD -f docker-compose.dev.yml exec ai-app-dev pnpm prisma db seed
fi

echo "✅ Database setup complete!"
echo "📊 PostgreSQL is running on localhost:5432"
echo "🔗 Connection: postgresql://liblab:liblab_password@localhost:5432/liblab"
