import { logger } from '~/utils/logger';
import { env } from '~/env/server';

/**
 * Sends a telemetry event indicating the app started successfully.
 *
 * Next.js calls this after the app initialization.
 *
 * Read more about instrumentation here: https://nextjs.org/docs/app/guides/instrumentation
 */
export function register() {
  setTimeout(async () => {
    try {
      await fetch(`${env.BASE_URL}/api/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: { eventType: 'APP_START_SUCCESS' } }),
      });
    } catch (error) {
      logger.warn('Failed to track app start success:', error);
    }
  }, 1000);
}
