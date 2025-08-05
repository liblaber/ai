#!/usr/bin/env tsx

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import * as dockerCompose from 'docker-compose';
import { spinner, log, intro, outro } from '@clack/prompts';

async function waitForDatabase(): Promise<void> {
  const dbSpinner = spinner();
  dbSpinner.start('⏳ Waiting for database to be ready');

  while (true) {
    try {
      await dockerCompose.exec('postgres', 'pg_isready -U liblab -d liblab', {
        config: 'docker-compose.db.yml',
        cwd: process.cwd(),
      });
      dbSpinner.stop('✅ Database is ready!');
      break;
    } catch {
      dbSpinner.message('Database not ready yet, waiting');
      await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    }
  }
}

async function updateEnvFile(): Promise<void> {
  const envPath: string = '.env';
  const databaseUrl: string = 'DATABASE_URL=postgresql://liblab:liblab_password@localhost:5432/liblab';

  let envContent: string = '';

  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, 'utf8');
  }

  // Check if DATABASE_URL already exists in the file
  const lines: string[] = envContent.split('\n');
  const databaseUrlIndex: number = lines.findIndex((line: string) => line.startsWith('DATABASE_URL='));

  if (databaseUrlIndex !== -1) {
    // Update existing DATABASE_URL
    lines[databaseUrlIndex] = databaseUrl;
  } else {
    // Add new DATABASE_URL
    lines.push(databaseUrl);
  }

  // Write back to .env file
  writeFileSync(envPath, lines.join('\n'));
  log.success('📝 Updated .env file with DATABASE_URL');
}

async function main(): Promise<void> {
  intro('🚀 liblab AI Development with Database Setup');

  const setupSpinner = spinner();

  try {
    setupSpinner.start('🚀 Starting PostgreSQL database in Docker');

    await dockerCompose.upAll({
      config: 'docker-compose.db.yml',
      cwd: process.cwd(),
    });

    setupSpinner.message('✅ PostgreSQL database started successfully');

    await waitForDatabase();

    // Update .env file with DATABASE_URL
    await updateEnvFile();

    setupSpinner.message('🔧 Starting Next.js development server');
    setupSpinner.stop('   Database URL: postgresql://liblab:liblab_password@localhost:5432/liblab');

    outro('🎉 Setup complete! Your development environment is ready.');
  } catch (error) {
    setupSpinner.stop(`❌ Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

main();
