import { NextResponse } from 'next/server';
import { createScopedLogger } from '~/utils/logger';
import { env } from '~/env/server';

const logger = createScopedLogger('google-workspace-config');

export async function GET() {
  try {
    // Check if required OAuth environment variables are configured
    // Note: GOOGLE_REDIRECT_URI is dynamically constructed, not required as env var
    const hasClientId = !!env.GOOGLE_CLIENT_ID;
    const hasClientSecret = !!env.GOOGLE_CLIENT_SECRET;
    const hasEncryptionKey = !!env.GOOGLE_AUTH_ENCRYPTION_KEY;

    const configured = hasClientId && hasClientSecret && hasEncryptionKey;

    return NextResponse.json({
      success: true,
      configured,
      missing: {
        ...(!hasClientId && { GOOGLE_CLIENT_ID: 'Google OAuth Client ID is required' }),
        ...(!hasClientSecret && { GOOGLE_CLIENT_SECRET: 'Google OAuth Client Secret is required' }),
        ...(!hasEncryptionKey && { GOOGLE_AUTH_ENCRYPTION_KEY: 'Google Auth Encryption Key is required' }),
      },
    });
  } catch (error) {
    logger.error('OAuth config check error:', error);
    return NextResponse.json(
      {
        success: false,
        configured: false,
        error: 'Failed to check OAuth configuration',
      },
      { status: 500 },
    );
  }
}
