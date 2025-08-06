#!/usr/bin/env tsx

import fs from 'node:fs';
import * as dockerCompose from 'docker-compose';
import { spinner, log, intro } from '@clack/prompts';

// Database configuration with environment variable fallbacks
const DB_USER = process.env.POSTGRES_USER || 'liblab';
const DB_NAME = process.env.POSTGRES_DB || 'liblab';
const DB_PASSWORD = process.env.POSTGRES_PASSWORD || 'liblab_password';

intro(
  'Welcome to the liblab PostgreSQL setup script. This will start your local database, run migrations, generate the Prisma client, and seed your data if needed.',
);

const dbSetupSpinner = spinner();

dbSetupSpinner.start('🗄️  Setting up PostgreSQL database');

if (!fs.existsSync('docker-compose.dev.yml')) {
  dbSetupSpinner.stop('❌  docker-compose.dev.yml not found. Please ensure it exists in the current directory.');
  process.exit(1);
}

dbSetupSpinner.message('🚀 Starting PostgreSQL database');

await dockerCompose.upOne('postgres', {
  config: 'docker-compose.dev.yml',
  cwd: process.cwd(),
});

dbSetupSpinner.message('⏳ Waiting for database to be ready');

// Wait for database to be ready with retry logic
let dbReady = false;
let retries = 0;
const maxRetries = 30; // 60 seconds total

while (!dbReady && retries < maxRetries) {
  try {
    await dockerCompose.exec('postgres', `pg_isready -U ${DB_USER} -d ${DB_NAME} -q`, {
      config: 'docker-compose.dev.yml',
      cwd: process.cwd(),
    });
    dbReady = true;
  } catch {
    retries++;

    if (retries < maxRetries) {
      dbSetupSpinner.message('Waiting for PostgreSQL to be ready');
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
    } else {
      dbSetupSpinner.stop('❌ Database failed to become ready after 60 seconds');
      process.exit(1);
    }
  }
}

// Run database migrations
dbSetupSpinner.message('🔄 Running database migrations');

try {
  await dockerCompose.upOne('ai-app-dev', {
    config: 'docker-compose.dev.yml',
    cwd: process.cwd(),
  });
  await dockerCompose.exec('ai-app-dev', 'pnpm prisma migrate deploy', {
    config: 'docker-compose.dev.yml',
    cwd: process.cwd(),
  });
} catch (error) {
  dbSetupSpinner.stop('❌ Failed to run database migrations');
  log.error(JSON.stringify(error));
  process.exit(1);
}

// Generate Prisma client
dbSetupSpinner.message('🔧 Generating Prisma client');

try {
  await dockerCompose.exec('ai-app-dev', 'pnpm prisma generate', {
    config: 'docker-compose.dev.yml',
    cwd: process.cwd(),
  });
} catch (error) {
  dbSetupSpinner.stop('❌ Failed to generate Prisma client');
  log.error(JSON.stringify(error));
  process.exit(1);
}

// Seed the database (if seed script exists)
if (fs.existsSync('prisma/seed.ts')) {
  dbSetupSpinner.message('🌱 Seeding database');

  try {
    await dockerCompose.exec('ai-app-dev', 'pnpm prisma db seed', {
      config: 'docker-compose.dev.yml',
      cwd: process.cwd(),
    });
  } catch (error) {
    dbSetupSpinner.stop('❌ Failed to seed database');
    log.error(JSON.stringify(error));
    process.exit(1);
  }
}

dbSetupSpinner.stop('✅ Database setup complete!');

log.info('📊 PostgreSQL is running on localhost:5432');
log.info(`🔗 Connection: postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}`);
