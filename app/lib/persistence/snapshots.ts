import { toast } from 'sonner';
import { workbenchStore } from '~/lib/stores/workbench';
import type { FileMap } from '~/lib/stores/files';

export interface SnapshotResponse {
  id: string;
  fileMap: FileMap;
}

interface ErrorResponse {
  error: string;
}

export const saveSnapshot = async (chatId: string, messageId?: string): Promise<void> => {
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
  } catch (error) {
    console.error('Error saving snapshot', error);
    toast.error('Failed to save snapshot');
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
