import {type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { prisma } from '~/lib/prisma';

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
            createdAt: 'asc'
          }
        }
      }
    });

    if (!conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return Response.json({
      conversation,
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return Response.json(
      {
        error: 'Failed to fetch conversation',
      },
      { status: 500 }
    );
  }
} 