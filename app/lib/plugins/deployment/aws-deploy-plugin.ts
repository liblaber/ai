import type { DeploymentConfig, DeploymentProgress, DeploymentResult } from '~/lib/plugins/types';
import { logger } from '~/utils/logger';
import fs, { writeFile } from 'fs/promises';
import { join } from 'path';
import { BaseDeploymentPlugin, type SiteInfo } from './base-deployment-plugin';
import rimraf from 'rimraf';
import { getDeploymentMethodCredentials } from '~/lib/services/deploymentMethodService';
import { DeploymentMethodCredentialsType } from '@prisma/client';

const TOTAL_STEPS = 6;

export class AwsDeployPlugin extends BaseDeploymentPlugin {
  pluginId = 'aws' as const;
  name = 'AWS (SST)';
  description = 'Deploy your application to AWS using Serverless Stack (SST)';
  protected totalSteps = TOTAL_STEPS;

  async deploy(
    zipFile: File,
    config: DeploymentConfig,
    onProgress: (progress: DeploymentProgress) => Promise<void>,
  ): Promise<DeploymentResult> {
    const { websiteId, chatId, userId, environmentId } = config;
    let currentStepIndex = 1;

    // Get AWS credentials from deployment method
    let awsCredentials: Record<string, string> | null = null;

    if (environmentId) {
      try {
        awsCredentials = await getDeploymentMethodCredentials('AWS', environmentId, userId);
      } catch (error) {
        logger.warn('Failed to get AWS credentials from deployment method, falling back to environment variables', {
          error: error instanceof Error ? error.message : 'Unknown error',
          chatId,
        });
      }
    }

    // Fallback to environment variables if deployment method credentials are not available
    const accessKeyId = awsCredentials?.[DeploymentMethodCredentialsType.ACCESS_KEY] || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey =
      awsCredentials?.[DeploymentMethodCredentialsType.SECRET_KEY] || process.env.AWS_SECRET_ACCESS_KEY;
    const region = awsCredentials?.[DeploymentMethodCredentialsType.REGION] || process.env.AWS_REGION || 'us-east-1';

    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        'AWS credentials not configured. Please set up AWS deployment method in settings or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.',
      );
    }

    // Send initial progress
    logger.info('Initializing AWS deployment', JSON.stringify({ chatId }));

    await this.sendProgress(
      currentStepIndex,
      this.totalSteps,
      'Initializing AWS deployment...',
      'in_progress',
      onProgress,
    );

    // Create a temporary directory for the deployment
    const tempDir = await this.createTempDirectory(chatId, 'aws-deploy');

    try {
      // Extract the zip file
      await this.sendProgress(
        ++currentStepIndex,
        this.totalSteps,
        'Preparing deployment files...',
        'in_progress',
        onProgress,
      );
      await this.extractZipFile(zipFile, tempDir, chatId);

      logger.info('SST not configured, setting up basic SST configuration', JSON.stringify({ chatId }));
      await this.sendProgress(
        ++currentStepIndex,
        this.totalSteps,
        'Setting up SST configuration...',
        'in_progress',
        onProgress,
      );

      await rimraf(join(tempDir, '.sst'));
      await rimraf(join(tempDir, '.next'));

      // read environment variables from .env file in zip
      const envFile = await this.readEnvFile(tempDir);

      // Create basic SST configuration
      await this._createSstConfig(tempDir, chatId, envFile);

      // Install dependencies
      logger.info('Installing dependencies', JSON.stringify({ chatId }));
      await this.sendProgress(
        ++currentStepIndex,
        this.totalSteps,
        'Installing dependencies...',
        'in_progress',
        onProgress,
      );

      await this.runCommand('pnpm', ['install'], tempDir);

      logger.info('Dependencies installed successfully', JSON.stringify({ chatId }));

      // Deploy using SST
      logger.info('Starting SST deployment', JSON.stringify({ chatId }));
      await this.sendProgress(++currentStepIndex, this.totalSteps, 'Deploying to AWS...', 'in_progress', onProgress);

      const deployResult = await this.runCommand(
        'npx',
        ['sst', 'deploy', '--stage', this._generateStageName(chatId)],
        tempDir,
        {
          AWS_ACCESS_KEY_ID: accessKeyId,
          AWS_SECRET_ACCESS_KEY: secretAccessKey,
          AWS_REGION: region,
        },
        5 * 60 * 1000, // 5 minutes timeout
      );

      logger.info('SST deployment completed', JSON.stringify({ chatId, output: deployResult.output }));

      // Extract deployment information from SST output
      const deploymentInfo = this._parseSstOutput(deployResult.output);

      // Create site info for consistency with other plugins
      const siteInfo: SiteInfo = {
        id: deploymentInfo.stackName || `aws-${chatId}`,
        name: `aws-${chatId}`,
        url: deploymentInfo.appUrl || `https://${deploymentInfo.stackName}.sst.dev`,
        chatId,
      };

      // Track telemetry
      await this.trackDeploymentTelemetry(siteInfo, userId, 'aws');

      // Update database
      const website = await this.updateWebsiteDatabase(
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
      await this.cleanupTempDirectory(tempDir, chatId);
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
  private async _fileExists(filePath: string): Promise<boolean> {
    try {
      await import('fs/promises').then((fs) => fs.access(filePath));
      return true;
    } catch {
      return false;
    }
  }
}
