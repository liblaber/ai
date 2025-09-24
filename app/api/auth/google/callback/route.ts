import { NextRequest, NextResponse } from 'next/server';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('google-oauth-callback');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      logger.error('Google OAuth error:', error);

      const errorDescription = searchParams.get('error_description') || 'Unknown error';

      // Redirect back to onboarding with error
      const redirectUrl = new URL('/onboarding', request.url);
      redirectUrl.searchParams.set('error', `Google OAuth error: ${errorDescription}`);

      return NextResponse.redirect(redirectUrl.toString());
    }

    // Validate required parameters
    if (!code) {
      logger.error('No authorization code received from Google');

      const redirectUrl = new URL('/onboarding', request.url);
      redirectUrl.searchParams.set('error', 'No authorization code received from Google');

      return NextResponse.redirect(redirectUrl.toString());
    }

    // For now, we'll just redirect back to onboarding with success
    // In a full implementation, you would:
    // 1. Exchange the code for tokens
    // 2. Get user info from Google
    // 3. Create the admin user
    // 4. Set up the session

    logger.info('Google OAuth callback successful, redirecting to onboarding');

    const redirectUrl = new URL('/onboarding', request.url);
    redirectUrl.searchParams.set('google_oauth_success', 'true');
    redirectUrl.searchParams.set('code', code);

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    logger.error('Error in Google OAuth callback:', error);

    const redirectUrl = new URL('/onboarding', request.url);
    redirectUrl.searchParams.set('error', 'OAuth callback failed');

    return NextResponse.redirect(redirectUrl.toString());
  }
}
