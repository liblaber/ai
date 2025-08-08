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
    console.error(`❌ Command failed: ${command}`, error);
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

// Check prerequisites (directory, app running)
async function checkPrerequisites(): Promise<void> {
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
    console.log('  • For local development: pnpm run dev');
    console.log('  • For Docker: pnpm run quickstart');
    console.log('  • For production: pnpm run start');
    console.log('');
    console.log('Then run the tests again.');
    process.exit(1);
  }
}

// Setup e2e directory and dependencies
function setupE2EDirectory(): string {
  const e2eDir = join(process.cwd(), 'tests/e2e');
  process.chdir(e2eDir);

  // Install dependencies if node_modules doesn't exist
  if (!existsSync('node_modules')) {
    console.log('📦 Installing dependencies...');
    execCommand('npm install', e2eDir);
  }

  return e2eDir;
}

// Get test command and description based on mode
function getTestCommand(mode: TestMode | undefined): { command: string; description: string } {
  switch (mode) {
    case 'headed':
      return { command: 'npm run test:headed', description: 'in headed mode' };
    case 'ui':
      return { command: 'npm run test:ui', description: 'with Playwright UI' };
    case 'debug':
      return { command: 'npm run test:debug', description: 'in debug mode' };
    case 'headless':
      return { command: 'npm run test:headless', description: 'in headless mode' };
    default:
      return { command: 'npm test', description: 'in default mode (browser visible in non-CI environments)' };
  }
}

// Main function
async function main(): Promise<void> {
  const mode = process.argv[2] as TestMode;
  const { command, description } = getTestCommand(mode);

  console.log(`🚀 Running liblab.ai E2E tests ${description}...`);

  await checkPrerequisites();

  const e2eDir = setupE2EDirectory();

  console.log(`🎯 Running tests ${description}...`);
  execCommand(command, e2eDir);
  console.log('✅ E2E tests completed!');
}

// Run the main function
main().catch((error) => {
  console.error('❌ E2E tests failed:', error);
  process.exit(1);
});
