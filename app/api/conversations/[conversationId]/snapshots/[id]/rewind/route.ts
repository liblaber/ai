import { NextRequest, NextResponse } from 'next/server';
import { StorageServiceFactory } from '~/lib/services/storage/storage-service-factory';
import { snapshotService } from '~/lib/services/snapshotService';
import { prisma } from '~/lib/prisma';
import { logger } from '~/utils/logger';
import { messageService } from '~/lib/services/messageService';
import { requireUserId } from '~/auth/session';
import { getTelemetry, TelemetryEventType } from '~/lib/telemetry/telemetry-manager';
import { userService } from '~/lib/services/userService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string; id: string }> },
) {
  const { conversationId, id } = await params;

  if (!conversationId || !id) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const userId = await requireUserId(request);

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId, userId },
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
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  try {
    const snapshot = await snapshotService.getSnapshotById(id);

    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    if (snapshot.conversationId !== conversationId) {
      return NextResponse.json({ error: 'Snapshot does not belong to this conversation' }, { status: 403 });
    }

    if (!snapshot.messageId) {
      logger.info(`Snapshot ${snapshot.id} does not have a messageId, skipping rewind`);
      return NextResponse.json({ success: true });
    }

    const messageIndex = conversation.messages.findIndex((msg) => msg.id === snapshot.messageId);

    if (messageIndex < 0) {
      logger.info(`Snapshot ${snapshot.id} does not have a newer message, skipping rewind`);
      return NextResponse.json({ success: true });
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

    const telemetry = await getTelemetry();
    const user = await userService.getUser(userId);
    await telemetry.trackTelemetryEvent(
      {
        eventType: TelemetryEventType.USER_CHAT_REVERT,
        properties: { conversationId },
      },
      user,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to fetch snapshot:', error);
    return NextResponse.json({ error: 'Failed to fetch snapshot' }, { status: 500 });
  }
}
