import { logger } from '~/utils/logger';
import { BaseDeploymentPlugin } from './base-deployment-plugin';
import type { DeploymentConfig, DeploymentProgress, DeploymentResult } from '~/lib/plugins/types';
import { getDeploymentMethodCredential } from '~/lib/services/deploymentMethodService';

// Define the enum locally until Prisma client is regenerated
enum DeploymentMethodCredentialsType {
  API_KEY = 'API_KEY',
  ACCESS_KEY = 'ACCESS_KEY',
  SECRET_KEY = 'SECRET_KEY',
  REGION = 'REGION',
}

const TOTAL_STEPS = 7;

export class VercelDeployPlugin extends BaseDeploymentPlugin {
  pluginId = 'VERCEL' as const;
  name = 'Vercel';
  description = 'Deploy your application to Vercel';
  protected totalSteps = TOTAL_STEPS;

  async deploy(
    zipFile: File,
    config: DeploymentConfig,
    onProgress: (progress: DeploymentProgress) => Promise<void>,
  ): Promise<DeploymentResult> {
    const { websiteId, chatId, userId, environmentId } = config;
    let currentStepIndex = 1;

    let token: string | undefined;

    if (environmentId) {
      try {
        const deploymentToken = await getDeploymentMethodCredential(
          'VERCEL',
          environmentId,
          DeploymentMethodCredentialsType.API_KEY,
        );

        if (deploymentToken) {
          token = deploymentToken;
        }
      } catch (error) {
        logger.warn('Failed to get Vercel token from deployment method, falling back to environment variable', {
          error: error instanceof Error ? error.message : 'Unknown error',
          chatId,
        });
      }
    }

    if (!token) {
      token = process.env.VERCEL_TOKEN;
    }

    if (!token) {
      throw new Error(
        'Vercel token not configured. Please set up Vercel deployment method in settings or set VERCEL_TOKEN environment variable.',
      );
    }

    if (!zipFile) {
      throw new Error('No zip file provided');
    }

    // Send initial progress
    logger.info('Initializing Vercel deployment', JSON.stringify({ chatId }));
    await this.sendProgress(currentStepIndex, this.totalSteps, 'Initializing deployment...', 'in_progress', onProgress);

    const tempDir = await this.createTempDirectory(chatId, 'vercel-deploy');

    try {
      await this.sendProgress(
        ++currentStepIndex,
        this.totalSteps,
        'Preparing deployment files...',
        'in_progress',
        onProgress,
      );
      await this.extractZipFile(zipFile, tempDir, chatId);

      logger.info('Setting up Vercel configuration', JSON.stringify({ chatId }));
      await this.sendProgress(
        ++currentStepIndex,
        this.totalSteps,
        'Setting up Vercel configuration...',
        'in_progress',
        onProgress,
      );

      await this._createVercelConfig(tempDir, chatId);

      logger.info('Installing dependencies', JSON.stringify({ chatId }));

      await this.sendProgress(
        ++currentStepIndex,
        this.totalSteps,
        'Installing dependencies...',
        'in_progress',
        onProgress,
      );

      await this.runCommand('pnpm', ['install'], tempDir, { VERCEL_TOKEN: token }, undefined, async (message) => {
        if (message.includes('error') || message.includes('failed')) {
          throw new Error('Failed to install dependencies');
        }
      });
      logger.info('Dependencies installed successfully', JSON.stringify({ chatId }));

      logger.info('Starting Vercel deployment', JSON.stringify({ chatId }));
      await this.sendProgress(++currentStepIndex, this.totalSteps, 'Deploying to Vercel...', 'in_progress', onProgress);

      const projectName = this.generateSiteName(chatId, 'liblab', 8);

      const deployResult = await this.runCommand(
        'npx',
        ['vercel', 'deploy', '--prod', '--token', token, '--yes'],
        tempDir,
        undefined,
        5 * 60 * 1000, // 5 minutes timeout
        async (message) => {
          if (message.includes('https://') && message.includes('.vercel.app')) {
            const urlMatch = message.match(/(https:\/\/[^\s]+\.vercel\.app)/);

            if (urlMatch) {
              logger.info('Deployment URL detected', JSON.stringify({ chatId, url: urlMatch[1] }));
            }
          }
        },
      );

      logger.info('Vercel deployment completed', JSON.stringify({ chatId, output: deployResult.output }));

      const deploymentInfo = this._parseVercelOutput(deployResult.output);

      const siteInfo = {
        id: deploymentInfo.projectId || `vercel-${chatId}`,
        name: projectName,
        url: deploymentInfo.url || `https://${projectName}.vercel.app`,
        chatId,
      };

      await this.trackDeploymentTelemetry(siteInfo, userId, 'vercel');

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
          id: deploymentInfo.deploymentId || `deploy-${chatId}`,
          state: 'ready',
          url: siteInfo.url,
        },
        site: siteInfo,
        website,
      };
    } catch (error: any) {
      logger.error('Error during Vercel deployment', JSON.stringify({ chatId, error: error.message }));
      throw new Error(`Vercel deployment failed: ${error.message}`);
    } finally {
      await this.cleanupTempDirectory(tempDir, chatId);
    }
  }

  private async _createVercelConfig(tempDir: string, chatId: string): Promise<void> {
    const { writeFile } = await import('fs/promises');
    const { join } = await import('path');

    // Create vercel.json configuration
    const vercelConfig = {
      version: 2,
      name: `liblab-${chatId.slice(0, 8)}`,
      builds: [
        {
          src: 'package.json',
          use: '@vercel/next',
        },
      ],
      routes: [
        {
          src: '/(.*)',
          dest: '/$1',
        },
      ],
      headers: [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'X-Frame-Options',
              value: 'ALLOW-FROM *',
            },
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff',
            },
            {
              key: 'Referrer-Policy',
              value: 'strict-origin-when-cross-origin',
            },
            {
              key: 'Cross-Origin-Resource-Policy',
              value: 'cross-origin',
            },
            {
              key: 'Cross-Origin-Embedder-Policy',
              value: 'require-corp',
            },
            {
              key: 'Cross-Origin-Opener-Policy',
              value: 'same-origin-allow-popups',
            },
          ],
        },
      ],
      env: {
        NODE_ENV: 'production',
      },
    };

    await writeFile(join(tempDir, 'vercel.json'), JSON.stringify(vercelConfig, null, 2));

    // Create next.config.js if it doesn't exist to ensure proper Next.js configuration
    const nextConfigPath = join(tempDir, 'next.config.ts');
    const nextConfigExists = await this.fileExists(nextConfigPath);

    if (!nextConfigExists) {
      const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['vercel.app'],
  },
  // Enable static export for better Vercel optimization
  trailingSlash: true,
  // Disable x-powered-by header
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOW-FROM *',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
`;

      await writeFile(nextConfigPath, nextConfig);
    } else {
      // Update existing next.config.js to ensure it has the right settings for Vercel
      const existingConfig = await import('fs/promises').then((fs) => fs.readFile(nextConfigPath, 'utf-8'));

      if (!existingConfig.includes('trailingSlash: true')) {
        const updatedConfig = existingConfig.replace(
          'module.exports = nextConfig;',
          `module.exports = {
  ...nextConfig,
  trailingSlash: true,
  poweredByHeader: false,
  images: {
    domains: ['vercel.app'],
  },
};`,
        );
        await writeFile(nextConfigPath, updatedConfig);
      }
    }

    // Create package.json if it doesn't exist
    const packageJsonPath = join(tempDir, 'package.json');

    if (!(await this.fileExists(packageJsonPath))) {
      const packageJson = {
        name: `liblab-${chatId.slice(0, 8)}`,
        version: '1.0.0',
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

  private _parseVercelOutput(output: string): { projectId?: string; deploymentId?: string; url?: string } {
    const lines = output.split('\n');
    let projectId: string | undefined;
    let deploymentId: string | undefined;
    let url: string | undefined;

    for (const line of lines) {
      const urlMatch = line.match(/(https:\/\/[^\s]+\.vercel\.app)/);

      if (urlMatch && !url) {
        url = urlMatch[1];
      }

      if (line.includes('Project:') && !projectId) {
        projectId = line.split('Project:')[1]?.trim();
      }

      if (line.includes('Deployment:') && !deploymentId) {
        deploymentId = line.split('Deployment:')[1]?.trim();
      }

      if (line.includes('Ready!') && line.includes('https://')) {
        const readyUrlMatch = line.match(/(https:\/\/[^\s]+\.vercel\.app)/);

        if (readyUrlMatch && !url) {
          url = readyUrlMatch[1];
        }
      }
    }

    return { projectId, deploymentId, url };
  }
}
