import { NextRequest, NextResponse } from 'next/server';
import { getTelemetry, TelemetryEventType } from '~/lib/telemetry/telemetry-manager';
import type { TelemetryEvent } from '~/lib/telemetry/telemetry-manager';
import type { UserProfile } from '~/lib/services/userService';
import { userService } from '~/lib/services/userService';
import { logger } from '~/utils/logger';
import { requireUserId } from '~/auth/session';

export async function POST(request: NextRequest) {
  try {
    let user: UserProfile | undefined = undefined;
    let userId: string | undefined = undefined;

    // Try to get the user but don't fail, some events like app setup and startup don't require a user to be tracked
    try {
      userId = await requireUserId(request);
      user = await userService.getUser(userId);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error: any) {
      // noop - no user, continue without user context
    }

    const body = await request.json();
    const { event } = body as { event: TelemetryEvent };

    if (!Object.values(TelemetryEventType).includes(event.eventType)) {
      logger.error(`Invalid event ${event.eventType}`, event.properties);

      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    const telemetry = await getTelemetry();
    await telemetry.trackTelemetryEvent(event, user);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Telemetry API error:', error);
    return NextResponse.json({ error: 'Failed to track telemetry event' }, { status: 500 });
  }
}
