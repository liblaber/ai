import type { DeploymentConfig, DeploymentPlugin, DeploymentProgress, DeploymentResult } from '~/lib/plugins/types';
import { logger } from '~/utils/logger';
import fs, { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import AdmZip from 'adm-zip';
import { prisma } from '~/lib/prisma';
import { getTelemetry } from '~/lib/telemetry/telemetry-manager';
import { TelemetryEventType } from '~/lib/telemetry/telemetry-types';
import { userService } from '~/lib/services/userService';
import { parse } from 'dotenv';
import rimraf from 'rimraf';

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

      logger.info('SST not configured, setting up basic SST configuration', JSON.stringify({ chatId }));
      await onProgress({
        step: ++currentStepIndex,
        totalSteps: TOTAL_STEPS,
        message: 'Setting up SST configuration...',
        status: 'in_progress',
      });

      await rimraf(join(tempDir, '.sst'));
      await rimraf(join(tempDir, '.next'));

      // read environment variables from .env file in zip
      const envFilePath = join(tempDir, '.env');
      const envFile: Record<string, string> = {};

      if (await this._fileExists(envFilePath)) {
        const envContentString = await fs.readFile(envFilePath, 'utf-8');
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

      // Install dependencies
      logger.info('Installing dependencies', JSON.stringify({ chatId }));
      await onProgress({
        step: ++currentStepIndex,
        totalSteps: TOTAL_STEPS,
        message: 'Installing dependencies...',
        status: 'in_progress',
      });

      await this._runCommand('pnpm', ['install'], tempDir);

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
    } catch (error: any) {
      logger.error('Error during AWS deployment', JSON.stringify({ chatId, error: error.message }));

      throw new Error(`AWS deployment failed: ${error.message}`);
    } finally {
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

    const dockerfileContent = `
    FROM node:lts-alpine AS base

# Stage 1: Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY sst-env.d.ts* ./
RUN npm i -g pnpm && pnpm i

# Stage 2: Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# If static pages do not need linked resources
RUN npm run build

# If static pages need linked resources
# RUN --mount=type=secret,id=SST_RESOURCE_MyResource,env=SST_RESOURCE_MyResource \\
#   npm run build

# Stage 3: Production server
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
`;

    await writeFile(join(tempDir, 'Dockerfile'), dockerfileContent);

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

    // add or replace the "output" field in next.config.ts
    const nextConfigPath = join(tempDir, 'next.config.ts');
    const nextConfigExists = await this._fileExists(nextConfigPath);
    let nextConfigContent = nextConfigExists
      ? await fs.readFile(nextConfigPath, 'utf-8')
      : `
    import type { NextConfig } from 'next';

    const nextConfig: NextConfig = {
      devIndicators: false,
      eslint: {
        ignoreDuringBuilds: true,
      },
      typescript: {
        ignoreBuildErrors: true,
      },
      output: 'standalone',
    };

    export default nextConfig;
    `;

    if (!nextConfigContent.includes("output: 'standalone'")) {
      // Ensure the output field is set to 'standalone'
      nextConfigContent = nextConfigContent.replace(
        'export default nextConfig;',
        'export default { ...nextConfig, output: "standalone" };',
      );
    }

    await writeFile(nextConfigPath, nextConfigContent);
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
      // Look for stack name in various formats
      if (line.includes('Stack:') && !stackName) {
        stackName = line.split('Stack:')[1]?.trim();
      }

      // Look for the complete line with the deployed URL
      // Format: "   liblab-xxx: https://xxx.cloudfront.net"
      const urlMatch = line.match(/^\s*liblab-[^:]+:\s*(https?:\/\/[^\s]+)/);

      if (urlMatch && !appUrl) {
        appUrl = urlMatch[1];

        // Extract stack name from the same line if not already found
        if (!stackName) {
          const stackMatch = line.match(/^\s*(liblab-[^:]+):/);

          if (stackMatch) {
            stackName = stackMatch[1];
          }
        }
      }

      // Fallback: look for any line containing a cloudfront URL
      if (!appUrl && line.includes('cloudfront.net')) {
        const cloudfrontMatch = line.match(/(https?:\/\/[^\s]*cloudfront\.net[^\s]*)/);

        if (cloudfrontMatch) {
          appUrl = cloudfrontMatch[1];
        }
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
        logger.info(message);
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const message = data.toString();
        error += message;
        logger.error(message);
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
