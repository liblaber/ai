'use client';
import {
  type BasePreviewMessage,
  type ConsoleErrorMessage,
  type PreviewMessage,
  WebContainer,
} from '@webcontainer/api';
import { WORK_DIR_NAME } from '~/utils/constants';
import { cleanStackTrace } from '~/utils/stacktrace';
import { streamingState } from '~/lib/stores/streaming';
import { errorHandler } from '~/lib/error-handler';
import { logger } from '~/utils/logger';
import { WebContainerAdapter, type Container } from '~/lib/containers';

interface WebContainerContext {
  loaded: boolean;
}

export const webcontainerContext: WebContainerContext = {
  loaded: false,
};

let lastRefreshTimestamp = 0;
const REFRESH_COOLDOWN_MS = 30000; // 30 seconds

class WebContainerManager {
  private static _instance: WebContainer | null = null;
  private static _containerInstance: Container | null = null;
  private static _isCreating = false;
  private static _initializationPromise: Promise<WebContainer> | null = null;

  static async getInstance(): Promise<WebContainer> {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      logger.warn('Cannot instantiate WebContainer outside the browser environment');
      throw new Error('WebContainer can only be instantiated in a browser environment');
    }

    // If _instance already exists, return it
    if (WebContainerManager._instance) {
      return WebContainerManager._instance;
    }

    // If we're currently creating an _instance, wait for it
    if (WebContainerManager._isCreating && WebContainerManager._initializationPromise) {
      return WebContainerManager._initializationPromise;
    }

    // Set semaphore to prevent double instantiation
    WebContainerManager._isCreating = true;

    // Create the initialization promise
    WebContainerManager._initializationPromise = WebContainerManager._createInstance();

    try {
      WebContainerManager._instance = await WebContainerManager._initializationPromise;
      return WebContainerManager._instance;
    } finally {
      WebContainerManager._isCreating = false;
      WebContainerManager._initializationPromise = null;
    }
  }

  /**
   * Get the Container instance (primary interface)
   */
  static async getContainerInstance(): Promise<Container> {
    if (WebContainerManager._containerInstance) {
      return WebContainerManager._containerInstance;
    }

    // Get the raw WebContainer instance first
    const webContainer = await WebContainerManager.getInstance();

    // Create and cache the adapter
    WebContainerManager._containerInstance = WebContainerAdapter.fromWebContainer(webContainer);

    return WebContainerManager._containerInstance;
  }

  static reset(): void {
    WebContainerManager._instance = null;
    WebContainerManager._containerInstance = null;
    WebContainerManager._isCreating = false;
    WebContainerManager._initializationPromise = null;
  }

  private static async _createInstance(): Promise<WebContainer> {
    const webcontainer = await WebContainer.boot({
      coep: 'credentialless',
      workdirName: WORK_DIR_NAME,
      forwardPreviewErrors: true, // Enable error forwarding from iframes
    });

    webcontainerContext.loaded = true;
    logger.info('WebContainer initialized');

    const { workbenchStore } = await import('~/lib/stores/workbench');
    logger.info('imported workbenchStore');

    // Subscribe to streaming state changes
    let wasStreaming = false;
    streamingState.subscribe((isStreaming) => {
      if (wasStreaming && !isStreaming) {
        // Streaming just finished, refresh the preview and switch to code view
        const previewComponent = document.querySelector('iframe[title="preview"]') as HTMLIFrameElement;

        if (previewComponent) {
          workbenchStore.previewsStore.startLoading();
          workbenchStore.currentView.set('preview');

          setTimeout(() => {
            previewComponent.src = previewComponent.src;
          }, 1000);
        }
      } else if (!wasStreaming && isStreaming) {
        workbenchStore.openTerminal();
      }

      wasStreaming = isStreaming;
    });

    // Listen for preview errors
    webcontainer.on('preview-message', async (message) => {
      if (streamingState.get()) {
        return;
      }

      if (isInitialHydrationError(message)) {
        const now = Date.now();

        if (now - lastRefreshTimestamp < REFRESH_COOLDOWN_MS) {
          return;
        }

        lastRefreshTimestamp = now;

        // Find the preview component and trigger reload
        const previewComponent = document.querySelector('iframe[title="preview"]') as HTMLIFrameElement;

        if (previewComponent) {
          previewComponent.src = previewComponent.src;
          workbenchStore.previewsStore.almostReadyLoading();
        }

        return;
      }

      // Preview reload handles these messages that occur only on the first load
      if (isUncaughtHydrationError(message)) {
        return;
      }

      // Handle both uncaught exceptions and unhandled promise rejections
      if (message.type === 'PREVIEW_UNCAUGHT_EXCEPTION' || message.type === 'PREVIEW_UNHANDLED_REJECTION') {
        const isPromise = message.type === 'PREVIEW_UNHANDLED_REJECTION';
        await errorHandler.handle({
          type: 'preview',
          title: isPromise ? 'Unhandled Promise Rejection' : 'Uncaught Exception',
          description: message.message,
          content: `Error occurred at ${message.pathname}${message.search}${message.hash}\nPort: ${message.port}\n\nStack trace:\n${cleanStackTrace(message.stack || '')}`,
          source: 'preview',
        });
      }

      if (message.type === 'PREVIEW_CONSOLE_ERROR' && isQueryError(message)) {
        const error = message.args?.join(' ');
        await errorHandler.handle({
          type: 'preview',
          title: 'Query Error',
          description: error,
          content: `The error occurred due to a wrong query: ${error}\n\nStack trace:\n${cleanStackTrace(message.stack || '')}`,
          source: 'preview',
        });
      }

      if (message.type === 'PREVIEW_CONSOLE_ERROR' && isErrorBoundaryError(message)) {
        const { description, content } = getDescriptionAndContent(message);

        await errorHandler.handle({
          type: 'preview',
          title: 'Application Error',
          description,
          content,
          source: 'preview',
        });
      }

      if (message.type === 'PREVIEW_CONSOLE_ERROR' && isNextJsError(message)) {
        const { description, content } = getDescriptionAndContent(message);

        await errorHandler.handle({
          type: 'preview',
          title: 'Error',
          description,
          content,
          source: 'preview',
        });
      }
    });

    return webcontainer;
  }
}

// Export the Container instance (primary interface)
export const webcontainer: () => Promise<Container> = WebContainerManager.getContainerInstance;

// Export raw WebContainer for internal APIs not available in Container interface
export const rawWebContainer: () => Promise<WebContainer> = WebContainerManager.getInstance;

function isInitialHydrationError(message: PreviewMessage) {
  if (message.type !== 'PREVIEW_CONSOLE_ERROR') {
    return false;
  }

  try {
    const hydrationMessage = message.args?.[0]?.toLowerCase();
    return hydrationMessage?.includes('hydration');
  } catch {
    return false;
  }
}

function isUncaughtHydrationError(message: PreviewMessage) {
  if (message.type !== 'PREVIEW_UNCAUGHT_EXCEPTION' || !message.message) {
    return false;
  }

  return (
    message.message.includes('There was an error while hydrating') ||
    message.message.includes("Cannot read properties of null (reading 'useState')") ||
    message.message.includes('Hydration failed because the initial UI does not match what was rendered on the server')
  );
}

function isQueryError(message: ConsoleErrorMessage) {
  return message.args
    ?.filter((arg): arg is string => typeof arg === 'string')
    .some((arg) => arg.includes('Failed to execute query'));
}

function isErrorBoundaryError({ stack }: ConsoleErrorMessage) {
  return stack?.includes('at ErrorBoundary');
}

function isNextJsError(message: ConsoleErrorMessage & BasePreviewMessage) {
  return message.stack.includes('node_modules/next') || message.stack.includes('nextjs');
}

function getDescriptionAndContent(message: ConsoleErrorMessage & BasePreviewMessage): {
  description: string;
  content: string;
} {
  const errorArg = message.args?.find(
    (arg): arg is { name: string; message: string; stack: string } =>
      typeof arg === 'object' && arg !== null && !!arg.name && !!arg.message && !!arg.stack,
  );

  if (!errorArg) {
    const errorMessage =
      message.args
        ?.map((arg) => {
          if (typeof arg === 'string') {
            return arg;
          }

          return JSON.stringify(arg);
        })
        ?.join(', ') || 'Unknown error';
    const errorStack = message.stack || 'No stack trace available';

    return { description: errorMessage, content: `${errorMessage}: \nStack trace: ${errorStack}` };
  }

  return { description: `${errorArg.name}: ${errorArg.message}`, content: errorArg.stack };
}

// Export the manager class for advanced usage
export { WebContainerManager };

// Export Container type for type annotations
export type { Container } from '~/lib/containers';
