import { logger } from '~/utils/logger';
import { BaseDeploymentPlugin } from './base-deployment-plugin';
import type { DeploymentConfig, DeploymentProgress, DeploymentResult } from '~/lib/plugins/types';
import { getDeploymentMethodCredential } from '~/lib/services/deploymentMethodService';
import { env } from '~/env/server';

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
        ['vercel', 'deploy', '--prod', '--token', token, '--yes', '--public'],
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

      // Get project ID from .vercel/project.json file
      const projectId = await this._getVercelProjectId(tempDir, chatId);

      if (projectId) {
        // Disable SSO protection to allow iframe embedding
        await this._disableVercelSSOProtection(projectId, token, chatId);
      } else {
        logger.warn('Could not find Vercel project ID', JSON.stringify({ chatId }));
      }

      // Send final completion step
      await this.sendProgress(
        this.totalSteps,
        this.totalSteps,
        'Deployment completed successfully!',
        'success',
        onProgress,
      );

      const siteInfo = {
        id: projectId || `vercel-${chatId}`,
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
        config.slug,
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error during Vercel deployment', JSON.stringify({ chatId, error: errorMessage }));

      try {
        await this.trackDeploymentErrorTelemetry(errorMessage, userId, 'vercel', chatId);
      } catch (telemetryError) {
        logger.error(
          'Failed to track deployment error telemetry',
          JSON.stringify({
            chatId,
            telemetryError: telemetryError instanceof Error ? telemetryError.message : 'Unknown error',
          }),
        );
      }

      throw new Error(`Vercel deployment failed: ${errorMessage}`);
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
      public: true,
      builds: [
        {
          src: 'package.json',
          use: '@vercel/next',
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
        {
          source: '/:path*.js',
          headers: [
            {
              key: 'Cross-Origin-Resource-Policy',
              value: 'cross-origin',
            },
            {
              key: 'Access-Control-Allow-Origin',
              value: env.BASE_URL,
            },
            {
              key: 'Access-Control-Allow-Methods',
              value: 'GET, POST, PUT, DELETE, OPTIONS',
            },
            {
              key: 'Access-Control-Allow-Headers',
              value: 'Content-Type, Authorization, X-Requested-With',
            },
          ],
        },
        {
          source: '/:path*.css',
          headers: [
            {
              key: 'Cross-Origin-Resource-Policy',
              value: 'cross-origin',
            },
            {
              key: 'Access-Control-Allow-Origin',
              value: env.BASE_URL,
            },
          ],
        },
        {
          source: '/:path*.(png|jpg|jpeg|gif|svg|ico)',
          headers: [
            {
              key: 'Cross-Origin-Resource-Policy',
              value: 'cross-origin',
            },
            {
              key: 'Access-Control-Allow-Origin',
              value: env.BASE_URL,
            },
          ],
        },
        {
          source: '/:path*.(woff|woff2|ttf|eot)',
          headers: [
            {
              key: 'Cross-Origin-Resource-Policy',
              value: 'cross-origin',
            },
            {
              key: 'Access-Control-Allow-Origin',
              value: env.BASE_URL,
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

  /**
   * Gets the Vercel project ID from the .vercel/project.json file
   */
  private async _getVercelProjectId(tempDir: string, chatId: string): Promise<string | null> {
    try {
      const { readFile } = await import('fs/promises');
      const { join } = await import('path');

      const projectJsonPath = join(tempDir, '.vercel', 'project.json');

      if (await this.fileExists(projectJsonPath)) {
        const projectJsonContent = await readFile(projectJsonPath, 'utf-8');
        const projectData = JSON.parse(projectJsonContent);

        logger.info(
          'Found Vercel project ID',
          JSON.stringify({
            chatId,
            projectId: projectData.projectId,
            projectName: projectData.projectName,
          }),
        );

        return projectData.projectId || null;
      } else {
        logger.warn('Vercel project.json file not found', JSON.stringify({ chatId, path: projectJsonPath }));
        return null;
      }
    } catch (error) {
      logger.warn(
        'Error reading Vercel project.json',
        JSON.stringify({
          chatId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
      return null;
    }
  }

  /**
   * Disables SSO protection on a Vercel project to allow iframe embedding
   */
  private async _disableVercelSSOProtection(projectId: string, token: string, chatId: string): Promise<void> {
    try {
      logger.info('Disabling Vercel SSO protection', JSON.stringify({ chatId, projectId }));

      const response = await fetch(`https://api.vercel.com/v9/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ssoProtection: null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        logger.warn(
          'Failed to disable SSO protection',
          JSON.stringify({
            chatId,
            projectId,
            status: response.status,
            error: errorData,
          }),
        );

        // Don't throw error - deployment was successful, just SSO protection couldn't be disabled
        return;
      }

      logger.info('Successfully disabled Vercel SSO protection', JSON.stringify({ chatId, projectId }));
    } catch (error) {
      logger.warn(
        'Error disabling SSO protection',
        JSON.stringify({
          chatId,
          projectId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
      // Don't throw error - deployment was successful, just SSO protection couldn't be disabled
    }
  }
}
