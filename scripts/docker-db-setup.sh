#!/bin/bash

# Database setup script for PostgreSQL in Docker

echo "🗄️  Setting up PostgreSQL database..."

# Check if docker-compose.dev.yml exists
if [ ! -f "docker-compose.dev.yml" ]; then
    echo "❌ docker-compose.dev.yml not found!"
    exit 1
fi

# Start the database service only
echo "🚀 Starting PostgreSQL database..."
docker-compose -f docker-compose.dev.yml up -d postgres

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U liblab -d liblab -q; do
	  echo "Waiting for PostgreSQL to be ready..."
	  sleep 2
done

# Run database migrations
echo "🔄 Running database migrations..."
docker-compose -f docker-compose.dev.yml exec ai-app-dev pnpm prisma migrate deploy

# Generate Prisma client
echo "🔧 Generating Prisma client..."
docker-compose -f docker-compose.dev.yml exec ai-app-dev pnpm prisma generate

# Seed the database (if seed script exists)
if [ -f "prisma/seed.ts" ]; then
    echo "🌱 Seeding database..."
    docker-compose -f docker-compose.dev.yml exec ai-app-dev pnpm prisma db seed
fi

echo "✅ Database setup complete!"
echo "📊 PostgreSQL is running on localhost:5432"
echo "🔗 Connection: postgresql://liblab:liblab_password@localhost:5432/liblab"
