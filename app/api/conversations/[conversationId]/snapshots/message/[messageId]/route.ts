import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { conversationService } from '~/lib/services/conversationService';
import { StorageServiceFactory } from '~/lib/services/storage/storage-service-factory';
import { snapshotService } from '~/lib/services/snapshotService';
import { logger } from '~/utils/logger';
import { requireUserId } from '~/auth/session';

// Zod schema for the request body
const UPDATE_SNAPSHOT_SCHEMA = z.object({
  fileMap: z.record(
    z.string(),
    z
      .union([
        z.object({
          type: z.literal('file'),
          content: z.string(),
          isBinary: z.boolean(),
        }),
        z.object({
          type: z.literal('folder'),
        }),
      ])
      .optional(),
  ),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string; messageId: string }> },
) {
  const { conversationId, messageId } = await params;

  if (!conversationId || !messageId) {
    return NextResponse.json({ error: 'Conversation ID and Message ID are required' }, { status: 400 });
  }

  const userId = await requireUserId(request);

  const conversation = await conversationService.getConversation(conversationId);

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  // Check if the conversation belongs to the authenticated user
  if (conversation.userId !== userId) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  try {
    // Find the snapshot associated with this message ID
    const snapshot = await snapshotService.getSnapshotByMessageId(messageId);

    if (!snapshot) {
      logger.error(`Snapshot not found for message ${messageId}`);
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    if (snapshot.conversationId !== conversationId) {
      logger.error(`Snapshot ${snapshot.id} does not belong to conversation ${conversationId}`);
      return NextResponse.json({ error: 'Snapshot does not belong to this conversation' }, { status: 403 });
    }

    const storageService = StorageServiceFactory.get();
    const data = await storageService.get(snapshot.storageKey);
    const fileMap = JSON.parse(data.toString());

    if (!fileMap) {
      logger.error(`No snapshot files found for snapshot ${snapshot.id}`);
      return NextResponse.json({ error: 'No snapshot files found' }, { status: 404 });
    }

    // Validate and parse the request body
    const body = await request.json();
    const requestData = UPDATE_SNAPSHOT_SCHEMA.parse(body);
    const updatedFileMap = { ...fileMap, ...requestData.fileMap };

    const serializedData = Buffer.from(JSON.stringify(updatedFileMap, null, 2));
    await storageService.save(snapshot.storageKey, serializedData);

    return NextResponse.json({
      success: true,
      snapshot: {
        ...snapshot,
        fileMap: updatedFileMap,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: error.errors }, { status: 400 });
    }

    logger.error('Failed to update snapshot:', error);

    return NextResponse.json({ error: 'Failed to update snapshot' }, { status: 500 });
  }
}
