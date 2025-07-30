import type { ProgressAnnotation } from '~/types/context';
import { useEffect } from 'react';
import { workbenchStore } from '~/lib/stores/workbench';

export const useTrackStreamProgress = (data: ProgressAnnotation[], isStreaming: boolean): void => {
  useEffect(() => {
    if (!data?.length || !isStreaming) {
      return;
    }

    if (!workbenchStore.previewsStore.isLoading.get()) {
      workbenchStore.previewsStore.isLoading.set(true);
    }

    const currentStepInProgress = data.findLast((step) => step.status === 'in-progress');

    if (currentStepInProgress && currentStepInProgress.message !== workbenchStore.previewsStore.loadingText.get()) {
      workbenchStore.previewsStore.loadingText.set(currentStepInProgress.message);
    }
  }, [data]);
};
