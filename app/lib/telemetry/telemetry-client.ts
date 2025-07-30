import type { TelemetryEvent } from './telemetry-manager';
import type { UserProfile } from '~/lib/services/userService';
import posthog from 'posthog-js';
import { logger } from '~/utils/logger';

/**
 * Client-side telemetry utility that tracks custom events.
 */
export async function trackTelemetryEvent(event: TelemetryEvent): Promise<void> {
  try {
    const response = await fetch('/api/telemetry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.warn('Telemetry API error:', errorData);
    }
  } catch (error) {
    logger.warn('Failed to send telemetry event:', error);
  }
}

// Singleton flag to prevent multiple initializations
let isTelemetryInitialized = false;

/**
 * Client-side telemetry that tracks app usage metrics.
 */
export function initializeClientTelemetry(user?: UserProfile): void {
  if (isTelemetryInitialized) {
    logger.debug('📊 Telemetry already initialized, skipping...');
    return;
  }

  const telemetryDisabled =
    process.env.NEXT_PUBLIC_DISABLE_TELEMETRY?.toLowerCase() === 'true' ||
    process.env.NEXT_PUBLIC_DISABLE_TELEMETRY === '1';

  if (telemetryDisabled) {
    logger.debug('📊 Telemetry disabled via NEXT_PUBLIC_DISABLE_TELEMETRY environment variable');
    return;
  }

  const posthogConfigured = !!process.env.NEXT_PUBLIC_POSTHOG_KEY && !!process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!posthogConfigured) {
    logger.debug('📊 Telemetry disabled: PostHog not configured');
    return;
  }

  if (user && user.telemetryEnabled === false) {
    logger.debug('📊 Telemetry disabled: User has declined telemetry consent');
    return;
  }

  // Initialize PostHog if all conditions are met
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    defaults: '2025-05-24',
    disable_session_recording: true,
  });

  isTelemetryInitialized = true;
  logger.debug('📊 Telemetry initialized successfully ');
}
