import { logger } from '~/utils/logger';
import { BaseDeploymentPlugin } from './base-deployment-plugin';
import type { DeploymentConfig, DeploymentProgress, DeploymentResult } from '~/lib/plugins/types';
import type { NetlifySiteInfo } from '~/types/netlify';
import { getDeploymentMethodCredential } from '~/lib/services/deploymentMethodService';
import { DeploymentMethodCredentialsType } from '@prisma/client';

const TOTAL_STEPS = 7;

export class NetlifyDeployPlugin extends BaseDeploymentPlugin {
  pluginId = 'NETLIFY' as const;
  name = 'Netlify';
  description = 'Deploy your application to Netlify';
  protected totalSteps = TOTAL_STEPS;

  async deploy(
    zipFile: File,
    config: DeploymentConfig,
    onProgress: (progress: DeploymentProgress) => Promise<void>,
  ): Promise<DeploymentResult> {
    const { siteId, websiteId, chatId, description, userId, environmentId } = config;
    let currentStepIndex = 1;

    let token;

    if (environmentId) {
      try {
        const deploymentToken = await getDeploymentMethodCredential(
          'NETLIFY',
          environmentId,
          DeploymentMethodCredentialsType.API_KEY,
        );

        if (deploymentToken) {
          token = deploymentToken;
        }
      } catch (error) {
        logger.warn('Failed to get Netlify token from deployment method, falling back to environment variable', {
          error: error instanceof Error ? error.message : 'Unknown error',
          chatId,
        });
      }
    }

    if (!token) {
      throw new Error(
        'Netlify token not configured. Please set up Netlify deployment method in settings or set NETLIFY_AUTH_TOKEN environment variable.',
      );
    }

    if (!zipFile) {
      throw new Error('No zip file provided');
    }

    // Send initial progress
    logger.info('Initializing deployment', JSON.stringify({ chatId }));
    await this.sendProgress(currentStepIndex, this.totalSteps, 'Initializing deployment...', 'in_progress', onProgress);

    let targetSiteId = siteId || (await this.getSiteIdFromChat(chatId));
    logger.info('Target site ID', JSON.stringify({ chatId, targetSiteId }));

    let siteInfo: NetlifySiteInfo | undefined;

    // If no siteId provided, create a new site
    if (!targetSiteId) {
      logger.info('Creating new Netlify site', JSON.stringify({ chatId }));
      await this.sendProgress(
        ++currentStepIndex,
        this.totalSteps,
        'Creating new Netlify site...',
        'in_progress',
        onProgress,
      );

      const siteName = await this.generateUniqueSiteName(chatId);
      logger.info('Generated unique site name', JSON.stringify({ chatId, siteName }));

      const createSiteResponse = await fetch('https://api.netlify.com/api/v1/sites', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: siteName,
          custom_domain: null,
        }),
      });

      if (!createSiteResponse.ok) {
        const errorData = await createSiteResponse.json().catch(() => null);
        throw new Error(`Failed to create site: ${JSON.stringify(errorData)}`);
      }

      const newSite = (await createSiteResponse.json()) as any;
      targetSiteId = newSite.id;
      siteInfo = {
        id: newSite.id,
        name: newSite.name,
        url: newSite.url,
        chatId,
      };

      await this.updateWebsiteDatabase(undefined, targetSiteId, newSite.name, newSite.url, chatId, userId);
      logger.info('Site created successfully', JSON.stringify({ chatId, siteId: targetSiteId }));
    } else {
      // Get existing site info
      logger.info('Getting existing site info', JSON.stringify({ chatId, siteId: targetSiteId }));
      await this.sendProgress(
        ++currentStepIndex,
        this.totalSteps,
        'Getting existing site info...',
        'in_progress',
        onProgress,
      );

      const siteResponse = await fetch(`https://api.netlify.com/api/v1/sites/${targetSiteId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!siteResponse.ok) {
        logger.error(
          'Failed to get existing site info. This means the site has been deleted on Netlify',
          JSON.stringify({
            chatId,
            siteId: targetSiteId,
            status: siteResponse.status,
          }),
        );

        const { prisma } = await import('~/lib/prisma');
        await prisma.website.deleteMany({
          where: {
            chatId,
            siteId: targetSiteId,
          },
        });

        throw new Error(
          'Failed to get existing site info. This means the site has been deleted on Netlify. We have cleaned up the database entry. Please try to deploy again.',
        );
      }

      const existingSite = (await siteResponse.json()) as any;
      logger.info('Existing site info retrieved', JSON.stringify({ chatId, existingSite }));
      siteInfo = {
        id: existingSite.id,
        name: existingSite.name,
        url: existingSite.url,
        chatId,
      };
      targetSiteId = existingSite.id;
    }

    // Create a temporary directory for the deployment
    const tempDir = await this.createTempDirectory(chatId, 'netlify-deploy');

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

      // Create Netlify configuration
      logger.info('Setting up Netlify configuration', JSON.stringify({ chatId }));
      await this.sendProgress(
        ++currentStepIndex,
        this.totalSteps,
        'Setting up Netlify configuration...',
        'in_progress',
        onProgress,
      );

      await this._createNetlifyConfig(tempDir);

      // Install dependencies
      logger.info('Installing dependencies', JSON.stringify({ chatId }));
      await this.sendProgress(
        ++currentStepIndex,
        this.totalSteps,
        'Installing dependencies...',
        'in_progress',
        onProgress,
      );

      await this.runCommand('pnpm', ['install'], tempDir, { NETLIFY_AUTH_TOKEN: token }, undefined, async (message) => {
        if (message.includes('error') || message.includes('failed')) {
          throw new Error('Failed to install dependencies');
        }

        // Could send progress updates here if needed
      });
      logger.info('Dependencies installed successfully', JSON.stringify({ chatId }));

      // Link and configure Netlify
      logger.info('Configuring Netlify', JSON.stringify({ chatId }));
      await this.runCommand('netlify', ['link', '--id', targetSiteId], tempDir, {
        NETLIFY_AUTH_TOKEN: token,
      });
      await this.runCommand('netlify', ['env:import', '.env'], tempDir, {
        NETLIFY_AUTH_TOKEN: token,
      });
      await this.runCommand('netlify', ['env:set', 'VITE_PROD', 'true'], tempDir, {
        NETLIFY_AUTH_TOKEN: token,
      });
      await this.runCommand('netlify', ['env:set', 'NODE_ENV', 'production'], tempDir, {
        NETLIFY_AUTH_TOKEN: token,
      });
      await this.runCommand('netlify', ['env:set', 'QUERY_MODE', 'direct'], tempDir, {
        NETLIFY_AUTH_TOKEN: token,
      });
      logger.info('Netlify configuration completed', JSON.stringify({ chatId }));

      // Generate deployment alias from description
      const deploymentAlias = description ? this.generateSlug(description) : `${chatId.slice(0, 6)}`;
      logger.info('Starting deployment', JSON.stringify({ chatId, deploymentAlias }));

      // Deploy
      await this.sendProgress(
        ++currentStepIndex,
        this.totalSteps,
        'Deploying to Netlify...',
        'in_progress',
        onProgress,
      );

      await this.runCommand(
        'netlify',
        ['deploy', '--build', '--prod'],
        tempDir,
        { NETLIFY_AUTH_TOKEN: token },
        3 * 60 * 1000, // 3 minutes timeout
        (_message) => {
          // Could send progress updates here if needed
        },
      );

      // Get the latest deploy info
      logger.info('Getting deployment info', JSON.stringify({ chatId }));

      const deployResponse = await fetch(`https://api.netlify.com/api/v1/sites/${targetSiteId}/deploys`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!deployResponse.ok) {
        const errorData = await deployResponse.json().catch(() => null);
        throw new Error(`Failed to fetch deployment info: ${JSON.stringify(errorData)}`);
      }

      const deploys = (await deployResponse.json()) as any[];
      const latestDeploy = deploys?.[0];

      if (!latestDeploy) {
        throw new Error('No deployment information found after deployment');
      }

      // After successful deployment, save to database and track telemetry
      if (siteInfo) {
        await this.trackDeploymentTelemetry(siteInfo, userId, 'netlify');

        logger.info(
          'Saving website to database',
          JSON.stringify({
            chatId,
            siteId: siteInfo.id,
          }),
        );

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
            id: latestDeploy.id,
            state: latestDeploy.state,
            url: siteInfo.url,
          },
          site: siteInfo,
          website,
        };
      }

      throw new Error('Site info not available after deployment');
    } catch (error: any) {
      logger.error('Error during Netlify deployment', JSON.stringify({ chatId, error: error.message }));

      try {
        await this.trackDeploymentErrorTelemetry(error, userId, 'netlify', chatId);
      } catch (telemetryError) {
        logger.error(
          'Failed to track deployment error telemetry',
          JSON.stringify({
            chatId,
            telemetryError: telemetryError instanceof Error ? telemetryError.message : 'Unknown error',
          }),
        );
      }

      throw new Error(`Netlify deployment failed: ${error.message}`);
    } finally {
      // Clean up temporary directory
      await this.cleanupTempDirectory(tempDir, chatId);
    }
  }

  private async _createNetlifyConfig(tempDir: string): Promise<void> {
    const { writeFile } = await import('fs/promises');
    const { join } = await import('path');

    // Create netlify.toml configuration
    const netlifyConfig = `[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "9"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[dev]
  command = "npm run dev"
  port = 3000
  publish = ".next"

# Optional: Add environment variables that will be available during build
# [build.environment]
#   NODE_ENV = "production"
`;

    await writeFile(join(tempDir, 'netlify.toml'), netlifyConfig);

    // Also create a next.config.js if it doesn't exist to ensure proper Next.js configuration
    const nextConfigPath = join(tempDir, 'next.config.js');
    const nextConfigExists = await this.fileExists(nextConfigPath);

    if (!nextConfigExists) {
      const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
`;

      await writeFile(nextConfigPath, nextConfig);
    } else {
      // Update existing next.config.js to ensure it has the right settings for Netlify
      const existingConfig = await import('fs/promises').then((fs) => fs.readFile(nextConfigPath, 'utf-8'));

      if (!existingConfig.includes("output: 'export'")) {
        const updatedConfig = existingConfig.replace(
          'module.exports = nextConfig;',
          `module.exports = {
  ...nextConfig,
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};`,
        );
        await writeFile(nextConfigPath, updatedConfig);
      }
    }
  }
}
