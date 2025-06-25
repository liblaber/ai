import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { conversationService } from '~/lib/services/conversationService';
import { StorageServiceFactory } from '~/lib/services/storage/storage-service-factory';
import { snapshotService } from '~/lib/services/snapshotService';
import { logger } from '~/utils/logger';

export const loader: LoaderFunction = async ({ params: { conversationId } }) => {
  if (!conversationId) {
    return Response.json({ error: 'Conversation ID is required' }, { status: 400 });
  }

  const conversation = await conversationService.getConversation(conversationId);

  if (!conversation) {
    return Response.json({ error: 'Conversation not found' }, { status: 404 });
  }

  try {
    const snapshot = await snapshotService.getLatestSnapshot(conversationId);

    if (!snapshot) {
      return Response.json({ error: 'No snapshots found' }, { status: 404 });
    }

    const storageService = StorageServiceFactory.get();
    const data = await storageService.get(snapshot.storageKey);
    const fileMap = data ? JSON.parse(data.toString()) : null;

    if (!fileMap) {
      logger.error(`No snapshot files found for snapshot ${snapshot.id}`);
      return Response.json({ error: 'No snapshot files found' }, { status: 404 });
    }

    return Response.json({
      ...snapshot,
      fileMap,
    });
  } catch (error) {
    logger.error('Failed to fetch latest snapshot:', error);
    return Response.json({ error: 'Failed to fetch latest snapshot' }, { status: 500 });
  }
};

export const action: ActionFunction = async ({ request, params: { conversationId } }) => {
  if (request.method !== 'PUT') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const requestData = (await request.json()) as { filePath: string; fileContent: string };
  const { filePath, fileContent } = requestData;

  if (!conversationId || !filePath || !fileContent) {
    logger.error(`Conversation ID or File path or File content is missing`);
    return Response.json({ error: 'Bad request' }, { status: 400 });
  }

  try {
    const snapshot = await snapshotService.getLatestSnapshot(conversationId);

    if (!snapshot) {
      logger.error(`Snapshot not found`);
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const storageService = StorageServiceFactory.get();
    const data = await storageService.get(snapshot.storageKey);
    const fileMap = JSON.parse(data.toString());

    if (!fileMap[filePath]) {
      logger.error(`File ${filePath} not found in snapshot ${snapshot.id}`);
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    fileMap[filePath] = {
      type: 'file',
      content: fileContent,
      isBinary: false,
    };

    const serializedData = Buffer.from(JSON.stringify(fileMap, null, 2));
    await storageService.save(snapshot.storageKey, serializedData);

    return Response.json({
      success: true,
      snapshot: {
        ...snapshot,
        fileMap,
      },
    });
  } catch (error) {
    logger.error('Failed to update snapshot:', error);
    return Response.json({ error: 'Failed to update snapshot' }, { status: 500 });
  }
};
