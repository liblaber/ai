import { NextRequest, NextResponse } from 'next/server';
import { getTelemetry, TelemetryEventType } from '~/lib/telemetry/telemetry-manager';

export async function POST(req: NextRequest) {
  try {
    const body: any = await req.json();
    const eventType = body.eventType as TelemetryEventType;
    const properties = body.properties as Record<string, any> | undefined;

    if (!eventType) {
      return NextResponse.json({ error: 'Missing eventType' }, { status: 400 });
    }

    const telemetry = await getTelemetry();
    await telemetry.trackEvent({ eventType, properties });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
