import { NextRequest } from 'next/server';
import type { NetlifySiteInfo } from '~/types/netlify';
import { type ChildProcess, spawn } from 'child_process';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { rimraf } from 'rimraf';
import AdmZip from 'adm-zip';
import { prisma } from '~/lib/prisma';
import { logger } from '~/utils/logger';
import { requireUserId } from '~/auth/session';
import { getTelemetry, TelemetryEventType } from '~/lib/telemetry/telemetry-manager';
import { userService } from '~/lib/services/userService';
import { env as serverEnv } from '~/env/server';

interface ErrorData {
  message?: string;
}

const TOTAL_STEPS = 6;

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

// !IMPORTANT: there is a 64 char limit for the url so we need to trim the site name and slug
function generateSlug(text: string): string {
  // Convert to lowercase and replace spaces with hyphens
  let slug = text.toLowerCase().replace(/\s+/g, '-');

  // Remove any non-alphanumeric characters except hyphens
  slug = slug.replace(/[^a-z0-9-]/g, '');

  // Remove leading/trailing hyphens
  slug = slug.replace(/^-+|-+$/g, '');

  // Limit to 8 characters
  return slug.slice(0, 8);
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

    // Adjust the base name length to accommodate the counter
    const baseLength = 12 - `${counter}`.length;
    siteName = generateSiteName(chatId, baseLength) + `-${counter}`;
    counter++;
  }

  throw new Error('Maximum number of site name generation attempts reached');
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId(request);
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

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
    const token = serverEnv.NETLIFY_AUTH_TOKEN;
    let currentStepIndex = 1;

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

      // Send initial progress
      logger.info('Initializing deployment', JSON.stringify({ chatId }));
      await writer.write(
        encoder.encode(
          `data: ${JSON.stringify({
            step: currentStepIndex,
            totalSteps: TOTAL_STEPS,
            message: 'Initializing deployment...',
            status: 'in_progress',
          })}\n\n`,
        ),
      );

      let targetSiteId = siteId || (await getSiteIdFromChat(chatId));

      logger.info('Target site ID', JSON.stringify({ chatId, targetSiteId }));

      let siteInfo: NetlifySiteInfo | undefined;

      // If no siteId provided, create a new site
      if (!targetSiteId) {
        logger.info('Creating new Netlify site', JSON.stringify({ chatId }));
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              step: ++currentStepIndex,
              totalSteps: TOTAL_STEPS,
              message: 'Creating new Netlify site...',
              status: 'in_progress',
            })}\n\n`,
          ),
        );

        let siteName: string;

        try {
          siteName = await generateUniqueSiteName(chatId);
          logger.info('Generated unique site name', JSON.stringify({ chatId, siteName }));
        } catch (error: any) {
          // Handle error in generating unique site name
          handleErrorResponse(
            writer,
            'Failed to generate unique site name',
            currentStepIndex,
            new Error(error?.message ?? JSON.stringify(error)),
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
          const errorData = await createSiteResponse.json<ErrorData>().catch(() => null);
          handleErrorResponse(
            writer,
            `Failed to create site: ${JSON.stringify(errorData)}`,
            currentStepIndex,
            new Error(errorData?.message ?? JSON.stringify(errorData)),
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

        const website = await prisma.website.findFirst({
          where: {
            chatId,
          },
        });

        if (website) {
          logger.info('Updating existing website with new site info', JSON.stringify({ chatId, siteId: targetSiteId }));
          // Update existing website with new site info
          await prisma.website.update({
            where: {
              id: website.id,
            },
            data: {
              siteId: targetSiteId,
              siteName: newSite.name,
              siteUrl: newSite.url,
            },
          });
        } else {
          logger.info('Creating new website entry', JSON.stringify({ chatId, siteId: targetSiteId }));
          // Create new website entry
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({
                step: currentStepIndex,
                totalSteps: TOTAL_STEPS,
                message: 'Creating new website entry...',
                status: 'in_progress',
              })}\n\n`,
            ),
          );
          await prisma.website.create({
            data: {
              siteId: targetSiteId,
              siteName: newSite.name,
              siteUrl: newSite.url,
              chatId,
              userId,
            },
          });
        }

        logger.info('Site created successfully', JSON.stringify({ chatId, siteId: targetSiteId }));
      } else {
        // Get existing site info
        logger.info('Getting existing site info', JSON.stringify({ chatId, siteId: targetSiteId }));
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              step: ++currentStepIndex,
              totalSteps: TOTAL_STEPS,
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

        logger.info('Fetched existing site info', JSON.stringify({ chatId, siteId: targetSiteId, siteResponse }));

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

          handleErrorResponse(
            writer,
            'Failed to get existing site info. This means the site has been deleted on Netlify. We have cleaned up the database entry. Please try to deploy again.',
            currentStepIndex,
            new Error(`Status: ${siteResponse.status}`),
          );
          await safeCloseWriter();

          return;
        } else {
          const existingSite = (await siteResponse.json()) as any;

          logger.info('Existing site info retrieved', JSON.stringify({ chatId, existingSite }));
          siteInfo = {
            id: existingSite.id,
            name: existingSite.name,
            url: existingSite.url,
            chatId,
          };
          targetSiteId = existingSite.id;
          logger.info(
            'Retrieved existing site info',
            JSON.stringify({
              chatId,
              siteId: targetSiteId,
            }),
          );
        }
      }

      // Create a temporary directory for the deployment
      const tempDir = join(tmpdir(), `netlify-deploy-${chatId}`);
      await mkdir(tempDir, { recursive: true });
      logger.info('Created temporary directory', JSON.stringify({ chatId, tempDir }));

      try {
        // Write the zip file to disk
        logger.info('Preparing deployment files', JSON.stringify({ chatId }));
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              step: ++currentStepIndex,
              totalSteps: TOTAL_STEPS,
              message: 'Preparing deployment files...',
              status: 'in_progress',
            })}\n\n`,
          ),
        );

        const zipPath = join(tempDir, 'project.zip');
        const arrayBuffer = await zipFile.arrayBuffer();
        await writeFile(zipPath, new Uint8Array(arrayBuffer));

        // Extract the zip file
        const zip = new AdmZip(zipPath);

        try {
          zip.extractAllTo(tempDir, true);
        } catch (error: any) {
          handleErrorResponse(
            writer,
            'Failed to extract zip',
            currentStepIndex,
            new Error(error?.message ?? JSON.stringify(error)),
          );

          await safeCloseWriter();

          return;
        }

        // Remove the zip file
        await unlink(zipPath);
        logger.info('Files extracted successfully', JSON.stringify({ chatId }));

        // Install dependencies
        logger.info('Installing dependencies', JSON.stringify({ chatId }));
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              step: ++currentStepIndex,
              totalSteps: TOTAL_STEPS,
              message: 'Installing dependencies...',
              status: 'in_progress',
            })}\n\n`,
          ),
        );

        await runCommand(
          'pnpm',
          ['install'],
          tempDir,
          {
            NETLIFY_AUTH_TOKEN: token,
          },
          undefined,
          async (message) => {
            if (message.includes('error') || message.includes('failed')) {
              handleErrorResponse(writer, 'Failed to install dependencies', currentStepIndex, new Error(message));

              await safeCloseWriter();

              return;
            }

            writer.write(
              encoder.encode(
                `data: ${JSON.stringify({
                  step: currentStepIndex,
                  totalSteps: TOTAL_STEPS,
                  message,
                  status: 'in_progress',
                })}\n\n`,
              ),
            );
          },
        );
        logger.info('Dependencies installed successfully', JSON.stringify({ chatId }));

        // Link and configure Netlify
        logger.info('Configuring Netlify', JSON.stringify({ chatId }));

        try {
          await runCommand('netlify', ['link', '--id', targetSiteId], tempDir, {
            NETLIFY_AUTH_TOKEN: token,
          });
          await runCommand('netlify', ['env:import', '.env'], tempDir, {
            NETLIFY_AUTH_TOKEN: token,
          });
          await runCommand('netlify', ['env:set', 'VITE_PROD', 'true'], tempDir, {
            NETLIFY_AUTH_TOKEN: token,
          });
          await runCommand('netlify', ['env:set', 'NODE_ENV', 'production'], tempDir, {
            NETLIFY_AUTH_TOKEN: token,
          });
          logger.info('Netlify configuration completed', JSON.stringify({ chatId }));
        } catch (error: any) {
          handleErrorResponse(
            writer,
            'Failed to configure Netlify',
            currentStepIndex,
            new Error(error?.message ?? JSON.stringify(error)),
          );

          await safeCloseWriter();

          return;
        }

        // Generate deployment alias from description
        const deploymentAlias = description ? generateSlug(description) : `${chatId.slice(0, 6)}`;
        logger.info('Starting deployment', JSON.stringify({ chatId, deploymentAlias }));

        // Deploy
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              step: ++currentStepIndex,
              totalSteps: TOTAL_STEPS,
              message: 'Deploying to Netlify...',
              status: 'in_progress',
            })}\n\n`,
          ),
        );

        await runCommand(
          'netlify',
          ['deploy', '--build', '--branch', deploymentAlias],
          tempDir,
          {
            NETLIFY_AUTH_TOKEN: token,
          },
          3 * 60 * 1000, // 3 minutes timeout
          (message) => {
            if (!message.includes('accountId')) {
              writer.write(
                encoder.encode(
                  `data: ${JSON.stringify({
                    step: currentStepIndex,
                    totalSteps: TOTAL_STEPS,
                    message,
                    status: 'in_progress',
                  })}\n\n`,
                ),
              );
            }
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
          const errorData = await deployResponse.json<ErrorData>().catch(() => null);
          handleErrorResponse(
            writer,
            'Failed to fetch deployment info',
            currentStepIndex,
            new Error(errorData?.message ?? JSON.stringify(errorData)),
          );
          await safeCloseWriter();

          return;
        }

        const deploys = (await deployResponse.json()) as any[];
        const latestDeploy = deploys[0];

        // After successful deployment, save to database
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

          try {
            let website;

            if (websiteId) {
              // Update existing website
              website = await prisma.website.update({
                where: {
                  id: websiteId,
                  createdById: userId,
                },
                data: {
                  siteId: siteInfo.id,
                  siteName: siteInfo.name,
                  siteUrl: latestDeploy.links.permalink,
                },
              });
              logger.info(
                'Website updated in database',
                JSON.stringify({
                  chatId,
                  siteId: siteInfo.id,
                }),
              );
            } else {
              // Create new website
              website = await prisma.website.create({
                data: {
                  siteId: siteInfo.id,
                  siteName: siteInfo.name,
                  siteUrl: latestDeploy.links.permalink,
                  chatId: siteInfo.chatId,
                  createdById: userId,
                },
              });
              logger.info(
                'Website saved to database successfully',
                JSON.stringify({
                  chatId,
                  siteId: siteInfo.id,
                }),
              );
            }

            // Send single success message with website data
            await writer.write(
              encoder.encode(
                `data: ${JSON.stringify({
                  step: currentStepIndex,
                  totalSteps: TOTAL_STEPS,
                  message: 'Deployment successful!',
                  status: 'success',
                  data: {
                    deploy: {
                      id: latestDeploy.id,
                      state: latestDeploy.state,
                      url: latestDeploy.links.permalink,
                    },
                    site: siteInfo,
                    website,
                  },
                })}\n\n`,
              ),
            );
          } catch (error: any) {
            handleErrorResponse(
              writer,
              'Failed to save website',
              currentStepIndex,
              new Error(error?.message ?? JSON.stringify(error)),
            );
            await safeCloseWriter();

            return;
          }
        }
      } finally {
        // Clean up temporary directory
        logger.info('Cleaning up temporary directory', JSON.stringify({ chatId, tempDir }));
        await rimraf(tempDir);
      }
    } catch (error: any) {
      handleErrorResponse(
        writer,
        'Deployment process failed',
        currentStepIndex,
        new Error(error?.message ?? JSON.stringify(error)),
      );
    } finally {
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

function handleErrorResponse(
  writer: WritableStreamDefaultWriter,
  message: string,
  currentStepIndex: number,
  error?: Error,
): Promise<void> {
  logger.error(
    'Deployment error',
    JSON.stringify({
      message,
      error: error ? error.message : 'Unknown error',
    }),
  );
  return writer.write(
    new TextEncoder().encode(
      `data: ${JSON.stringify({
        step: currentStepIndex,
        totalSteps: TOTAL_STEPS,
        message: message + (error ? `: ${error.message}` : ''),
        status: 'error',
        error: error ? { code: 'DEPLOYMENT_ERROR', message: error.message } : undefined,
      })}\n\n`,
    ),
  );
}

async function getSiteIdFromChat(chatId: string): Promise<string> {
  const website = await prisma.website.findFirst({
    where: {
      chatId,
    },
    select: {
      siteId: true,
    },
  });

  if (!website || !website.siteId) {
    return '';
  }

  return website.siteId;
}
