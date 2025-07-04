import type { ActionFunction } from '@remix-run/node';
import { conversationService } from '~/lib/services/conversationService';
import { StorageServiceFactory } from '~/lib/services/storage/storage-service-factory';
import type { FileMap } from '~/lib/stores/files';
import { createId } from '@paralleldrive/cuid2';
import { snapshotService } from '~/lib/services/snapshotService';
import { logger } from '~/utils/logger';

export const action: ActionFunction = async ({ request, params: { conversationId } }) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  if (!conversationId) {
    return Response.json({ error: 'Conversation ID is required' }, { status: 400 });
  }

  const conversation = await conversationService.getConversation(conversationId);

  if (!conversation) {
    return Response.json({ error: 'Conversation not found' }, { status: 404 });
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

    return Response.json({ id: snapshotId });
  } catch (error) {
    logger.error('Failed to store snapshot:', error);
    return Response.json({ error: 'Failed to store snapshot' }, { status: 500 });
  }
};

const getSnapshotKey = (conversationId: string, snapshotId: string) => {
  return `snapshots/${conversationId}/${snapshotId}`;
};
