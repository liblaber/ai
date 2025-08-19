import type { DeploymentConfig, DeploymentPlugin, DeploymentProgress, DeploymentResult } from '~/lib/plugins/types';
import { logger } from '~/utils/logger';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { rimraf } from 'rimraf';
import AdmZip from 'adm-zip';
import { prisma } from '~/lib/prisma';
import { getTelemetry } from '~/lib/telemetry/telemetry-manager';
import { TelemetryEventType } from '~/lib/telemetry/telemetry-types';
import { userService } from '~/lib/services/userService';
import { parse } from 'dotenv';

interface CommandResult {
  output: string;
  error: string;
}

const TOTAL_STEPS = 6;

export class AwsDeployPlugin implements DeploymentPlugin {
  pluginId = 'aws' as const;
  name = 'AWS (SST)';
  description = 'Deploy your application to AWS using Serverless Stack (SST)';

  async deploy(
    zipFile: File,
    config: DeploymentConfig,
    onProgress: (progress: DeploymentProgress) => Promise<void>,
  ): Promise<DeploymentResult> {
    const { websiteId, chatId, userId } = config;
    let currentStepIndex = 1;

    // Check if AWS credentials are configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error(
        'AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.',
      );
    }

    // Send initial progress
    logger.info('Initializing AWS deployment', JSON.stringify({ chatId }));
    await onProgress({
      step: currentStepIndex,
      totalSteps: TOTAL_STEPS,
      message: 'Initializing AWS deployment...',
      status: 'in_progress',
    });

    // Create a temporary directory for the deployment
    const tempDir = join(tmpdir(), `aws-deploy-${chatId}`);
    await mkdir(tempDir, { recursive: true });
    logger.info('Created temporary directory', JSON.stringify({ chatId, tempDir }));

    try {
      // Write the zip file to disk
      logger.info('Preparing deployment files', JSON.stringify({ chatId }));
      await onProgress({
        step: ++currentStepIndex,
        totalSteps: TOTAL_STEPS,
        message: 'Preparing deployment files...',
        status: 'in_progress',
      });

      const zipPath = join(tempDir, 'project.zip');
      const arrayBuffer = await zipFile.arrayBuffer();
      await writeFile(zipPath, new Uint8Array(arrayBuffer));

      // Extract the zip file
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(tempDir, true);

      // Remove the zip file
      await unlink(zipPath);
      logger.info('Files extracted successfully', JSON.stringify({ chatId }));

      // Check if SST is already configured in the project
      const sstConfigPath = join(tempDir, 'sst.config.ts');
      const sstConfigExists = await this._fileExists(sstConfigPath);

      if (!sstConfigExists) {
        logger.info('SST not configured, setting up basic SST configuration', JSON.stringify({ chatId }));
        await onProgress({
          step: ++currentStepIndex,
          totalSteps: TOTAL_STEPS,
          message: 'Setting up SST configuration...',
          status: 'in_progress',
        });

        // read environment variables from .env file in zip
        const envFilePath = join(tempDir, '.env');
        const envFile: Record<string, string> = {};

        if (await this._fileExists(envFilePath)) {
          const envContentString = await import('fs/promises').then((fs) => fs.readFile(envFilePath, 'utf-8'));
          const envContent = parse(envContentString);
          Object.entries(envContent).forEach(([key, value]) => {
            if (value) {
              envFile[key] = value;
            }
          });
        } else {
          logger.warn('No .env file found in the zip, using default environment variables');
        }

        // Create basic SST configuration
        await this._createSstConfig(tempDir, chatId, envFile);
      } else {
        await onProgress({
          step: ++currentStepIndex,
          totalSteps: TOTAL_STEPS,
          message: 'Using existing SST configuration...',
          status: 'in_progress',
        });
      }

      // Install dependencies
      logger.info('Installing dependencies', JSON.stringify({ chatId }));
      await onProgress({
        step: ++currentStepIndex,
        totalSteps: TOTAL_STEPS,
        message: 'Installing dependencies...',
        status: 'in_progress',
      });

      await this._runCommand('pnpm', ['install'], tempDir, {
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID!,
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY!,
        AWS_REGION: process.env.AWS_REGION || 'us-east-1',
      });

      logger.info('Dependencies installed successfully', JSON.stringify({ chatId }));

      // Deploy using SST
      logger.info('Starting SST deployment', JSON.stringify({ chatId }));
      await onProgress({
        step: ++currentStepIndex,
        totalSteps: TOTAL_STEPS,
        message: 'Deploying to AWS...',
        status: 'in_progress',
      });

      const deployResult = await this._runCommand(
        'npx',
        ['sst', 'deploy', '--stage', this._generateStageName(chatId)],
        tempDir,
        {
          AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID!,
          AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY!,
          AWS_REGION: process.env.AWS_REGION || 'us-east-1',
        },
        5 * 60 * 1000, // 5 minutes timeout
      );

      logger.info('SST deployment completed', JSON.stringify({ chatId, output: deployResult.output }));

      // Extract deployment information from SST output
      const deploymentInfo = this._parseSstOutput(deployResult.output);

      // Create site info for consistency with other plugins
      const siteInfo = {
        id: deploymentInfo.stackName || `aws-${chatId}`,
        name: `aws-${chatId}`,
        url: deploymentInfo.appUrl || `https://${deploymentInfo.stackName}.sst.dev`,
        chatId,
      };

      // Track telemetry
      const telemetry = await getTelemetry();
      const user = await userService.getUser(userId);
      await telemetry.trackTelemetryEvent(
        {
          eventType: TelemetryEventType.USER_APP_DEPLOY,
          properties: { websiteInfo: siteInfo, provider: 'aws' },
        },
        user,
      );

      // Update database
      const website = await this._updateWebsiteDatabase(
        websiteId,
        siteInfo.id,
        siteInfo.name,
        siteInfo.url,
        chatId,
        userId,
      );

      return {
        deploy: {
          id: deploymentInfo.stackName || `deploy-${chatId}`,
          state: 'ready',
          url: siteInfo.url,
        },
        site: siteInfo,
        website,
      };
    } finally {
      // Clean up temporary directory
      logger.info('Cleaning up temporary directory', JSON.stringify({ chatId, tempDir }));
      await rimraf(tempDir);
    }
  }

  private async _fileExists(filePath: string): Promise<boolean> {
    try {
      await import('fs/promises').then((fs) => fs.access(filePath));
      return true;
    } catch {
      return false;
    }
  }

  private async _createSstConfig(tempDir: string, chatId: string, envFile: Record<any, any>): Promise<void> {
    const sstConfig = `
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({

  app(input) {
    return {
      name: "liblab-${chatId}",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  async run() {
    new sst.aws.Nextjs("liblab-${chatId}", {
      environment: {
      ${Object.entries(envFile).map(([key, value]) => `${key}: '${value}'`)},
      },
    });
  },
});
`;

    await writeFile(join(tempDir, 'sst.config.ts'), sstConfig);

    await writeFile('/Users/stevan/Downloads/sst.config.ts', sstConfig);

    // Create package.json if it doesn't exist
    const packageJsonPath = join(tempDir, 'package.json');

    if (!(await this._fileExists(packageJsonPath))) {
      const packageJson = {
        name: `liblab-${chatId}`,
        version: '1.0.0',
        type: 'module',
        scripts: {
          build: 'next build',
          dev: 'next dev',
          start: 'next start',
        },
        dependencies: {
          next: '^15.0.0',
          react: '^18.3.1',
          'react-dom': '^18.3.1',
        },
        devDependencies: {
          '@types/node': '^24.0.0',
          '@types/react': '^18.3.0',
          typescript: '^5.0.0',
        },
      };

      await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }
  }

  private _generateStageName(chatId: string): string {
    return chatId.slice(0, 8).toLowerCase();
  }

  private _parseSstOutput(output: string): { stackName?: string; appUrl?: string } {
    // Parse SST deployment output to extract relevant information
    const lines = output.split('\n');
    let stackName: string | undefined;
    let appUrl: string | undefined;

    for (const line of lines) {
      if (line.includes('Stack:') && !stackName) {
        stackName = line.split('Stack:')[1]?.trim();
      }

      if (line.includes('url:') && !appUrl) {
        appUrl = line.split('url:')[1]?.trim();
      }
    }

    return { stackName, appUrl };
  }

  private async _runCommand(
    command: string,
    args: string[],
    cwd: string,
    env: Record<string, string> = {},
    timeout?: number,
  ): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { spawn } = require('child_process');
      const proc = spawn(command, args, {
        cwd,
        env: {
          ...env,
          ...process.env,
        },
        timeout,
      });

      let output = '';
      let error = '';

      proc.stdout?.on('data', (data: Buffer) => {
        const message = data.toString();
        output += message;
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const message = data.toString();
        error += message;
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

  private async _updateWebsiteDatabase(
    websiteId: string | undefined,
    siteId: string,
    siteName: string,
    siteUrl: string,
    chatId: string,
    userId: string,
  ): Promise<any> {
    if (websiteId) {
      // Update existing website
      const website = await prisma.website.update({
        where: {
          id: websiteId,
          createdById: userId,
        },
        data: {
          siteId,
          siteName,
          siteUrl,
        },
      });
      logger.info('Website updated in database', JSON.stringify({ chatId, siteId }));

      return website;
    } else {
      // Create new website
      const website = await prisma.website.create({
        data: {
          siteId,
          siteName,
          siteUrl,
          chatId,
          createdById: userId,
        },
      });
      logger.info('Website saved to database successfully', JSON.stringify({ chatId, siteId }));

      return website;
    }
  }
}
