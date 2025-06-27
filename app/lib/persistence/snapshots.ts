import { toast } from 'sonner';
import { workbenchStore } from '~/lib/stores/workbench';
import type { FileMap } from '~/lib/stores/files';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('Snapshots');

export interface SnapshotResponse {
  id: string;
  fileMap: FileMap;
}

interface ErrorResponse {
  error: string;
}

export const saveSnapshot = async (chatId: string, messageId?: string): Promise<{ id: string }> => {
  const fileMap = workbenchStore.getFileMap();

  try {
    const response = await fetch(`/api/conversations/${chatId}/snapshots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileMap,
        messageId,
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as ErrorResponse;
      throw new Error(error.error || 'Failed to save snapshot');
    }

    const result = (await response.json()) as { id: string };

    return result;
  } catch (error) {
    console.error('Error saving snapshot', error);
    toast.error('Failed to save snapshot');
    throw error;
  }
};

export const getLatestSnapshot = async (conversationId: string): Promise<SnapshotResponse> => {
  try {
    const response = await fetch(`/api/conversations/${conversationId}/snapshots/latest`);

    if (!response.ok) {
      const error: any = await response.json();
      throw new Error(error.error || 'Failed to fetch latest snapshot');
    }

    return (await response.json()) as SnapshotResponse;
  } catch (error: any) {
    console.error('Error fetching latest snapshot', error);
    toast.error('Failed to fetch latest snapshot');
    throw error;
  }
};

export const rewindToSnapshot = async (conversationId: string, snapshotId: string): Promise<void> => {
  const response = await fetch(`/api/conversations/${conversationId}/snapshot/${snapshotId}/rewind`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to rewind to snapshot');
  }
};

/**
 * Updates the latest snapshot for a conversation.
 *
 * Currently, we only support updating the latest snapshot.
 * Should be discussed if we need to support updating history snapshots.
 */
export const updateLatestSnapshot = async (
  conversationId: string,
  filePath: string,
  fileContent: string,
): Promise<void> => {
  try {
    const response = await fetch(`/api/conversations/${conversationId}/snapshots/latest`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filePath,
        fileContent,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update snapshot: ${response.statusText}`);
    }

    logger.info(`Updated file ${filePath} in snapshot for conversation ${conversationId}`);
  } catch (error) {
    logger.error('Failed to update file in snapshot:', error);
  }
};
