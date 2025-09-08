import { NextRequest } from 'next/server';
import { requireUserId } from '~/auth/session';
import { DeploymentPluginManager } from '~/lib/plugins/deployment';
import type { DeploymentConfig, DeploymentProgress } from '~/lib/plugins/types';
import { logger } from '~/utils/logger';

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
    try {
      const formData = await request.formData();
      const siteId = formData.get('siteId') as string;
      const websiteId = formData.get('websiteId') as string;
      const chatId = formData.get('chatId') as string;
      const description = formData.get('description') as string;
      const environmentId = formData.get('environmentId') as string | undefined;
      const zipFile = formData.get('zipFile') as File;

      const deploymentType = (formData.get('deploymentType') as string) || 'netlify';

      logger.info('Starting deployment process', JSON.stringify({ chatId, siteId, websiteId, deploymentType }));

      if (!zipFile) {
        logger.error('No zip file provided', JSON.stringify({ chatId }));
        await writer.write(encoder.encode(`data: ${JSON.stringify({ error: 'No zip file provided' })}\n\n`));
        await safeCloseWriter();

        return;
      }

      // Initialize deployment plugin manager
      const deploymentManager = DeploymentPluginManager.getInstance();
      await deploymentManager.initialize();

      // Get the appropriate deployment plugin
      const plugin = deploymentManager.getPlugin(deploymentType);

      if (!plugin) {
        const error = `Deployment plugin '${deploymentType}' not found`;
        logger.error(error, JSON.stringify({ chatId, deploymentType }));
        await writer.write(encoder.encode(`data: ${JSON.stringify({ error })}\n\n`));
        await safeCloseWriter();

        return;
      }

      // Prepare deployment configuration
      const config: DeploymentConfig = {
        siteId,
        websiteId,
        chatId,
        description,
        userId,
        environmentId,
      };

      // Create progress handler
      const onProgress = async (progress: DeploymentProgress) => {
        await writer.write(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
      };

      // Execute deployment using the plugin
      const result = await deploymentManager.deploy(deploymentType, zipFile, config, onProgress);

      // Send success message
      await writer.write(
        encoder.encode(
          `data: ${JSON.stringify({
            step: 6,
            totalSteps: 6,
            message: 'Deployment successful!',
            status: 'success',
            data: result,
          })}\n\n`,
        ),
      );

      logger.info('Deployment completed successfully', JSON.stringify({ chatId, deploymentType }));
    } catch (error: any) {
      logger.error('Deployment process failed', JSON.stringify({ error: error?.message }));

      const errorMessage = error?.message || 'Deployment process failed';
      await writer.write(
        encoder.encode(
          `data: ${JSON.stringify({
            step: 1,
            totalSteps: 6,
            message: errorMessage,
            status: 'error',
            error: { code: 'DEPLOYMENT_ERROR', message: errorMessage },
          })}\n\n`,
        ),
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
