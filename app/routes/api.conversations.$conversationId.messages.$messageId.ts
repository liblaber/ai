import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { prisma } from '~/lib/prisma';
import { messageService } from '~/lib/services/messageService';
import { logger } from '~/utils/logger';
import { StorageServiceFactory } from '~/lib/services/storage/storage-service-factory';
import { requireUserId } from '~/auth/session';

export async function action({ request, params }: ActionFunctionArgs) {
  const conversationId = params.conversationId;
  const messageId = params.messageId;

  if (!conversationId || !messageId) {
    return Response.json({ error: 'Conversation ID and Message ID are required' }, { status: 400 });
  }

  const userId = await requireUserId(request);

  if (request.method !== 'DELETE') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    // Verify the conversation belongs to the user
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId, userId },
      select: { id: true },
    });

    if (!conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Verify the message exists and belongs to the conversation
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        conversationId,
      },
      include: {
        snapshot: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!message) {
      return Response.json({ error: 'Message not found' }, { status: 404 });
    }

    logger.info(`Deleting message ${messageId} from conversation ${conversationId}`);

    // Delete the message and its associated snapshot
    await messageService.deleteManyWithSnapshots([messageId]);

    // If the message had a snapshot, also delete it from storage
    if (message.snapshot?.id) {
      const storageService = StorageServiceFactory.get();
      await storageService.delete(`snapshots/${conversationId}/${message.snapshot.id}`);
    }

    logger.info(`Deleted message ${messageId} from conversation ${conversationId}`);

    return Response.json({ success: true });
  } catch (error) {
    logger.error('Error deleting message:', error);
    return Response.json(
      {
        error: 'Failed to delete message',
      },
      { status: 500 },
    );
  }
}
