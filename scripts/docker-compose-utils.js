#!/usr/bin/env node

// Shared Docker Compose utilities for Node.js/JavaScript
// Import and use these functions in other JavaScript files

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Detect which Docker Compose command is available
export async function detectDockerCompose() {
  try {
    await execAsync('command -v docker-compose');
    return 'docker-compose';
  } catch {
    try {
      await execAsync('docker compose version');
      return 'docker compose';
    } catch {
      throw new Error('❌ Neither "docker-compose" nor "docker compose" is available!');
    }
  }
}

let dockerComposeCmd = null;

// Get the Docker Compose command (cached after first call)
export async function getDockerComposeCommand() {
  if (!dockerComposeCmd) {
    dockerComposeCmd = await detectDockerCompose();
    console.log(`📦 Using Docker Compose command: ${dockerComposeCmd}`);
  }
  return dockerComposeCmd;
}

// Execute Docker Compose command with arguments
export async function execDockerCompose(args, options = {}) {
  const dockerCompose = await getDockerComposeCommand();
  const command = `${dockerCompose} ${args.join(' ')}`;
  return await execAsync(command, options);
}
