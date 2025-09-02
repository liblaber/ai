#!/usr/bin/env tsx

import * as dockerCompose from 'docker-compose';
import { spinner, log, confirm, select } from '@clack/prompts';
import chalk from 'chalk';
import { execSync } from 'child_process';

const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const result = await dockerCompose.ps({
      config: 'docker-compose.yml',
      cwd: process.cwd(),
    });

    return result.out.includes('liblab-postgres') && result.out.includes('Up');
  } catch {
    return false;
  }
};

const runMigrations = async (): Promise<void> => {
  const migrateSpinner = spinner();
  migrateSpinner.start('🔄 Running database migrations');

  try {
    // Run Prisma migrations inside the container
    execSync('docker compose exec ai-app pnpm prisma migrate deploy', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    migrateSpinner.stop('✅ Database migrations completed successfully');
  } catch (error) {
    migrateSpinner.stop('❌ Database migrations failed');
    log.error(`Migration error: ${JSON.stringify(error)}`);
    throw error;
  }
};

const backupDatabase = async (): Promise<void> => {
  const backupSpinner = spinner();
  backupSpinner.start('💾 Creating database backup');

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `backup-${timestamp}.sql`;

    execSync(`docker compose exec -T postgres pg_dump -U liblab liblab > ${backupFile}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    backupSpinner.stop(`✅ Database backed up to ${backupFile}`);
    log.info(chalk.blue(`Backup saved as: ${backupFile}`));
  } catch (error) {
    backupSpinner.stop('❌ Database backup failed');
    log.error(`Backup error: ${JSON.stringify(error)}`);
    throw error;
  }
};

const main = async (): Promise<void> => {
  log.info(chalk.bold('🔄 liblab AI Database Migration Tool'));
  log.info('');

  // Check if database is running
  const isDbHealthy = await checkDatabaseHealth();

  if (!isDbHealthy) {
    log.error('❌ Database is not running. Please start the application first with:');
    log.info('  pnpm run quickstart');
    process.exit(1);
  }

  const migrationType = await select({
    message: 'What type of migration do you want to perform?',
    options: [
      {
        value: 'auto',
        label: 'Auto-migrate (recommended)',
        hint: 'Automatically run Prisma migrations to update schema',
      },
      {
        value: 'backup-migrate',
        label: 'Backup and migrate',
        hint: 'Create backup before running migrations',
      },
      {
        value: 'backup-only',
        label: 'Backup only',
        hint: 'Just create a database backup',
      },
      {
        value: 'reset',
        label: 'Reset database (DANGER)',
        hint: 'Reset database and lose all data',
      },
    ],
  });

  switch (migrationType) {
    case 'auto':
      await runMigrations();
      break;

    case 'backup-migrate':
      await backupDatabase();
      await runMigrations();
      break;

    case 'backup-only':
      await backupDatabase();
      break;

    case 'reset': {
      const confirmed = await confirm({
        message: 'Are you sure you want to reset the database? This will DELETE ALL DATA!',
        initialValue: false,
      });

      if (confirmed) {
        const resetSpinner = spinner();
        resetSpinner.start('🗑️ Resetting database');

        try {
          execSync('docker compose exec ai-app pnpm prisma migrate reset --force', {
            stdio: 'inherit',
            cwd: process.cwd(),
          });

          resetSpinner.stop('✅ Database reset completed');
        } catch (error) {
          resetSpinner.stop('❌ Database reset failed');
          log.error(`Reset error: ${JSON.stringify(error)}`);
          throw error;
        }
      } else {
        log.info('Database reset cancelled');
      }

      break;
    }

    default:
      log.error('Invalid migration type');
      process.exit(1);
  }

  log.info('');
  log.success('🎉 Migration process completed!');
  log.info('🌐 Your app is available at http://localhost:3000');
};

main().catch((error) => {
  log.error(`❌ Migration failed: ${error}`);
  process.exit(1);
});
