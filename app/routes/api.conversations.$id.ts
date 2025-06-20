import { type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { prisma } from '~/lib/prisma';
import { z } from 'zod';
import { conversationService } from '~/lib/services/conversationService';
import { logger } from '~/utils/logger';

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

const UPDATE_CONVERSATION_SCHEMA = z.object({
  description: z.string().nullable().optional(),
});

export async function action({ request, params }: LoaderFunctionArgs) {
  if (request.method !== 'PATCH') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const conversationId = params.id;

  if (!conversationId) {
    return Response.json({ error: 'Conversation ID is required' }, { status: 400 });
  }

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
