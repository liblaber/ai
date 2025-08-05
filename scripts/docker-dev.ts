#!/usr/bin/env tsx

import fs from 'node:fs';
import * as dockerCompose from 'docker-compose';
import { spinner, log } from '@clack/prompts';

const devSpinner = spinner();

devSpinner.start('🚀 Starting AI app in Docker with volume mounting');

if (!fs.existsSync('docker-compose.dev.yml')) {
  devSpinner.stop('❌  docker-compose.dev.yml not found. Please ensure it exists in the current directory.');
  process.exit(1);
}

devSpinner.message('📂 Creating prisma directory');

try {
  await fs.promises.mkdir('prisma', { recursive: true });
  devSpinner.message('📂 Prisma directory created');
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  devSpinner.stop(`❌ Failed to create prisma directory: ${errorMessage}`);
  log.error(`Error creating prisma directory: ${errorMessage}`);
  process.exit(1);
}

devSpinner.message('🔨 Building and starting AI app');

try {
  await dockerCompose.upAll({
    config: 'docker-compose.dev.yml',
    cwd: process.cwd(),
    commandOptions: ['--build'],
  });
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  devSpinner.stop(`❌ Failed to start Docker environment: ${errorMessage}`);
  process.exit(1);
}
devSpinner.message('🔨 Building and starting AI app');

await dockerCompose.upAll({
  config: 'docker-compose.dev.yml',
  cwd: process.cwd(),
  commandOptions: ['--build'],
});

devSpinner.stop('✅ Development environment started');

log.info('📊 Database changes will be persisted to PostgreSQL volume');
log.info('🌐 App available at http://localhost:3000');
