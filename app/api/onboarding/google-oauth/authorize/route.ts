import { NextRequest, NextResponse } from 'next/server';
import { createScopedLogger } from '~/utils/logger';
import { GoogleAuthService } from '~/lib/services/googleAuthService';

const logger = createScopedLogger('onboarding-google-oauth-authorize');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const callback = searchParams.get('callback');

    if (!callback) {
      return NextResponse.json({ success: false, error: 'Callback URL is required' }, { status: 400 });
    }

    // Get Google OAuth configuration
    const googleConfig = await GoogleAuthService.getGoogleOAuthConfig();

    if (!googleConfig.enabled || !googleConfig.clientId || !googleConfig.clientSecret) {
      return NextResponse.json({ success: false, error: 'Google OAuth is not configured' }, { status: 400 });
    }

    // Create Google OAuth authorization URL using Better Auth's standard callback
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', googleConfig.clientId);
    authUrl.searchParams.set('redirect_uri', `${process.env.BASE_URL}/api/auth/callback/google`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', encodeURIComponent(callback)); // Store callback in state

    logger.info('Redirecting to Google OAuth for onboarding');

    // Redirect to Google OAuth
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    logger.error('Error in Google OAuth authorize:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred during Google OAuth authorization.' },
      { status: 500 },
    );
  }
}
