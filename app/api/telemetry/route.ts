import { NextRequest, NextResponse } from 'next/server';
import { getTelemetry, TelemetryEventType } from '~/lib/telemetry/telemetry-manager';
import { getInstanceId } from '~/lib/instance-id';

export async function POST(req: NextRequest) {
  try {
    const body: any = await req.json();
    const eventType = body.eventType as TelemetryEventType;
    const properties = body.properties as Record<string, any> | undefined;

    if (!eventType) {
      return NextResponse.json({ error: 'Missing eventType' }, { status: 400 });
    }

    const instanceId = getInstanceId();
    const telemetry = await getTelemetry(instanceId);
    await telemetry.trackEvent({ eventType, properties });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
