import { env as clientEnv } from '~/env/client';
import { env } from '~/env/server';
import { PostHog } from 'posthog-node';
import { getInstanceId } from '~/lib/instance-id';
import { type UserProfile } from '~/lib/services/userService';
import { logger } from '~/utils/logger';

export enum TelemetryEventType {
  // App start success is tracked in instrumentation.ts on app startup
  APP_START_SUCCESS = 'APP_START_SUCCESS',
  APP_ERROR = 'APP_ERROR',
  SETUP_SUCCESS = 'SETUP_SUCCESS',
  SETUP_ERROR = 'SETUP_ERROR',
  USER_CHAT_RETRY = 'USER_CHAT_RETRY',
  USER_CHAT_REVERT = 'USER_CHAT_REVERT',
  USER_CHAT_FORK = 'USER_CHAT_FORK',
  USER_CHAT_PROMPT = 'USER_CHAT_PROMPT',
  USER_APP_DEPLOY = 'USER_APP_DEPLOY',
  BUILT_APP_ERROR = 'BUILT_APP_ERROR',
}

export interface TelemetryEvent {
  eventType: TelemetryEventType;
  properties?: Record<string, any>;
}

class TelemetryManager {
  private _instanceId: string | null = null;
  private _posthogApiKey: string | null = null;
  private _posthogClient: PostHog | null = null;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  static async create(): Promise<TelemetryManager> {
    const instance = new TelemetryManager();
    instance._posthogApiKey = clientEnv.NEXT_PUBLIC_POSTHOG_KEY || null;
    instance._instanceId = getInstanceId();

    if (!instance._posthogApiKey) {
      console.warn('No NEXT_PUBLIC_POSTHOG_KEY found. Telemetry not initialized.');
      return instance;
    }

    instance._posthogClient = new PostHog(instance._posthogApiKey, {
      host: 'https://us.i.posthog.com',
      flushAt: 1, // Flush every event, no batching
      flushInterval: 0, // Disable periodic flushing
    });

    return instance;
  }

  async trackTelemetryEvent(event: TelemetryEvent, user?: UserProfile): Promise<void> {
    if (!this._isTelemetryEnabled(user) || !this._posthogClient) {
      return;
    }

    type RemovePIIUserProfile = Omit<UserProfile, 'email' | 'name'> | undefined;

    const safeUserProfile: RemovePIIUserProfile = user;

    // Machine id is used to uniquely identify events per user
    const eventProperties = {
      ...event.properties,
      safeUserProfile,
      instanceId: this._instanceId,
      nodeVersion: process.version,
      liblabVersion: env.npm_package_version || '0.0.1',
    };

    try {
      this._posthogClient.capture({
        distinctId: this._getDistinctId(user),
        event: event.eventType,
        properties: eventProperties,
        timestamp: new Date(),
      });

      await this._posthogClient.flushAsync();
    } catch (error) {
      console.warn('Failed to send telemetry event:', event, error);
    }
  }

  shutdown(): void {
    if (!this._posthogClient) {
      return;
    }

    this._posthogClient.shutdown();
  }

  private _getDistinctId(user?: UserProfile): string {
    const distinctId = user?.id || this._instanceId;

    if (!distinctId) {
      logger.error('No distinct id for user:', user);
      throw new Error('No distinct id for telemetry');
    }

    return distinctId;
  }

  private _isTelemetryEnabled(user?: UserProfile): boolean {
    // Check if telemetry is disabled via environment variable
    const telemetryDisabled = clientEnv.NEXT_PUBLIC_DISABLE_TELEMETRY;

    if (telemetryDisabled) {
      logger.debug('📊 Telemetry disabled via NEXT_PUBLIC_DISABLE_TELEMETRY environment variable');
      return false;
    }

    if (!this._posthogApiKey) {
      logger.debug('📊 Telemetry disabled: NEXT_PUBLIC_POSTHOG_KEY not configured');
      return false;
    }

    if (!this._instanceId) {
      logger.debug('📊 Telemetry disabled: Failed to generate instance ID');
      return false;
    }

    // Check user's telemetry consent
    if (user && user.telemetryEnabled === false) {
      logger.debug('📊 Telemetry disabled: User has declined telemetry consent');
      return false;
    }

    return true;
  }
}

// Export a singleton instance
let _telemetryInstance: TelemetryManager | null = null;

export async function getTelemetry(): Promise<TelemetryManager> {
  if (!_telemetryInstance) {
    _telemetryInstance = await TelemetryManager.create();
  }

  return _telemetryInstance;
}
