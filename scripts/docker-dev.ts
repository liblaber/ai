#!/usr/bin/env tsx

import fs from 'node:fs';
import path from 'node:path';
import * as dockerCompose from 'docker-compose';
import { spinner, log } from '@clack/prompts';

const devSpinner = spinner();

devSpinner.start('🚀 Starting AI app in Docker with volume mounting');

if (!fs.existsSync('docker-compose.dev.yml')) {
  devSpinner.stop('❌  docker-compose.dev.yml not found. Please ensure it exists in the current directory.');
  process.exit(1);
}

devSpinner.message('📂 Creating prisma directory');
fs.mkdirSync(path.join(process.cwd(), 'prisma'), { recursive: true });

devSpinner.message('🔨 Building and starting AI app');

await dockerCompose.upAll({
  config: 'docker-compose.dev.yml',
  cwd: process.cwd(),
  commandOptions: ['--build'],
});

devSpinner.stop('✅ Development environment started');

log.info('📊 Database changes will be persisted to PostgreSQL volume');
log.info('🌐 App available at http://localhost:3000');
