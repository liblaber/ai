import { type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { prisma } from '~/lib/prisma';
import { z } from 'zod';
import { conversationService } from '~/lib/services/conversationService';
import { logger } from '~/utils/logger';
import { StorageServiceFactory } from '~/lib/services/storage/storage-service-factory';
import { requireUserId } from '~/auth/session';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const conversationId = params.id;

  if (!conversationId) {
    return Response.json({ error: 'Conversation ID is required' }, { status: 400 });
  }

  const userId = await requireUserId(request);

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId, userId },
      include: {
        messages: {
          include: {
            Snapshot: {
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

    return Response.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return Response.json(
      {
        error: 'Failed to fetch conversation',
      },
      { status: 500 },
    );
  }
}

export async function action({ request, params }: LoaderFunctionArgs) {
  const conversationId = params.id;

  if (!conversationId) {
    return Response.json({ error: 'Conversation ID is required' }, { status: 400 });
  }

  const userId = await requireUserId(request);

  switch (request.method) {
    case 'DELETE':
      return handleDelete(conversationId, userId);
    case 'PATCH':
      return handlePatch(conversationId, userId, request);
    default:
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
}

async function handleDelete(conversationId: string, userId: string) {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId, userId },
      select: { id: true },
    });

    if (!conversation) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const storageService = StorageServiceFactory.get();

    logger.info(`Deleting conversation ${conversationId}`);

    await conversationService.deleteConversation(conversationId, userId);
    await storageService.deleteAll(`snapshots/${conversationId}`);

    logger.info(`Deleted conversation ${conversationId}`);

    return Response.json({ success: true });
  } catch (error) {
    logger.error('Error deleting conversation:', error);
    return Response.json(
      {
        error: 'Failed to delete conversation',
      },
      { status: 500 },
    );
  }
}

const UPDATE_CONVERSATION_SCHEMA = z.object({
  description: z.string().nullable().optional(),
});

async function handlePatch(conversationId: string, userId: string, request: Request) {
  try {
    const body = await request.json();
    const updateData = UPDATE_CONVERSATION_SCHEMA.parse(body);

    const updatedConversation = await conversationService.updateConversationDescription(
      conversationId,
      userId,
      updateData,
    );

    if (!updatedConversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return Response.json(updatedConversation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors }, { status: 400 });
    }

    logger.error('Error updating conversation:', error);

    return Response.json(
      {
        error: 'Failed to update conversation',
      },
      { status: 500 },
    );
  }
}
