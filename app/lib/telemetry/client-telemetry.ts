import type { TelemetryEvent } from './telemetry-manager';

/**
 * Client-side telemetry utility that calls the telemetry API route.
 */
export async function trackTelemetryEvent(event: TelemetryEvent): Promise<void> {
  try {
    const response = await fetch('/api/telemetry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.warn('Telemetry API error:', errorData);
    }
  } catch (error) {
    console.warn('Failed to send telemetry event:', error);
  }
}
