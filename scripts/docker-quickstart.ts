#!/usr/bin/env tsx

import fs from 'node:fs';
import * as dockerCompose from 'docker-compose';
import { spinner, log, confirm } from '@clack/prompts';
import chalk from 'chalk';

const parseArgs = (): {
  force: boolean;
  fresh: boolean;
  preserve: boolean;
} => {
  const args = process.argv.slice(2);
  return {
    force: args.includes('--force') || args.includes('-f'),
    fresh: args.includes('--fresh'),
    preserve: args.includes('--preserve-db'),
  };
};

const checkExistingVolumes = async (): Promise<boolean> => {
  try {
    const result = await dockerCompose.ps({
      config: 'docker-compose.yml',
      cwd: process.cwd(),
    });

    // Check if any containers are running or if volumes exist
    return result.out.includes('liblab-postgres') || result.out.includes('liblab_ai-app');
  } catch {
    // If we can't check, assume no existing setup
    return false;
  }
};

const showVolumeWarning = async (): Promise<boolean> => {
  log.warn(chalk.yellow('⚠️  Existing Docker setup detected!'));
  log.info('This will rebuild the Docker images with the latest code.');

  const preserveDb = await confirm({
    message: 'Do you want to preserve your existing database data?',
    initialValue: true,
  });

  if (preserveDb) {
    log.info(chalk.green('✅ Database data will be preserved'));
    log.info(chalk.blue('ℹ️  Note: If there are database schema changes, you may need to run migrations manually'));
  } else {
    log.warn(chalk.red('⚠️  Database data will be LOST!'));
    log.info('This will remove all existing data including:');
    log.info('  • User accounts and settings');
    log.info('  • Generated apps and snapshots');
    log.info('  • Any custom configurations');

    const confirmed = await confirm({
      message: 'Are you sure you want to delete all existing data?',
      initialValue: false,
    });

    if (!confirmed) {
      log.info('Operation cancelled. Use --preserve-db to keep your data.');
      return false;
    }
  }

  return true;
};

const main = async (): Promise<void> => {
  const { force, fresh, preserve } = parseArgs();

  const quickstartSpinner = spinner();
  quickstartSpinner.start('🚀 Starting liblab AI quickstart');

  // Check if docker-compose.yml exists
  if (!fs.existsSync('docker-compose.yml')) {
    quickstartSpinner.stop('❌ docker-compose.yml not found. Please ensure it exists in the current directory.');
    process.exit(1);
  }

  // Check for existing setup unless forced
  if (!force && !fresh && !preserve) {
    const hasExistingSetup = await checkExistingVolumes();

    if (hasExistingSetup) {
      quickstartSpinner.stop();

      const shouldContinue = await showVolumeWarning();

      if (!shouldContinue) {
        process.exit(0);
      }

      quickstartSpinner.start('🚀 Starting liblab AI quickstart');
    }
  }

  quickstartSpinner.message('🔨 Building latest Docker images');

  try {
    // Determine compose options based on flags
    const commandOptions: string[] = ['--build'];

    if (fresh || (!preserve && !force)) {
      // Remove volumes to start fresh
      commandOptions.push('--force-recreate');
      quickstartSpinner.message('🗑️  Removing old containers and volumes');

      // Stop and remove existing containers and volumes
      try {
        await dockerCompose.down({
          config: 'docker-compose.yml',
          cwd: process.cwd(),
          commandOptions: ['-v'], // Remove volumes
        });
      } catch {
        // Ignore errors if containers don't exist
        log.info('No existing containers to remove');
      }
    }

    quickstartSpinner.message('🐳 Starting containers with latest images');

    await dockerCompose.upAll({
      config: 'docker-compose.yml',
      cwd: process.cwd(),
      commandOptions,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    quickstartSpinner.stop(`❌ Failed to start Docker environment: ${errorMessage}`);
    log.error(`Error: ${errorMessage}`);
    process.exit(1);
  }

  quickstartSpinner.stop('✅ liblab AI quickstart completed');

  if (fresh || (!preserve && !force)) {
    log.info(chalk.green('🆕 Fresh installation with latest code and clean database'));
  } else {
    log.info(chalk.blue('🔄 Updated to latest code while preserving database'));
  }

  log.info('🌐 App available at http://localhost:3000');
};

main().catch((error) => {
  log.error(`❌ Quickstart failed: ${error}`);
  process.exit(1);
});
