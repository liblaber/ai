import { NextRequest, NextResponse } from 'next/server';
import { getTelemetry, TelemetryEventType } from '~/lib/telemetry/telemetry-manager';
import type { TelemetryEvent } from '~/lib/telemetry/telemetry-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, properties } = body as TelemetryEvent;

    // Validate the event type
    if (!Object.values(TelemetryEventType).includes(eventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    const telemetry = await getTelemetry();
    await telemetry.trackEvent({
      eventType,
      properties,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Telemetry API error:', error);
    return NextResponse.json({ error: 'Failed to track telemetry event' }, { status: 500 });
  }
}
