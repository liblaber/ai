import { type DeploymentParams, type DeploymentPlugin, type DeploymentResult } from '~/types/deployment';
import { type ChildProcess, spawn } from 'child_process';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import AdmZip from 'adm-zip';
import { generateUniqueSiteName } from '~/lib/deployment/utils';

interface CommandResult {
  output: string;
  error: string;
}

async function runCommand(
  command: string,
  args: string[],
  cwd: string,
  env: Record<string, string> = {},
  timeout?: number,
  onProgress?: (message: string) => void,
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      env: {
        ...env,
        ...process.env,
      },
      timeout,
    }) as ChildProcess;

    let output = '';
    let error = '';

    proc.stdout?.on('data', (data: Buffer) => {
      const message = data.toString();
      output += message;
      onProgress?.(message);
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const message = data.toString();
      error += message;
      onProgress?.(message);
    });

    proc.on('close', (code: number | null) => {
      if (code === 0) {
        resolve({ output, error });
      } else {
        reject(new Error(`Command failed: ${error}`));
      }
    });

    proc.on('error', (err: Error) => {
      reject(err);
    });
  });
}

export const localPlugin: DeploymentPlugin = {
  id: 'local',
  name: 'Local',
  description: 'Run the site locally',
  icon: 'i-ph:desktop',
  theme: {
    primary: 'purple-500',
    background: 'purple-50',
    hover: 'purple-500',
    dark: {
      primary: 'purple-500',
      background: 'purple-900/20',
      hover: 'purple-500',
    },
  },
  isEnabled: async () => {
    return true; // Always enabled
  },
  deploy: async (params: DeploymentParams): Promise<DeploymentResult> => {
    const { chatId, zipFile, onProgress } = params;

    if (!zipFile) {
      return {
        success: false,
        error: 'No zip file provided',
      };
    }

    try {
      onProgress({
        step: 1,
        totalSteps: 4,
        message: 'Initializing local deployment...',
        status: 'in_progress',
      });

      // Create a temporary directory for the deployment
      const tempDir = join(tmpdir(), `local-deploy-${chatId}`);
      await mkdir(tempDir, { recursive: true });

      try {
        onProgress({
          step: 2,
          totalSteps: 4,
          message: 'Preparing deployment files...',
          status: 'in_progress',
        });

        const zipPath = join(tempDir, 'project.zip');
        const arrayBuffer = await zipFile.arrayBuffer();
        await writeFile(zipPath, new Uint8Array(arrayBuffer));

        const zip = new AdmZip(zipPath);
        zip.extractAllTo(tempDir, true);
        await unlink(zipPath);

        onProgress({
          step: 3,
          totalSteps: 4,
          message: 'Installing dependencies...',
          status: 'in_progress',
        });

        await runCommand(
          'pnpm',
          ['install'],
          tempDir,
          {
            npm_config_build_from_source: 'true',
            npm_config_target_arch: 'arm64',
            npm_config_target_platform: 'darwin',
            npm_config_target_libc: 'glibc',
            npm_config_target: '20.18.1',
          },
          undefined,
          (message) => {
            onProgress({
              step: 3,
              totalSteps: 4,
              message,
              status: 'in_progress',
            });
          },
        );

        onProgress({
          step: 4,
          totalSteps: 4,
          message: 'Building and starting local server...',
          status: 'in_progress',
        });

        // Build the project
        await runCommand('pnpm', ['build'], tempDir, {}, undefined, (message) => {
          onProgress({
            step: 4,
            totalSteps: 4,
            message,
            status: 'in_progress',
          });
        });

        // Start the server in the background
        const server = spawn('pnpm', ['serve'], {
          cwd: tempDir,
          env: {
            ...process.env,
            FORCE_COLOR: '1',
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        // Wait for the server to start
        await new Promise<void>((resolve, reject) => {
          let serverStarted = false;
          const timeout = setTimeout(() => {
            if (!serverStarted) {
              server.kill();
              reject(new Error('Server failed to start within timeout'));
            }
          }, 30000); // 30 second timeout

          server.stdout?.on('data', (data: Buffer) => {
            const message = data.toString();
            onProgress({
              step: 4,
              totalSteps: 4,
              message,
              status: 'in_progress',
            });

            // Check if server has started successfully
            if (message.includes('http://localhost:3000')) {
              serverStarted = true;
              clearTimeout(timeout);
              resolve();
            }
          });

          server.stderr?.on('data', (data: Buffer) => {
            const message = data.toString();
            onProgress({
              step: 4,
              totalSteps: 4,
              message,
              status: 'in_progress',
            });
          });

          server.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });

          server.on('exit', (code) => {
            if (code !== 0 && !serverStarted) {
              clearTimeout(timeout);
              reject(new Error(`Server process exited with code ${code}`));
            }
          });
        });

        const siteInfo = {
          id: `local-${chatId}`,
          name: await generateUniqueSiteName(chatId),
          url: 'http://localhost:3000',
          chatId,
        };

        return {
          success: true,
          data: {
            deploy: {
              id: `local-${Date.now()}`,
              state: 'ready',
              url: siteInfo.url,
            },
            site: siteInfo,
          },
        };
      } finally {
        /*
         * Note: We don't clean up the temp directory here since the server is still running
         * The cleanup should be handled when the server is stopped
         */
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deployment failed',
      };
    }
  },
};
