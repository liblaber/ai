import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { StarterPluginManager } from '~/lib/plugins/starter/starter-plugin-manager';
import type { StarterPluginId } from '~/lib/plugins/types';
import { conversationService } from '~/lib/services/conversationService';
import { logger } from '~/utils/logger';

const requestBodySchema = z.object({
  packageJson: z.string().min(1, 'packageJson cannot be empty'),
  conversationId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationResult = requestBodySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const { packageJson, conversationId } = validationResult.data;

    let starterId: StarterPluginId = StarterPluginManager.defaultStarter;

    if (conversationId) {
      const conversation = await conversationService.getConversation(conversationId);

      if (conversation) {
        starterId = conversation.starterId as StarterPluginId;
      }
    }

    const files = await StarterPluginManager.getDataAccessFileMap(packageJson, starterId);

    return NextResponse.json({ files });
  } catch (error) {
    logger.error('Error in starter-template/data-access-files endpoint:', error);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
