import type { ChildProcess } from 'child_process';
import { spawn } from 'child_process';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { rimraf } from 'rimraf';
import AdmZip from 'adm-zip';
import { prisma } from '~/lib/prisma';
import { logger } from '~/utils/logger';
import { getTelemetry } from '~/lib/telemetry/telemetry-manager';
import { TelemetryEventType } from '~/lib/telemetry/telemetry-types';
import { userService } from '~/lib/services/userService';
import { env as serverEnv } from '~/env/server';

import type { DeploymentConfig, DeploymentPlugin, DeploymentProgress, DeploymentResult } from '~/lib/plugins/types';
import type { NetlifySiteInfo } from '~/types/netlify';

interface CommandResult {
  output: string;
  error: string;
}

const TOTAL_STEPS = 6;

export class NetlifyDeployPlugin implements DeploymentPlugin {
  pluginId = 'netlify' as const;
  name = 'Netlify';
  description = 'Deploy your application to Netlify';

  async deploy(
    zipFile: File,
    config: DeploymentConfig,
    onProgress: (progress: DeploymentProgress) => Promise<void>,
  ): Promise<DeploymentResult> {
    const { siteId, websiteId, chatId, description, userId } = config;
    const token = serverEnv.NETLIFY_AUTH_TOKEN;
    let currentStepIndex = 1;

    if (!token) {
      throw new Error('Netlify token not configured');
    }

    if (!zipFile) {
      throw new Error('No zip file provided');
    }

    // Send initial progress
    logger.info('Initializing deployment', JSON.stringify({ chatId }));
    await onProgress({
      step: currentStepIndex,
      totalSteps: TOTAL_STEPS,
      message: 'Initializing deployment...',
      status: 'in_progress',
    });

    let targetSiteId = siteId || (await this._getSiteIdFromChat(chatId));
    logger.info('Target site ID', JSON.stringify({ chatId, targetSiteId }));

    let siteInfo: NetlifySiteInfo | undefined;

    // If no siteId provided, create a new site
    if (!targetSiteId) {
      logger.info('Creating new Netlify site', JSON.stringify({ chatId }));
      await onProgress({
        step: ++currentStepIndex,
        totalSteps: TOTAL_STEPS,
        message: 'Creating new Netlify site...',
        status: 'in_progress',
      });

      const siteName = await this._generateUniqueSiteName(chatId);
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

      await this._handleWebsiteDatabase(chatId, targetSiteId, newSite.name, newSite.url, userId);
      logger.info('Site created successfully', JSON.stringify({ chatId, siteId: targetSiteId }));
    } else {
      // Get existing site info
      logger.info('Getting existing site info', JSON.stringify({ chatId, siteId: targetSiteId }));
      await onProgress({
        step: ++currentStepIndex,
        totalSteps: TOTAL_STEPS,
        message: 'Getting existing site info...',
        status: 'in_progress',
      });

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
    const tempDir = join(tmpdir(), `netlify-deploy-${chatId}`);
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

      // Install dependencies
      logger.info('Installing dependencies', JSON.stringify({ chatId }));
      await onProgress({
        step: ++currentStepIndex,
        totalSteps: TOTAL_STEPS,
        message: 'Installing dependencies...',
        status: 'in_progress',
      });

      await this._runCommand(
        'pnpm',
        ['install'],
        tempDir,
        { NETLIFY_AUTH_TOKEN: token },
        undefined,
        async (message) => {
          if (message.includes('error') || message.includes('failed')) {
            throw new Error('Failed to install dependencies');
          }
          // Could send progress updates here if needed
        },
      );
      logger.info('Dependencies installed successfully', JSON.stringify({ chatId }));

      // Link and configure Netlify
      logger.info('Configuring Netlify', JSON.stringify({ chatId }));
      await this._runCommand('netlify', ['link', '--id', targetSiteId], tempDir, {
        NETLIFY_AUTH_TOKEN: token,
      });
      await this._runCommand('netlify', ['env:import', '.env'], tempDir, {
        NETLIFY_AUTH_TOKEN: token,
      });
      await this._runCommand('netlify', ['env:set', 'VITE_PROD', 'true'], tempDir, {
        NETLIFY_AUTH_TOKEN: token,
      });
      await this._runCommand('netlify', ['env:set', 'NODE_ENV', 'production'], tempDir, {
        NETLIFY_AUTH_TOKEN: token,
      });
      await this._runCommand('netlify', ['env:set', 'QUERY_MODE', 'direct'], tempDir, {
        NETLIFY_AUTH_TOKEN: token,
      });
      logger.info('Netlify configuration completed', JSON.stringify({ chatId }));

      // Generate deployment alias from description
      const deploymentAlias = description ? this._generateSlug(description) : `${chatId.slice(0, 6)}`;
      logger.info('Starting deployment', JSON.stringify({ chatId, deploymentAlias }));

      // Deploy
      await onProgress({
        step: ++currentStepIndex,
        totalSteps: TOTAL_STEPS,
        message: 'Deploying to Netlify...',
        status: 'in_progress',
      });

      await this._runCommand(
        'netlify',
        ['deploy', '--build', '--branch', deploymentAlias],
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
      const latestDeploy = deploys[0];

      // After successful deployment, save to database and track telemetry
      if (siteInfo) {
        const telemetry = await getTelemetry();
        const user = await userService.getUser(userId);
        await telemetry.trackTelemetryEvent(
          {
            eventType: TelemetryEventType.USER_APP_DEPLOY,
            properties: { websiteInfo: siteInfo },
          },
          user,
        );

        logger.info(
          'Saving website to database',
          JSON.stringify({
            chatId,
            siteId: siteInfo.id,
          }),
        );

        const website = await this._updateWebsiteDatabase(
          websiteId,
          siteInfo.id,
          siteInfo.name,
          latestDeploy.links.permalink,
          chatId,
          userId,
        );

        return {
          deploy: {
            id: latestDeploy.id,
            state: latestDeploy.state,
            url: latestDeploy.links.permalink,
          },
          site: siteInfo,
          website,
        };
      }

      throw new Error('Site info not available after deployment');
    } finally {
      // Clean up temporary directory
      logger.info('Cleaning up temporary directory', JSON.stringify({ chatId, tempDir }));
      await rimraf(tempDir);
    }
  }

  private async _runCommand(
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

  private _generateSlug(text: string): string {
    let slug = text.toLowerCase().replace(/\s+/g, '-');
    slug = slug.replace(/[^a-z0-9-]/g, '');
    slug = slug.replace(/^-+|-+$/g, '');

    return slug.slice(0, 8);
  }

  private _generateSiteName(chatId: string, length: number = 12): string {
    const shortId = chatId.slice(0, length);
    return `liblab-${shortId}`;
  }

  private async _generateUniqueSiteName(chatId: string): Promise<string> {
    const MAX_ATTEMPTS = 12;
    let counter = 1;
    let siteName = this._generateSiteName(chatId);

    while (counter <= MAX_ATTEMPTS) {
      const existingWebsite = await prisma.website.findFirst({
        where: { siteName },
      });

      if (!existingWebsite) {
        return siteName;
      }

      const baseLength = 12 - `${counter}`.length;
      siteName = this._generateSiteName(chatId, baseLength) + `-${counter}`;
      counter++;
    }

    throw new Error('Maximum number of site name generation attempts reached');
  }

  private async _getSiteIdFromChat(chatId: string): Promise<string> {
    const website = await prisma.website.findFirst({
      where: { chatId },
      select: { siteId: true },
    });

    return website?.siteId || '';
  }

  private async _handleWebsiteDatabase(
    chatId: string,
    siteId: string,
    siteName: string,
    siteUrl: string,
    userId: string,
  ): Promise<void> {
    const website = await prisma.website.findFirst({
      where: { chatId },
    });

    if (website) {
      logger.info('Updating existing website with new site info', JSON.stringify({ chatId, siteId }));
      await prisma.website.update({
        where: { id: website.id },
        data: {
          siteId,
          siteName,
          siteUrl,
        },
      });
    } else {
      logger.info('Creating new website entry', JSON.stringify({ chatId, siteId }));
      await prisma.website.create({
        data: {
          siteId,
          siteName,
          siteUrl,
          chatId,
          createdById: userId,
        },
      });
    }
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
