import type { LoaderFunction } from '@remix-run/node';
import { conversationService } from '~/lib/services/conversationService';
import { StorageServiceFactory } from '~/lib/services/storage/storage-service-factory';
import { snapshotService } from '~/lib/services/snapshotService';
import { logger } from '~/utils/logger';

export const loader: LoaderFunction = async ({ params: { conversationId, id } }) => {
  if (!conversationId || !id) {
    return Response.json({ error: 'Conversation ID and Snapshot ID are required' }, { status: 400 });
  }

  const conversation = await conversationService.getConversation(conversationId);

  if (!conversation) {
    return Response.json({ error: 'Conversation not found' }, { status: 404 });
  }

  try {
    const snapshot = await snapshotService.getSnapshotById(id);

    if (!snapshot) {
      return Response.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    if (snapshot.conversationId !== conversationId) {
      return Response.json({ error: 'Snapshot does not belong to this conversation' }, { status: 403 });
    }

    const storageService = StorageServiceFactory.get();
    const data = await storageService.get(snapshot.storageKey);
    const fileMap = JSON.parse(data.toString());

    if (!fileMap) {
      logger.error(`No snapshot files found for snapshot ${snapshot.id}`);
      return Response.json({ error: 'No snapshot files found' }, { status: 404 });
    }

    return Response.json({
      snapshot: {
        ...snapshot,
        fileMap,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch snapshot:', error);
    return Response.json({ error: 'Failed to fetch snapshot' }, { status: 500 });
  }
};
