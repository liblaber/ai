import { type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { prisma } from '~/lib/prisma';
import { z } from 'zod';
import { conversationService } from '~/lib/services/conversationService';
import { logger } from '~/utils/logger';
import { StorageServiceFactory } from '~/lib/services/storage/storage-service-factory';
import { snapshotService } from '~/lib/services/snapshotService';

export async function loader({ params }: LoaderFunctionArgs) {
  const conversationId = params.id;

  if (!conversationId) {
    return Response.json({ error: 'Conversation ID is required' }, { status: 400 });
  }

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
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

  switch (request.method) {
    case 'DELETE':
      return handleDelete(conversationId);
    case 'PATCH':
      return handlePatch(conversationId, request);
    default:
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
}

async function handleDelete(conversationId: string) {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const snapshots = await snapshotService.getAllByConversationId(conversationId);

    const storageService = StorageServiceFactory.get();
    await Promise.all(snapshots.map((snapshot) => storageService.delete(snapshot.storageKey)));

    await prisma.conversation.delete({
      where: { id: conversationId },
    });

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

async function handlePatch(conversationId: string, request: Request) {
  try {
    const body = await request.json();
    const updateData = UPDATE_CONVERSATION_SCHEMA.parse(body);

    const updatedConversation = await conversationService.updateConversationDescription(conversationId, updateData);

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
