import { NextRequest, NextResponse } from 'next/server';
import { userService } from '~/lib/services/userService';
import { requireUserId } from '~/auth/session';
import { logger } from '~/utils/logger';
import { getTelemetry, TelemetryEventType } from '~/lib/telemetry/telemetry-manager';

export async function POST(request: NextRequest) {
  try {
    // TODO: @skos just troubleshooting
    const buba = await userService.getUserByEmail('anonymous@anonymous.com');
    logger.info(`Anonymous user telemetry: ${buba.email}`, buba);

    const userId = await requireUserId(request);

    const body = await request.json();
    const { telemetryEnabled } = body as { telemetryEnabled: boolean };

    const user = await userService.updateTelemetryConsent(userId, telemetryEnabled);

    const telemetry = await getTelemetry();
    await telemetry.trackTelemetryEvent(
      {
        eventType: TelemetryEventType.USER_TELEMETRY_CONSENT,
        properties: { telemetryEnabled },
      },
      user,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error updating telemetry consent:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
