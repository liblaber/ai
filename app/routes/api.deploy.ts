import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import type { NetlifySiteInfo } from '~/types/netlify';
import { prisma } from '~/lib/prisma';
import { requireUserId } from '~/session';
import { logger } from '~/utils/logger';
import { env } from '~/lib/config/env';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { rimraf } from 'rimraf';
import AdmZip from 'adm-zip';
import { exec } from 'child_process';

/*
 * Custom promisify function for ESM compatibility
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
const promisify = (fn: Function) => {
  return (...args: any[]) => {
    return new Promise((resolve, reject) => {
      fn(...args, (error: Error | null, ...results: any[]) => {
        if (error) {
          reject(error);
        } else {
          resolve(results.length === 1 ? results[0] : results);
        }
      });
    });
  };
};

const execAsync = promisify(exec);

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

    // Adjust the base name length to accommodate the counter
    const baseLength = 12 - `${counter}`.length;
    siteName = generateSiteName(chatId, baseLength) + `-${counter}`;
    counter++;
  }

  throw new Error('Maximum number of site name generation attempts reached');
}

function generateSlug(text: string): string {
  let slug = text.toLowerCase().replace(/\s+/g, '-');
  slug = slug.replace(/[^a-z0-9-]/g, '');
  slug = slug.replace(/^-+|-+$/g, '');

  return slug.slice(0, 8);
}

async function deployToNetlify(
  siteId: string,
  deployPath: string,
  netlifyToken: string,
  branchName: string,
): Promise<string> {
  // Set environment variables for Netlify CLI
  const env = {
    ...process.env,
    NETLIFY_AUTH_TOKEN: netlifyToken,
    HOME: '/tmp', // Override HOME to use writable directory
    NETLIFY_CONFIG_PATH: '/tmp/.netlify',
    XDG_CONFIG_HOME: '/tmp/.config',
    NPM_CONFIG_CACHE: '/tmp/.npm',
    PNPM_HOME: '/tmp/.pnpm',
  };

  // Create necessary directories in /tmp
  await mkdir('/tmp/.config/netlify', { recursive: true });
  await mkdir('/tmp/.netlify', { recursive: true });
  await mkdir('/tmp/.npm', { recursive: true });
  await mkdir('/tmp/.pnpm', { recursive: true });

  try {
    // Link the site
    await execAsync(`netlify link --id ${siteId}`, {
      cwd: deployPath,
      env,
    });

    // Import environment variables if .env exists
    try {
      await execAsync('netlify env:import .env', {
        cwd: deployPath,
        env,
      });
    } catch (error) {
      console.log('No .env file found or failed to import, continuing...', error);
    }

    // Set production environment
    await execAsync('netlify env:set VITE_PROD true', {
      cwd: deployPath,
      env,
    });

    console.log('Starting build...');

    await execAsync('netlify build', {
      cwd: deployPath,
      env,
      timeout: 300000, // 5 minutes timeout
    });

    console.log('Build completed successfully.');

    console.log('Starting deploy...');

    // Deploy using Netlify CLI with explicit timeout
    const { stdout } = (await execAsync(`netlify deploy --alias ${branchName}`, {
      cwd: deployPath,
      env,
      timeout: 300000, // 5 minutes timeout
    })) as { stdout: string; stderr: string };

    console.log('Deploy completed successfully.');

    // Extract deploy URL from CLI output
    const deployUrlMatch = stdout.match(/https:\/\/[^\s]+/);

    if (!deployUrlMatch) {
      throw new Error('Could not find deploy URL in Netlify CLI output');
    }

    return deployUrlMatch[0];
  } catch (error) {
    console.error('Netlify deployment error:', error);
    throw error;
  }
}

async function handleLocalDeployment(
  zipFile: File,
  siteId: string,
  description: string,
  chatId: string,
  netlifyToken: string,
): Promise<{ success: boolean; deployUrl: string }> {
  // Use /tmp directory for all operations
  const tempDir = join('/tmp', `netlify-deploy-${chatId}-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });

  try {
    // Extract the zip file
    const arrayBuffer = await zipFile.arrayBuffer();
    const zipBuffer = Buffer.from(arrayBuffer);
    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(tempDir, true);
    console.log('Extracted zip file to:', tempDir);

    const installEnv = {
      ...process.env,
      HOME: '/tmp',
      NPM_CONFIG_CACHE: '/tmp/.npm',
      PNPM_HOME: '/tmp/.pnpm',
      XDG_CONFIG_HOME: '/tmp/.config',
    };

    // Create cache directories
    await mkdir('/tmp/.npm', { recursive: true });
    await mkdir('/tmp/.pnpm', { recursive: true });
    await mkdir('/tmp/.npm/_cacache', { recursive: true });
    await mkdir('/tmp/.config', { recursive: true });

    console.log('Installing dependencies...');

    try {
      await execAsync('pnpm install --no-frozen-lockfile --prefer-offline', {
        cwd: tempDir,
        env: installEnv,
        timeout: 180000, // 3 minutes timeout
      });
      console.log('Dependencies installed successfully with pnpm');
    } catch (pnpmError) {
      console.log('pnpm failed, trying npm...');

      try {
        await execAsync('npm install --no-package-lock --no-audit', {
          cwd: tempDir,
          env: installEnv,
          timeout: 180000,
        });
        console.log('Dependencies installed successfully with npm');
      } catch (npmError) {
        console.error('Both pnpm and npm failed:', { pnpmError, npmError });

        // Continue anyway - Netlify might handle the build
      }
    }

    // Generate deployment alias from description
    const deploymentAlias = description ? generateSlug(description) : `${chatId.slice(0, 6)}`;

    // Deploy using Netlify CLI
    console.log('Deploying to Netlify...');

    const deployUrl = await deployToNetlify(siteId, tempDir, netlifyToken, deploymentAlias);

    return {
      success: true,
      deployUrl,
    };
  } finally {
    // Clean up temporary directory
    try {
      await rimraf(tempDir);
    } catch (cleanupError) {
      console.warn('Failed to clean up temp directory:', cleanupError);
    }
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const userId = await requireUserId(request);

  const safeCloseWriter = async () => {
    if (!writer.closed) {
      await writer.close();
    }
  };

  // Start processing in the background
  (async () => {
    const formData = await request.formData();
    const siteId = formData.get('siteId') as string;
    const websiteId = formData.get('websiteId') as string;
    const chatId = formData.get('chatId') as string;
    const description = formData.get('description') as string;
    const zipFile = formData.get('zipFile') as File;
    const token = env.NETLIFY_AUTH_TOKEN;

    try {
      logger.info('Starting deployment process', JSON.stringify({ chatId, siteId, websiteId }));

      if (!token) {
        logger.error('Netlify token not configured');
        await writer.write(encoder.encode(`data: ${JSON.stringify({ error: 'Netlify token not configured' })}\n\n`));
        await safeCloseWriter();

        return;
      }

      if (!zipFile) {
        logger.error('No zip file provided', JSON.stringify({ chatId }));
        await writer.write(encoder.encode(`data: ${JSON.stringify({ error: 'No zip file provided' })}\n\n`));
        await safeCloseWriter();

        return;
      }

      let targetSiteId = siteId;
      let siteInfo: NetlifySiteInfo | undefined;

      // Send initial progress
      logger.info('Initializing deployment', JSON.stringify({ chatId }));
      await writer.write(
        encoder.encode(
          `data: ${JSON.stringify({
            step: 1,
            totalSteps: 3,
            message: 'Initializing deployment...',
            status: 'in_progress',
          })}\n\n`,
        ),
      );

      // If no siteId provided, create a new site
      if (!targetSiteId) {
        logger.info('Creating new Netlify site', JSON.stringify({ chatId }));
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              step: 2,
              totalSteps: 3,
              message: 'Creating new Netlify site...',
              status: 'in_progress',
            })}\n\n`,
          ),
        );

        let siteName: string;

        try {
          siteName = await generateUniqueSiteName(chatId);
          logger.info('Generated unique site name', JSON.stringify({ chatId, siteName }));
        } catch (error) {
          logger.error(
            'Failed to generate unique site name',
            JSON.stringify({
              chatId,
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          );
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({
                step: 2,
                totalSteps: 3,
                message: 'Failed to generate a unique site name. Please try again.',
                status: 'error',
                error: {
                  code: 'SITE_NAME_GENERATION_FAILED',
                  message: error instanceof Error ? error.message : 'Failed to generate unique site name',
                },
              })}\n\n`,
            ),
          );
          await safeCloseWriter();

          return;
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
          const errorData = await createSiteResponse.json<{ message: string }>().catch(() => null);
          logger.error(
            'Failed to create site',
            JSON.stringify({
              chatId,
              status: createSiteResponse.status,
              error: errorData,
            }),
          );
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({
                step: 2,
                totalSteps: 3,
                message: 'Failed to create Netlify site. Please try again.',
                status: 'error',
                error: {
                  code: 'SITE_CREATION_FAILED',
                  message: errorData?.message || 'Failed to create site',
                  details: errorData,
                },
              })}\n\n`,
            ),
          );
          await safeCloseWriter();

          return;
        }

        const newSite = (await createSiteResponse.json()) as any;
        targetSiteId = newSite.id;
        siteInfo = {
          id: newSite.id,
          name: newSite.name,
          url: newSite.url,
          chatId,
        };

        // Update website entity with site info immediately after creation
        try {
          if (websiteId) {
            await prisma.website.update({
              where: { id: websiteId },
              data: {
                siteId: newSite.id,
                siteName: newSite.name,
                siteUrl: newSite.url,
              },
            });
          } else {
            await prisma.website.create({
              data: {
                siteId: newSite.id,
                siteName: newSite.name,
                siteUrl: newSite.url,
                chatId,
                userId,
              },
            });
          }
        } catch (dbError) {
          logger.error(
            'Failed to update website in database',
            JSON.stringify({
              chatId,
              siteId: newSite.id,
              error: dbError instanceof Error ? dbError.message : 'Unknown error',
            }),
          );

          // Continue with deployment even if DB update fails
        }

        logger.info('Site created successfully', JSON.stringify({ chatId, siteId: targetSiteId }));
      } else {
        // Get existing site info
        logger.info('Getting existing site info', JSON.stringify({ chatId, siteId: targetSiteId }));
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              step: 2,
              totalSteps: 3,
              message: 'Getting existing site info...',
              status: 'in_progress',
            })}\n\n`,
          ),
        );

        const siteResponse = await fetch(`https://api.netlify.com/api/v1/sites/${targetSiteId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!siteResponse.ok) {
          logger.warn(
            'Failed to get existing site info',
            JSON.stringify({
              chatId,
              siteId: targetSiteId,
              status: siteResponse.status,
            }),
          );
        } else {
          const existingSite = (await siteResponse.json()) as any;
          siteInfo = {
            id: existingSite.id,
            name: existingSite.name,
            url: existingSite.url,
            chatId,
          };
          logger.info('Retrieved existing site info', JSON.stringify({ chatId, siteId: targetSiteId }));
        }
      }

      // Convert zip file to base64
      const arrayBuffer = await zipFile.arrayBuffer();
      const base64Zip = Buffer.from(arrayBuffer).toString('base64');

      // Call Lambda function
      logger.info('Calling deployment Lambda', JSON.stringify({ chatId }));
      await writer.write(
        encoder.encode(
          `data: ${JSON.stringify({
            step: 3,
            totalSteps: 3,
            message: 'Deploying to Netlify...',
            status: 'in_progress',
          })}\n\n`,
        ),
      );

      let deployResult: { success: boolean; deployUrl: string };

      if (env.USE_LOCAL_LAMBDA === 'true') {
        // Use local Lambda handler
        deployResult = await handleLocalDeployment(zipFile, targetSiteId, description, chatId, token);
      } else {
        // Use remote Lambda
        if (!env.DEPLOY_LAMBDA_URL) {
          throw new Error('DEPLOY_LAMBDA_URL not configured');
        }

        const lambdaResponse = await fetch(env.DEPLOY_LAMBDA_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            zipFile: base64Zip,
            siteId: targetSiteId,
            description,
            chatId,
          }),
        });

        if (!lambdaResponse.ok) {
          const errorData = await lambdaResponse
            .json<{ message: string; code: string; details: string }>()
            .catch(() => null);
          logger.error(
            'Lambda deployment failed',
            JSON.stringify({
              chatId,
              status: lambdaResponse.status,
              error: errorData,
            }),
          );

          const errorMessage = errorData?.message || 'Deployment failed';
          const errorCode = errorData?.code || 'DEPLOYMENT_FAILED';
          const errorDetails = errorData?.details || errorData;

          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({
                step: 3,
                totalSteps: 3,
                message: 'Deployment failed',
                status: 'error',
                error: {
                  code: errorCode,
                  message: errorMessage,
                  details: errorDetails,
                  canRetry: true,
                },
              })}\n\n`,
            ),
          );
          await safeCloseWriter();

          return;
        }

        deployResult = await lambdaResponse.json();
      }

      if (!deployResult.success || !deployResult.deployUrl) {
        throw new Error('Invalid deployment result');
      }

      // After successful deployment, save to database
      if (siteInfo) {
        logger.info('Saving website to database', JSON.stringify({ chatId, siteId: siteInfo.id }));

        try {
          let website;

          if (websiteId) {
            // Update existing website
            website = await prisma.website.update({
              where: {
                id: websiteId,
              },
              data: {
                siteId: siteInfo.id,
                siteName: siteInfo.name,
                siteUrl: deployResult.deployUrl,
              },
            });
            logger.info('Website updated in database', JSON.stringify({ chatId, siteId: siteInfo.id }));
          } else {
            // Create new website
            website = await prisma.website.create({
              data: {
                siteId: siteInfo.id,
                siteName: siteInfo.name,
                siteUrl: deployResult.deployUrl,
                chatId: siteInfo.chatId,
                userId,
              },
            });
            logger.info('Website saved to database successfully', JSON.stringify({ chatId, siteId: siteInfo.id }));
          }

          // Send success message
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({
                step: 3,
                totalSteps: 3,
                message: 'Deployment successful!',
                status: 'success',
                data: {
                  deploy: {
                    url: deployResult.deployUrl,
                  },
                  site: siteInfo,
                  website,
                },
              })}\n\n`,
            ),
          );
        } catch (error) {
          logger.error(
            'Failed to save website to database',
            JSON.stringify({
              chatId,
              siteId: siteInfo.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          );

          // Send success message without website data
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({
                step: 3,
                totalSteps: 3,
                message: 'Deployment successful!',
                status: 'success',
                data: {
                  deploy: {
                    url: deployResult.deployUrl,
                  },
                  site: siteInfo,
                },
              })}\n\n`,
            ),
          );
        }
      }
    } catch (error) {
      logger.error(
        'Deployment failed',
        JSON.stringify({
          chatId,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        }),
      );

      if (!writer.closed) {
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              step: 0,
              totalSteps: 3,
              message: error instanceof Error ? error.message : 'Deployment failed',
              status: 'error',
            })}\n\n`,
          ),
        );
      }

      await safeCloseWriter();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
