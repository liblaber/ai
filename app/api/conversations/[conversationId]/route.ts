import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '~/lib/prisma';
import { z } from 'zod';
import { conversationService } from '~/lib/services/conversationService';
import { logger } from '~/utils/logger';
import { StorageServiceFactory } from '~/lib/services/storage/storage-service-factory';
import { requireUserId } from '~/auth/session';

export async function GET(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;

  if (!conversationId) {
    return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
  }

  const userId = await requireUserId(request);

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId, userId },
      include: {
        messages: {
          include: {
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
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch conversation',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;

  if (!conversationId) {
    return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
  }

  const userId = await requireUserId(request);

  return handleDelete(conversationId, userId);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;

  if (!conversationId) {
    return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
  }

  const userId = await requireUserId(request);

  return handlePatch(conversationId, userId, request);
}

async function handleDelete(conversationId: string, userId: string) {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId, userId },
      select: { id: true },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const storageService = StorageServiceFactory.get();

    logger.info(`Deleting conversation ${conversationId}`);

    await conversationService.deleteConversation(conversationId, userId);
    await storageService.deleteAll(`snapshots/${conversationId}`);

    logger.info(`Deleted conversation ${conversationId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting conversation:', error);
    return NextResponse.json(
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

async function handlePatch(conversationId: string, userId: string, request: NextRequest) {
  try {
    const body = await request.json();
    const updateData = UPDATE_CONVERSATION_SCHEMA.parse(body);

    const updatedConversation = await conversationService.updateConversationDescription(
      conversationId,
      userId,
      updateData,
    );

    if (!updatedConversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json(updatedConversation);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    logger.error('Error updating conversation:', error);

    return NextResponse.json(
      {
        error: 'Failed to update conversation',
      },
      { status: 500 },
    );
  }
}
