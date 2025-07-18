import type { ActionFunction } from '@remix-run/node';
import { StorageServiceFactory } from '~/lib/services/storage/storage-service-factory';
import { snapshotService } from '~/lib/services/snapshotService';
import { prisma } from '~/lib/prisma';
import { logger } from '~/utils/logger';
import { messageService } from '~/lib/services/messageService';

export const action: ActionFunction = async ({ request, params: { conversationId, id } }) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  if (!conversationId || !id) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        select: {
          id: true,
          snapshot: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

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

    if (!snapshot.messageId) {
      logger.info(`Snapshot ${snapshot.id} does not have a messageId, skipping rewind`);
      return Response.json({ success: true });
    }

    const messageIndex = conversation.messages.findIndex((msg) => msg.id === snapshot.messageId);

    if (messageIndex < 0) {
      logger.info(`Snapshot ${snapshot.id} does not have a newer message, skipping rewind`);
      return Response.json({ success: true });
    }

    const messagesToDelete = conversation.messages.slice(messageIndex + 1);
    const messageIds = messagesToDelete.map((msg) => msg.id);
    const snapshotIds = messagesToDelete.filter((msg) => msg.snapshot).map((msg) => msg.snapshot!.id);

    if (messageIds.length > 0) {
      await messageService.deleteManyWithSnapshots(messageIds);
    }

    if (snapshotIds.length > 0) {
      const storageService = StorageServiceFactory.get();
      const results = await Promise.allSettled(
        snapshotIds.map((snapshotId) => storageService.delete(`snapshots/${conversationId}/${snapshotId}`)),
      );

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          logger.error(`Failed to delete snapshot ${snapshotIds[index]}:`, result.reason);
        }
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    logger.error('Failed to fetch snapshot:', error);
    return Response.json({ error: 'Failed to fetch snapshot' }, { status: 500 });
  }
};
