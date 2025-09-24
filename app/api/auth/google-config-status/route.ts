import { NextResponse } from 'next/server';
import { GoogleAuthService } from '~/lib/services/googleAuthService';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('google-config-status');

export async function GET() {
  try {
    const config = await GoogleAuthService.getGoogleOAuthConfig();
    const source = await GoogleAuthService.getConfigSource();
    const isAvailable = await GoogleAuthService.isGoogleOAuthAvailable();

    const response: any = {
      success: true,
      config: {
        source,
      },
      isAvailable,
      message:
        source === 'environment'
          ? 'Google OAuth configured via environment variables'
          : source === 'onboarding'
            ? 'Google OAuth configured via onboarding'
            : 'Google OAuth not configured',
    };

    // Include credentials if they're available (for frontend to populate form)
    if (isAvailable && config.clientId && config.clientSecret) {
      response.credentials = {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error getting Google OAuth config status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get Google OAuth configuration status',
      },
      { status: 500 },
    );
  }
}
