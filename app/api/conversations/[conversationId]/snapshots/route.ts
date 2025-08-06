import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '~/lib/services/conversationService';
import { StorageServiceFactory } from '~/lib/services/storage/storage-service-factory';
import type { FileMap } from '~/lib/stores/files';
import { createId } from '@paralleldrive/cuid2';
import { snapshotService } from '~/lib/services/snapshotService';
import { logger } from '~/utils/logger';
import { requireUserId } from '~/auth/session';
import { prisma } from '~/lib/prisma';

export async function POST(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;

  if (!conversationId) {
    return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
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
    const body = (await request.json()) as {
      fileMap: FileMap;
      messageId?: string;
    };

    const storageService = StorageServiceFactory.get();
    const snapshotId = createId();
    const storageKey = getSnapshotKey(conversationId, snapshotId);

    await prisma.$transaction(async (tx) => {
      logger.info(`Creating snapshot entry in db ${snapshotId} for conversation ${conversationId}`);
      logger.info('The body is: ', JSON.stringify(body));

      await snapshotService.createSnapshot(
        {
          id: snapshotId,
          conversationId,
          messageId: body.messageId ?? null,
          storageType: storageService.getStorageType(),
          storageKey,
        },
        tx,
      );

      logger.info(`Saving snapshot files to storage ${storageKey}`);

      const serializedData = Buffer.from(JSON.stringify(body.fileMap, null, 2));
      await storageService.save(storageKey, serializedData);
    });

    return NextResponse.json({ id: snapshotId });
  } catch (error) {
    logger.error('Failed to store snapshot:', error);
    return NextResponse.json({ error: 'Failed to store snapshot' }, { status: 500 });
  }
}

const getSnapshotKey = (conversationId: string, snapshotId: string) => {
  return `snapshots/${conversationId}/${snapshotId}`;
};
