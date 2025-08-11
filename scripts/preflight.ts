#!/usr/bin/env tsx

import { $ } from 'zx';

import { intro, spinner } from '@clack/prompts';

const dependencies: string[] = ['node', 'npm', 'pnpm', 'docker', 'dockerCompose'];

interface Command {
  displayName: string;
  cmd: string;
  args?: string[];
  installCmd?: string;
  installArgs?: string[];
}

const main = async (): Promise<void> => {
  intro('🚀 liblab AI Preflight Check');

  // We need to check if the user has the following:
  // - Node.js installed
  // - NPM installed
  // - pnpm installed (if not, we need to install it)
  // - Docker installed
  // - Docker is running

  const commands: Record<(typeof dependencies)[number], Command> = {
    node: {
      displayName: 'Node.js',
      cmd: 'node',
      args: ['--version'],
    },
    npm: {
      displayName: 'npm',
      cmd: 'npm',
      args: ['--version'],
    },
    pnpm: {
      displayName: 'pnpm',
      cmd: 'pnpm',
      args: ['--version'],
      installCmd: 'npm',
      installArgs: ['install', '-g', 'pnpm'],
    },
    docker: {
      displayName: 'Docker',
      cmd: 'docker',
      args: ['--version'],
    },
    dockerCompose: {
      displayName: 'Docker Compose',
      // Prefer docker compose if available in user's PATH; we check via `docker compose version`
      cmd: 'docker',
      args: ['compose', 'version'],
    },
  };

  for (const dependency of dependencies) {
    const { displayName, cmd, args = [], installCmd, installArgs = [] } = commands[dependency];
    const checkSpinner = spinner();
    checkSpinner.start(`Checking ${displayName}...`);

    // For Node.js, prefer reading from process to avoid PATH/shell issues
    if (dependency === 'node') {
      const nodeVersion = process.versions.node;

      if (nodeVersion) {
        checkSpinner.stop(`${displayName} is installed: ${nodeVersion}`);
        continue;
      }

      checkSpinner.stop(`${displayName} is not installed or not available in this runtime`);

      return;
    }

    try {
      const result = await $`${cmd} ${args}`;
      const versionOutput = String(result.stdout || '').trim();
      checkSpinner.stop(`${displayName} is installed${versionOutput ? `: ${versionOutput}` : ''}`);
    } catch {
      checkSpinner.stop(`${displayName} is not installed`);

      if (installCmd) {
        const installSpinner = spinner();
        installSpinner.start(`Installing ${displayName}...`);

        try {
          await $`${installCmd} ${installArgs}`;
          installSpinner.stop(`${displayName} installed successfully`);
        } catch {
          installSpinner.stop(`Failed to install ${displayName}`);
          return;
        }
      } else {
        return;
      }
    }
  }
};

main();
