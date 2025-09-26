import { NextRequest, NextResponse } from 'next/server';
import { StorageServiceFactory } from '~/lib/services/storage/storage-service-factory';
import { snapshotService } from '~/lib/services/snapshotService';
import { logger } from '~/utils/logger';
import { requireUserAbility } from '~/auth/session';
import { PermissionAction } from '@prisma/client';
import { subject } from '@casl/ability';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string; id: string }> },
) {
  const { conversationId, id } = await params;

  if (!conversationId || !id) {
    return NextResponse.json({ error: 'Conversation ID and Snapshot ID are required' }, { status: 400 });
  }

  const { userAbility } = await requireUserAbility(request);

  if (userAbility.cannot(PermissionAction.read, subject('Conversation', { id: conversationId }))) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const snapshot = await snapshotService.getSnapshotById(id);

    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    if (snapshot.conversationId !== conversationId) {
      return NextResponse.json({ error: 'Snapshot does not belong to this conversation' }, { status: 403 });
    }

    const storageService = StorageServiceFactory.get();
    const data = await storageService.get(snapshot.storageKey);
    const fileMap = JSON.parse(data.toString());

    if (!fileMap) {
      logger.error(`No snapshot files found for snapshot ${snapshot.id}`);
      return NextResponse.json({ error: 'No snapshot files found' }, { status: 404 });
    }

    return NextResponse.json({
      snapshot: {
        ...snapshot,
        fileMap,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch snapshot:', error);
    return NextResponse.json({ error: 'Failed to fetch snapshot' }, { status: 500 });
  }
}
