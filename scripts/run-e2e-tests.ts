#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

// Types for the test modes
type TestMode = 'headed' | 'ui' | 'debug' | 'headless';

// Utility function to execute shell commands
function execCommand(command: string, cwd?: string): void {
  try {
    execSync(command, {
      stdio: 'inherit',
      cwd,
      encoding: 'utf8',
    });
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    process.exit(1);
  }
}

// Utility function to check if a URL is accessible
async function checkUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

// Main function
async function main(): Promise<void> {
  // Get mode from command line arguments, default to 'headed'
  const mode = (process.argv[2] as TestMode) || 'headed';

  console.log(`🚀 Running liblab.ai E2E tests in ${mode} mode...`);

  // Check if we're in the right directory
  if (!existsSync('tests/e2e')) {
    console.error("❌ Error: tests/e2e directory not found. Make sure you're in the project root.");
    process.exit(1);
  }

  // Check if the main app is running
  console.log('🔍 Checking if the main application is running...');

  const isAppRunning = await checkUrl('http://localhost:3000');

  if (!isAppRunning) {
    console.error('❌ Error: The main application is not running on http://localhost:3000');
    console.log('');
    console.log('Please start your application first:');
    console.log('  • For local development: npm run dev');
    console.log('  • For Docker: pnpm run quickstart');
    console.log('  • For production: npm run start');
    console.log('');
    console.log('Then run the tests again.');
    process.exit(1);
  }

  // Navigate to tests/e2e directory
  const e2eDir = join(process.cwd(), 'tests/e2e');
  process.chdir(e2eDir);

  // Install dependencies if node_modules doesn't exist
  if (!existsSync('node_modules')) {
    console.log('📦 Installing dependencies...');
    execCommand('npm install', e2eDir);
  }

  // Run the tests based on the mode using pnpm
  switch (mode) {
    case 'headed':
      console.log(' Running tests with browser visible...');
      execCommand('pnpm run test:headed', e2eDir);
      break;
    case 'ui':
      console.log(' Running tests with Playwright UI...');
      execCommand('pnpm run test:ui', e2eDir);
      break;
    case 'debug':
      console.log('🐛 Running tests in debug mode...');
      execCommand('pnpm run test:debug', e2eDir);
      break;
    case 'headless':
      console.log('👻 Running tests in headless mode...');
      execCommand('pnpm test', e2eDir);
      break;
    default:
      console.error(`❌ Invalid mode: ${mode}`);
      console.log('Available modes: headed, ui, debug, headless');
      process.exit(1);
  }

  console.log('✅ E2E tests completed!');
}

// Run the main function
main().catch((error) => {
  console.error('❌ E2E tests failed:', error);
  process.exit(1);
});
