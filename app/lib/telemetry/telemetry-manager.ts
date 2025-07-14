import { hostname, platform } from 'os';
import { PostHog } from 'posthog-node';

const { machineIdSync } = await import('node-machine-id');

export enum TelemetryEventType {
  SETUP_SUCCESS = 'setup_success',
  SETUP_ERROR = 'setup_error',
  START_SUCCESS = 'start_success',
  APP_ERROR = 'app_error',
}

export interface TelemetryEvent {
  event: TelemetryEventType;
  properties?: Record<string, any>;
  timestamp?: number;
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
    instance._machineId = machineIdSync();

    if (instance._isTelemetryEnabled()) {
      // Initialize PostHog client
      instance._posthogClient = new PostHog(instance._posthogApiKey!, {
        host: 'https://us.i.posthog.com',
        flushAt: 1, // Flush immediately for server-side tracking
        flushInterval: 0, // Disable automatic flushing
      });
      console.log('📊 Telemetry enabled');
    } else {
      console.log('📊 Telemetry disabled');
    }

    return instance;
  }

  async trackEvent(event: TelemetryEventType, properties: Record<string, any> = {}): Promise<void> {
    if (!this._isTelemetryEnabled() || !this._posthogClient) {
      return;
    }

    const eventProperties = {
      ...properties,
      machine_id: this._machineId,
      platform: platform(),
      hostname: hostname(),
      node_version: process.version,
      liblab_version: process.env.npm_package_version || '0.0.1',
    };

    try {
      this._posthogClient.capture({
        distinctId: this._machineId!,
        event,
        properties: eventProperties,
      });
    } catch (error) {
      console.warn('Failed to send telemetry event:', error);
    }
  }

  async shutdown(): Promise<void> {
    if (this._posthogClient) {
      await this._posthogClient.shutdown();
    }
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

export function getTelemetrySync(): TelemetryManager | null {
  return _telemetryInstance;
}
