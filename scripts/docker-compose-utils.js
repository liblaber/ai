#!/usr/bin/env node

// Shared Docker Compose utilities for Node.js/JavaScript
// Import and use these functions in other JavaScript files

import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Detect which Docker Compose command is available
export async function detectDockerCompose() {
  try {
    await execAsync('docker-compose --version');
    return 'docker-compose';
  } catch {
    try {
      await execAsync('docker compose --version');
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

// Execute Docker Compose command with arguments safely
export async function execDockerCompose(args, options = {}) {
  const dockerCompose = await getDockerComposeCommand();

  // Split the docker compose command in case it contains spaces (e.g., "docker compose")
  const cmdParts = dockerCompose.split(' ');
  const command = cmdParts[0]; // e.g., "docker"
  const baseArgs = cmdParts.slice(1); // e.g., ["compose"]
  const allArgs = [...baseArgs, ...args]; // e.g., ["compose", "-f", "docker-compose.yml", "up"]

  return new Promise((resolve, reject) => {
    const child = spawn(command, allArgs, {
      stdio: 'pipe',
      ...options,
    });

    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error = new Error(`Docker Compose command failed with exit code ${code}`);
        error.code = code;
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Execute Docker Compose command with inherited stdio (for interactive commands)
export async function execDockerComposeInherited(args, options = {}) {
  const dockerCompose = await getDockerComposeCommand();

  // Split the docker compose command in case it contains spaces (e.g., "docker compose")
  const cmdParts = dockerCompose.split(' ');
  const command = cmdParts[0]; // e.g., "docker"
  const baseArgs = cmdParts.slice(1); // e.g., ["compose"]
  const allArgs = [...baseArgs, ...args]; // e.g., ["compose", "-f", "docker-compose.yml", "up"]

  return new Promise((resolve, reject) => {
    const child = spawn(command, allArgs, {
      stdio: 'inherit',
      ...options,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        const error = new Error(`Docker Compose command failed with exit code ${code}`);
        error.code = code;
        reject(error);
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}
