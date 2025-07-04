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

interface WebContainerContext {
  loaded: boolean;
}

export const webcontainerContext: WebContainerContext = import.meta.hot?.data.webcontainerContext ?? {
  loaded: false,
};

if (import.meta.hot) {
  import.meta.hot.data.webcontainerContext = webcontainerContext;
}

export let webcontainer: Promise<WebContainer> = new Promise(() => {
  // noop for ssr
});

let lastRefreshTimestamp = 0;
const REFRESH_COOLDOWN_MS = 30000; // 30 seconds

if (!import.meta.env.SSR) {
  webcontainer =
    import.meta.hot?.data.webcontainer ??
    Promise.resolve()
      .then(() => {
        return WebContainer.boot({
          coep: 'credentialless',
          workdirName: WORK_DIR_NAME,
          forwardPreviewErrors: true, // Enable error forwarding from iframes
        });
      })
      .then(async (webcontainer) => {
        webcontainerContext.loaded = true;

        const { workbenchStore } = await import('~/lib/stores/workbench');

        // Subscribe to streaming state changes
        let wasStreaming = false;
        streamingState.subscribe((isStreaming) => {
          if (wasStreaming && !isStreaming) {
            // Streaming just finished, refresh the preview and switch to code view
            const previewComponent = document.querySelector('iframe[title="preview"]') as HTMLIFrameElement;

            if (previewComponent) {
              workbenchStore.previewsStore.changesLoading();
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
          if (streamingState.get() && !workbenchStore.previewsStore.readyForFixing.get()) {
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
            console.log({ description, content, message });

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
            console.log({ description, content, message });

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
      });

  if (import.meta.hot) {
    import.meta.hot.data.webcontainer = webcontainer;
  }
}

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
    const errorMessage = message.args?.find((arg) => typeof arg === 'string') || 'Unknown error';
    const errorStack = message.stack || 'No stack trace available';

    return { description: errorMessage, content: `${errorMessage}: ${errorStack}` };
  }

  return { description: `${errorArg.name}: ${errorArg.message}`, content: errorArg.stack };
}
