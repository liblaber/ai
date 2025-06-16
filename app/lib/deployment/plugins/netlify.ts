import { type DeploymentParams, type DeploymentPlugin, type DeploymentResult } from '~/types/deployment';
import { env } from '~/lib/config/env';
import { type ChildProcess, spawn } from 'child_process';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { rimraf } from 'rimraf';
import AdmZip from 'adm-zip';
import { generateDeploymentAlias } from '~/lib/deployment/utils';
import { prisma } from '~/lib/prisma';

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

function generateSiteName(chatId: string, length: number = 12): string {
  const shortId = chatId.slice(0, length);
  return `liblab-${shortId}`;
}

async function generateUniqueSiteName(chatId: string): Promise<string> {
  const MAX_ATTEMPTS = 12;
  let counter = 1;
  let siteName = generateSiteName(chatId);

  while (counter <= MAX_ATTEMPTS) {
    const existingWebsite = await prisma.website.findFirst({
      where: {
        siteName,
      },
    });

    if (!existingWebsite) {
      return siteName;
    }

    const baseLength = 12 - `${counter}`.length;
    siteName = generateSiteName(chatId, baseLength) + `-${counter}`;
    counter++;
  }

  throw new Error('Maximum number of site name generation attempts reached');
}

interface NetlifySite {
  id: string;
  name: string;
  url: string;
}

interface NetlifyDeploy {
  id: string;
  state: string;
  links: {
    permalink: string;
  };
}

export const netlifyPlugin: DeploymentPlugin = {
  id: 'netlify',
  name: 'Netlify',
  description: 'Deploy your site to Netlify',
  icon: 'i-ph:rocket-launch',
  theme: {
    primary: 'blue-500',
    background: 'blue-50',
    hover: 'blue-500',
    dark: {
      primary: 'blue-500',
      background: 'blue-900/20',
      hover: 'blue-500',
    },
  },
  isEnabled: async () => {
    return !!env.NETLIFY_AUTH_TOKEN;
  },
  deploy: async (params: DeploymentParams): Promise<DeploymentResult> => {
    const { chatId, siteId, description, zipFile, onProgress } = params;
    const token = env.NETLIFY_AUTH_TOKEN;

    if (!token) {
      return {
        success: false,
        error: 'Netlify token not configured',
      };
    }

    if (!zipFile) {
      return {
        success: false,
        error: 'No zip file provided',
      };
    }

    let targetSiteId = siteId;
    let siteInfo: { id: string; name: string; url: string; chatId: string } | undefined;

    try {
      onProgress({
        step: 1,
        totalSteps: 6,
        message: 'Initializing deployment...',
        status: 'in_progress',
      });

      // If no siteId provided, create a new site
      if (!targetSiteId) {
        onProgress({
          step: 2,
          totalSteps: 6,
          message: 'Creating new Netlify site...',
          status: 'in_progress',
        });

        let siteName: string;

        try {
          siteName = await generateUniqueSiteName(chatId);
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate unique site name',
          };
        }

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
          return {
            success: false,
            error: 'Failed to create site',
          };
        }

        const newSite = (await createSiteResponse.json()) as NetlifySite;
        targetSiteId = newSite.id;
        siteInfo = {
          id: newSite.id,
          name: newSite.name,
          url: newSite.url,
          chatId,
        };
      } else {
        onProgress({
          step: 2,
          totalSteps: 6,
          message: 'Getting existing site info...',
          status: 'in_progress',
        });

        const siteResponse = await fetch(`https://api.netlify.com/api/v1/sites/${targetSiteId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (siteResponse.ok) {
          const existingSite = (await siteResponse.json()) as NetlifySite;
          siteInfo = {
            id: existingSite.id,
            name: existingSite.name,
            url: existingSite.url,
            chatId,
          };
        }
      }

      // Create a temporary directory for the deployment
      const tempDir = join(tmpdir(), `netlify-deploy-${chatId}`);
      await mkdir(tempDir, { recursive: true });

      try {
        onProgress({
          step: 3,
          totalSteps: 6,
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
          step: 4,
          totalSteps: 6,
          message: 'Installing dependencies...',
          status: 'in_progress',
        });

        await runCommand(
          'pnpm',
          ['install'],
          tempDir,
          {
            NETLIFY_AUTH_TOKEN: token,
          },
          undefined,
          (message) => {
            onProgress({
              step: 4,
              totalSteps: 6,
              message,
              status: 'in_progress',
            });
          },
        );

        onProgress({
          step: 5,
          totalSteps: 6,
          message: 'Configuring Netlify...',
          status: 'in_progress',
        });

        if (!targetSiteId) {
          return {
            success: false,
            error: 'No site ID available',
          };
        }

        await runCommand('netlify', ['link', '--id', targetSiteId], tempDir, {
          NETLIFY_AUTH_TOKEN: token,
        });
        await runCommand('netlify', ['env:import', '.env'], tempDir, {
          NETLIFY_AUTH_TOKEN: token,
        });
        await runCommand('netlify', ['env:set', 'VITE_PROD', 'true'], tempDir, {
          NETLIFY_AUTH_TOKEN: token,
        });

        const deploymentAlias = generateDeploymentAlias(description, chatId);

        onProgress({
          step: 6,
          totalSteps: 6,
          message: 'Deploying to Netlify...',
          status: 'in_progress',
        });

        await runCommand(
          'netlify',
          ['deploy', '--build', '--branch', deploymentAlias],
          tempDir,
          {
            NETLIFY_AUTH_TOKEN: token,
          },
          3 * 60 * 1000,
          (message) => {
            if (!message.includes('accountId')) {
              onProgress({
                step: 6,
                totalSteps: 6,
                message,
                status: 'in_progress',
              });
            }
          },
        );

        const deployResponse = await fetch(`https://api.netlify.com/api/v1/sites/${targetSiteId}/deploys`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!deployResponse.ok) {
          return {
            success: false,
            error: 'Failed to get deploy info',
          };
        }

        const deploys = (await deployResponse.json()) as NetlifyDeploy[];
        const latestDeploy = deploys[0];

        if (siteInfo) {
          return {
            success: true,
            data: {
              deploy: {
                id: latestDeploy.id,
                state: latestDeploy.state,
                url: latestDeploy.links.permalink,
              },
              site: siteInfo,
            },
          };
        }

        return {
          success: false,
          error: 'Site info not available',
        };
      } finally {
        await rimraf(tempDir);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deployment failed',
      };
    }
  },
};
