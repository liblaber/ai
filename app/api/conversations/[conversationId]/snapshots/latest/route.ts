import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '~/lib/services/conversationService';
import { StorageServiceFactory } from '~/lib/services/storage/storage-service-factory';
import { snapshotService } from '~/lib/services/snapshotService';
import { logger } from '~/utils/logger';
import { requireUserId } from '~/auth/session';

export async function GET(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;

  if (!conversationId) {
    return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
  }

  const userId = await requireUserId(request);

  const conversation = await conversationService.getConversation(conversationId);

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  // Check if the conversation belongs to the authenticated user
  if (conversation.userId !== userId) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  try {
    const snapshot = await snapshotService.getLatestSnapshot(conversationId);

    if (!snapshot) {
      return NextResponse.json({ error: 'No snapshots found' }, { status: 404 });
    }

    const storageService = StorageServiceFactory.get();
    const data = await storageService.get(snapshot.storageKey);
    const fileMap = data ? JSON.parse(data.toString()) : null;

    if (!fileMap) {
      logger.error(`No snapshot files found for snapshot ${snapshot.id}`);
      return NextResponse.json({ error: 'No snapshot files found' }, { status: 404 });
    }

    return NextResponse.json({
      ...snapshot,
      fileMap,
    });
  } catch (error) {
    logger.error('Failed to fetch latest snapshot:', error);
    return NextResponse.json({ error: 'Failed to fetch latest snapshot' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;

  if (!conversationId) {
    return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 });
  }

  const userId = await requireUserId(request);

  const conversation = await conversationService.getConversation(conversationId);

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  // Check if the conversation belongs to the authenticated user
  if (conversation.userId !== userId) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  try {
    const requestData = (await request.json()) as {
      filePath: string;
      fileContent: string;
    };
    const { filePath, fileContent } = requestData;

    if (!filePath || !fileContent) {
      logger.error(`File path or File content is missing`);
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    const snapshot = await snapshotService.getLatestSnapshot(conversationId);

    if (!snapshot) {
      logger.error(`Snapshot not found`);
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const storageService = StorageServiceFactory.get();
    const data = await storageService.get(snapshot.storageKey);
    const fileMap = JSON.parse(data.toString());

    if (!fileMap[filePath]) {
      logger.error(`File ${filePath} not found in snapshot ${snapshot.id}`);
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    fileMap[filePath] = {
      type: 'file',
      content: fileContent,
      isBinary: false,
    };

    const serializedData = Buffer.from(JSON.stringify(fileMap, null, 2));
    await storageService.save(snapshot.storageKey, serializedData);

    return NextResponse.json({
      success: true,
      snapshot: {
        ...snapshot,
        fileMap,
      },
    });
  } catch (error) {
    logger.error('Failed to update snapshot:', error);
    return NextResponse.json({ error: 'Failed to update snapshot' }, { status: 500 });
  }
}
