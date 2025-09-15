import type { ChildProcess } from 'child_process';
import { spawn } from 'child_process';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { rimraf } from 'rimraf';
import AdmZip from 'adm-zip';
import { parse } from 'dotenv';
import { prisma } from '~/lib/prisma';
import { logger } from '~/utils/logger';
import { getTelemetry } from '~/lib/telemetry/telemetry-manager';
import { TelemetryEventType } from '~/lib/telemetry/telemetry-types';
import { userService } from '~/lib/services/userService';
import type {
  DeploymentConfig,
  DeploymentPlugin,
  DeploymentPluginId,
  DeploymentProgress,
  DeploymentResult,
} from '~/lib/plugins/types';

export interface CommandResult {
  output: string;
  error: string;
}

export interface SiteInfo {
  id: string;
  name: string;
  url: string;
  chatId: string;
}

export abstract class BaseDeploymentPlugin implements DeploymentPlugin {
  abstract pluginId: DeploymentPluginId;
  abstract name: string;
  abstract description: string;
  protected abstract totalSteps: number;

  /**
   * Creates a temporary directory for deployment operations
   */
  protected async createTempDirectory(chatId: string, prefix: string = 'deploy'): Promise<string> {
    const tempDir = join(tmpdir(), `${prefix}-${chatId}`);
    await mkdir(tempDir, { recursive: true });
    logger.info('Created temporary directory', JSON.stringify({ chatId, tempDir }));

    return tempDir;
  }

  /**
   * Extracts a zip file to a temporary directory
   */
  protected async extractZipFile(zipFile: File, tempDir: string, chatId: string): Promise<void> {
    logger.info('Preparing deployment files', JSON.stringify({ chatId }));

    const zipPath = join(tempDir, 'project.zip');
    const arrayBuffer = await zipFile.arrayBuffer();
    await writeFile(zipPath, new Uint8Array(arrayBuffer));

    // Extract the zip file
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(tempDir, true);

    // Remove the zip file
    await unlink(zipPath);
    logger.info('Files extracted successfully', JSON.stringify({ chatId }));
  }

  /**
   * Reads environment variables from .env file
   */
  protected async readEnvFile(tempDir: string): Promise<Record<string, string>> {
    const envFilePath = join(tempDir, '.env');
    const envFile: Record<string, string> = {};

    if (await this.fileExists(envFilePath)) {
      const fs = await import('fs/promises');
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

    return envFile;
  }

  /**
   * Checks if a file exists
   */
  protected async fileExists(filePath: string): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      await fs.access(filePath);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Executes a command with optional timeout and progress callback
   */
  protected async runCommand(
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
        logger.info(message);
        output += message;
        onProgress?.(message);
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const message = data.toString();
        logger.error(message);
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

  /**
   * Updates or creates a website record in the database
   */
  protected async updateWebsiteDatabase(
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

  /**
   * Tracks deployment telemetry event
   */
  protected async trackDeploymentTelemetry(siteInfo: SiteInfo, userId: string, provider: string): Promise<void> {
    const telemetry = await getTelemetry();
    const user = await userService.getUser(userId);
    await telemetry.trackTelemetryEvent(
      {
        eventType: TelemetryEventType.USER_APP_DEPLOY,
        properties: { websiteInfo: siteInfo, provider },
      },
      user,
    );
  }

  /**
   * Tracks deployment error telemetry event
   */
  protected async trackDeploymentErrorTelemetry(
    error: string,
    userId: string,
    provider: string,
    chatId?: string,
  ): Promise<void> {
    const telemetry = await getTelemetry();
    const user = await userService.getUser(userId);
    await telemetry.trackTelemetryEvent(
      {
        eventType: TelemetryEventType.USER_APP_DEPLOY_ERROR,
        properties: {
          error,
          provider,
          chatId,
        },
      },
      user,
    );
  }

  /**
   * Sends progress update
   */
  protected async sendProgress(
    step: number,
    totalSteps: number,
    message: string,
    status: 'in_progress' | 'success' | 'error' = 'in_progress',
    onProgress: (progress: DeploymentProgress) => Promise<void>,
  ): Promise<void> {
    await onProgress({
      step,
      totalSteps,
      message,
      status,
    });
  }

  /**
   * Cleans up temporary directory
   */
  protected async cleanupTempDirectory(tempDir: string, chatId: string): Promise<void> {
    logger.info('Cleaning up temporary directory', JSON.stringify({ chatId, tempDir }));
    await rimraf(tempDir);
  }

  /**
   * Generates a unique site name based on chat ID
   */
  protected generateSiteName(chatId: string, prefix: string = 'liblab', length: number = 12): string {
    const shortId = chatId.slice(0, length);
    return `${prefix}-${shortId}`;
  }

  /**
   * Generates a unique site name with collision checking
   */
  protected async generateUniqueSiteName(
    chatId: string,
    prefix: string = 'liblab',
    maxAttempts: number = 12,
  ): Promise<string> {
    let counter = 1;
    let siteName = this.generateSiteName(chatId, prefix);

    while (counter <= maxAttempts) {
      const existingWebsite = await prisma.website.findFirst({
        where: { siteName },
      });

      if (!existingWebsite) {
        return siteName;
      }

      const baseLength = 12 - `${counter}`.length;
      siteName = this.generateSiteName(chatId, prefix, baseLength) + `-${counter}`;
      counter++;
    }

    throw new Error('Maximum number of site name generation attempts reached');
  }

  /**
   * Gets site ID from chat ID
   */
  protected async getSiteIdFromChat(chatId: string): Promise<string> {
    const website = await prisma.website.findFirst({
      where: { chatId },
      select: { siteId: true },
    });

    return website?.siteId || '';
  }

  /**
   * Generates a slug from text
   */
  protected generateSlug(text: string): string {
    let slug = text.toLowerCase().replace(/\s+/g, '-');
    slug = slug.replace(/[^a-z0-9-]/g, '');
    slug = slug.replace(/^-+|-+$/g, '');

    return slug.slice(0, 8);
  }

  abstract deploy(
    zipFile: File,
    config: DeploymentConfig,
    onProgress: (progress: DeploymentProgress) => Promise<void>,
  ): Promise<DeploymentResult>;
}
