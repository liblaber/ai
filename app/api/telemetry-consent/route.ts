import { NextRequest, NextResponse } from 'next/server';
import { userService } from '~/lib/services/userService';
import { requireUserId } from '~/auth/session';
import { logger } from '~/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId(request);

    const body = await request.json();
    const { telemetryEnabled } = body as { telemetryEnabled: boolean };

    await userService.updateTelemetryConsent(userId, telemetryEnabled);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error updating telemetry consent:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
