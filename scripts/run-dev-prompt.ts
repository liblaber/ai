#!/usr/bin/env tsx

import { spawn } from 'node:child_process';
import { outro, confirm, cancel, isCancel, intro } from '@clack/prompts';
import { makeBanner } from './utils/banner';

function runPrismaGenerate(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('🔧 Generating Prisma client');

    const prismaProcess = spawn('pnpm', ['run', 'prisma:generate'], {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd(),
    });

    prismaProcess.on('error', (error) => {
      console.error('Error generating Prisma client:', error);
      reject(error);
    });

    prismaProcess.on('exit', (code) => {
      if (code === 0) {
        console.log('✅ Prisma client generated successfully');
        resolve();
      } else {
        reject(new Error(`Prisma generate failed with code ${code}`));
      }
    });
  });
}

function runPnpmDev(): void {
  console.log('🚀 Starting liblab AI builder');

  const pnpmProcess = spawn('pnpm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd(),
  });

  pnpmProcess.on('error', (error) => {
    console.error('Error starting pnpm dev:', error);
    process.exit(1);
  });

  pnpmProcess.on('exit', (code) => {
    process.exit(code || 0);
  });
}

async function main(): Promise<void> {
  intro(makeBanner());

  const shouldRun = await confirm({
    message: 'Do you want to run the liblab AI builder?',
  });

  if (isCancel(shouldRun)) {
    cancel('Operation cancelled.');
    return;
  }

  if (shouldRun) {
    try {
      await runPrismaGenerate();
      runPnpmDev();
    } catch (error) {
      console.error('Failed to generate Prisma client:', error);
      process.exit(1);
    }
  } else {
    outro('You can run it later using: \x1b[1;32mpnpm run dev\x1b[0m');
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
