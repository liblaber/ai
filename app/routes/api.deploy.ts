import type { ActionFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { getPluginById } from '~/lib/deployment/plugins';
import { prisma } from '~/lib/prisma';
import type { Website } from '@prisma/client';
import { logger } from '~/utils/logger';

interface SiteInfo {
  id: string;
  name: string;
  url: string;
  chatId: string;
}

interface WebsiteResult {
  id: string;
  siteId: string;
  siteName: string;
  siteUrl: string;
  chatId: string;
}

async function handleWebsiteUpdate(siteInfo: SiteInfo, websiteId?: string): Promise<WebsiteResult> {
  try {
    let website: Website;

    if (websiteId) {
      website = await prisma.website.update({
        where: {
          id: websiteId,
        },
        data: {
          siteId: siteInfo.id,
          siteName: siteInfo.name,
          siteUrl: siteInfo.url,
        },
      });
    } else {
      website = await prisma.website.create({
        data: {
          siteId: siteInfo.id,
          siteName: siteInfo.name,
          siteUrl: siteInfo.url,
          chatId: siteInfo.chatId,
        },
      });
    }

    // Ensure we return a valid WebsiteResult
    return {
      id: website.id,
      siteId: website.siteId || siteInfo.id,
      siteName: website.siteName || siteInfo.name,
      siteUrl: website.siteUrl || siteInfo.url,
      chatId: website.chatId,
    };
  } catch (error) {
    logger.error('Error updating or creating website:', JSON.stringify(error, null, 2));
    throw error;
  }
}

export const action: ActionFunction = async ({ request }) => {
  try {
    const formData = await request.formData();
    const pluginId = formData.get('pluginId') as string;
    const siteId = formData.get('siteId') as string | undefined;
    const websiteId = formData.get('websiteId') as string | undefined;
    const chatId = formData.get('chatId') as string;
    const description = formData.get('description') as string;
    const zipFile = formData.get('zipFile') as File;

    if (!pluginId) {
      return json({ error: 'Plugin ID is required' }, { status: 400 });
    }

    if (!zipFile) {
      return json({ error: 'Zip file is required' }, { status: 400 });
    }

    // Get the plugin implementation
    const plugin = getPluginById(pluginId);

    if (!plugin) {
      return json({ error: 'Plugin not found' }, { status: 404 });
    }

    // Check if the plugin is enabled
    const isEnabled = await plugin.isEnabled();

    if (!isEnabled) {
      return json({ error: 'Plugin is not enabled' }, { status: 403 });
    }

    // Create a new ReadableStream for streaming the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Deploy using the plugin
          const result = await plugin.deploy({
            chatId,
            siteId,
            websiteId,
            description,
            zipFile,
            onProgress: (progress) => {
              // Send progress updates through the stream
              const encoder = new TextEncoder();
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
            },
          });

          if (!result.success) {
            const encoder = new TextEncoder();
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  step: 1,
                  totalSteps: 1,
                  message: result.error,
                  status: 'error',
                })}\n\n`,
              ),
            );
            controller.close();

            return;
          }

          // Handle website creation/update if site info is available
          if (result.data?.site) {
            try {
              result.data.website = await handleWebsiteUpdate(result.data.site, websiteId);
            } catch (error) {
              console.error('Error handling website update:', error);
            }
          }

          // Send the final success result
          const encoder = new TextEncoder();
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                step: result.data?.deploy ? 6 : 4,
                totalSteps: result.data?.deploy ? 6 : 4,
                message: 'Deployment completed successfully',
                status: 'success',
                data: result.data,
              })}\n\n`,
            ),
          );
          controller.close();
        } catch (error) {
          const encoder = new TextEncoder();
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                step: 1,
                totalSteps: 1,
                message: error instanceof Error ? error.message : 'An error occurred during deployment',
                status: 'error',
              })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    // Return the streaming response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in deploy action:', error);
    return json(
      { error: error instanceof Error ? error.message : 'An error occurred during deployment' },
      { status: 500 },
    );
  }
};
