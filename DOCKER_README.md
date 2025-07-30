## Quick Start

### Development Environment

1. **Start the development environment:**

   ```bash
   ./scripts/docker-dev.sh
   ```

2. **Or manually with docker-compose:**
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

### Production Environment

1. **Start the production environment:**
   ```bash
   docker-compose up --build
   ```

## Database Setup

### Initial Database Setup

Run the database setup script to initialize the PostgreSQL database:

```bash
./scripts/docker-db-setup.sh
```

This script will:

- Start the PostgreSQL container
- Run database migrations
- Generate the Prisma client
- Seed the database (if seed script exists)

### Database Connection

- **Host:** localhost
- **Port:** 5432
- **Database:** liblab
- **Username:** liblab
- **Password:** liblab_password
- **Connection URL:** `postgresql://liblab:liblab_password@localhost:5432/liblab`

### Database Persistence

The PostgreSQL data is persisted in a Docker volume named `postgres_data`. This ensures that:

- Database changes survive container restarts
- Data is not lost when containers are recreated
- Multiple developers can use the same database setup

## Environment Variables

Create a `.env` file in the root directory with:

```env
DATABASE_URL="postgresql://liblab:liblab_password@localhost:5432/liblab"
NODE_ENV=development
```

## Useful Commands

### Database Operations

```bash
# Run migrations
docker-compose -f docker-compose.dev.yml exec ai-app-dev pnpm prisma migrate deploy

# Generate Prisma client
docker-compose -f docker-compose.dev.yml exec ai-app-dev pnpm prisma generate

# Open Prisma Studio
docker-compose -f docker-compose.dev.yml exec ai-app-dev pnpm prisma studio

# Reset database
docker-compose -f docker-compose.dev.yml exec ai-app-dev pnpm prisma migrate reset
```

### Container Management

```bash
# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop all services
docker-compose -f docker-compose.dev.yml down

# Remove volumes (⚠️ This will delete all data)
docker-compose -f docker-compose.dev.yml down -v
```

## Migration from SQLite

If you were previously using SQLite:

1. **Backup your data** (if needed)
2. **Run the database setup script** to initialize PostgreSQL
3. **Update your environment variables** to use the PostgreSQL connection string
4. **Test your application** to ensure everything works correctly

## Troubleshooting

### Database Connection Issues

1. **Check if PostgreSQL is running:**

   ```bash
   docker-compose -f docker-compose.dev.yml ps
   ```

2. **Check database logs:**

   ```bash
   docker-compose -f docker-compose.dev.yml logs postgres
   ```

3. **Reset the database:**
   ```bash
   docker-compose -f docker-compose.dev.yml down -v
   ./scripts/docker-db-setup.sh
   ```

### Volume Issues

If you need to reset the database volume:

```bash
# Stop all services
docker-compose -f docker-compose.dev.yml down

# Remove the volume
docker volume rm ai_postgres_data

# Restart and setup
./scripts/docker-db-setup.sh
```
