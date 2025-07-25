import { PostHog } from 'posthog-node';
import { getInstanceId } from '~/lib/instance-id';

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
  USER_DEPLOY = 'USER_DEPLOY',
  BUILT_APP_ERROR = 'BUILT_APP_ERROR',
}

export interface TelemetryEvent {
  eventType: TelemetryEventType;
  properties?: Record<string, any>;
}

class TelemetryManager {
  private _machineId: string | null = null;
  private _posthogApiKey: string | null = null;
  private _posthogClient: PostHog | null = null;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  static async create(): Promise<TelemetryManager> {
    const instance = new TelemetryManager();
    instance._posthogApiKey = process.env.POSTHOG_API_KEY || null;
    instance._machineId = getInstanceId();

    if (!instance._posthogApiKey) {
      console.warn('No POSTHOG_API_KEY found. Telemetry not initialized.');
      return instance;
    }

    instance._posthogClient = new PostHog(instance._posthogApiKey, {
      host: 'https://us.i.posthog.com',
      flushAt: 1, // Flush every event, no batching
      flushInterval: 0, // Disable periodic flushing
    });

    return instance;
  }

  async trackEvent(event: TelemetryEvent): Promise<void> {
    if (!this._isTelemetryEnabled() || !this._posthogClient) {
      return;
    }

    const eventProperties = {
      ...event.properties,
      machine_id: this._machineId,
      node_version: process.version,
      liblab_version: process.env.npm_package_version || '0.0.1',
    };

    try {
      console.log('TelemetryManager trackEvent', event);
      this._posthogClient.capture({
        distinctId: this._machineId!,
        event: event.eventType,
        properties: eventProperties,
        timestamp: new Date(),
      });

      await this._posthogClient.flushAsync();
    } catch (error) {
      console.warn('Failed to send telemetry event:', error);
    }
  }

  shutdown(): void {
    if (!this._posthogClient) {
      return;
    }

    this._posthogClient.shutdown();
  }

  private _isTelemetryEnabled(): boolean {
    // Check if telemetry is disabled via environment variable
    const telemetryDisabled = process.env.DISABLE_TELEMETRY === 'true' || process.env.DISABLE_TELEMETRY === '1';

    if (telemetryDisabled) {
      console.log('📊 Telemetry disabled via DISABLE_TELEMETRY environment variable');
      return false;
    }

    // Check if PostHog API key is configured
    if (!this._posthogApiKey) {
      console.log('📊 Telemetry disabled: POSTHOG_API_KEY not configured');
      return false;
    }

    // Check if machine ID was generated successfully
    if (!this._machineId) {
      console.log('📊 Telemetry disabled: Failed to generate machine ID');
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
