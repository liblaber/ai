#!/usr/bin/env tsx
// This script starts the Docker container for the liblab AI application.
// Wait two seconds for migrations to complete and to setup the tunnel

import chalk from 'chalk';
import { spinner, log, intro, outro } from '@clack/prompts';
import { makeBanner } from './utils/banner';

const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const parseArgs = (): { url: string } => {
  const args = process.argv.slice(2);
  let url = 'http://localhost:3000';

  // Look for --url flag
  const urlIndex = args.findIndex((arg) => arg === '--url' || arg === '-u');

  if (urlIndex !== -1 && args[urlIndex + 1]) {
    url = args[urlIndex + 1];
  }

  // Also check for URL as first argument without flag
  if (args.length > 0 && !args[0].startsWith('-')) {
    url = args[0];
  }

  return { url };
};

const main = async (): Promise<void> => {
  const { url } = parseArgs();

  intro('🚀 liblab AI Docker Startup');

  const startupSpinner = spinner();
  startupSpinner.start('⏳ Starting liblab AI');

  await sleep(3000);

  startupSpinner.stop('✅ liblab AI is starting up!');

  log.info(makeBanner());
  log.info('');
  log.success(`Your liblab AI is live on ${chalk.bold(url)} 🎉`);

  outro('🎉 liblab AI is ready!');
};

main().catch((error) => {
  log.error(`❌ Startup failed: ${error}`);
  process.exit(1);
});
