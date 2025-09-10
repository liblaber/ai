import { NextRequest, NextResponse } from 'next/server';
import { env } from '~/env';

export async function GET(request: NextRequest) {
  try {
    const { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI } = env.server;

    if (!GOOGLE_CLIENT_ID) {
      return NextResponse.json({ success: false, error: 'Google OAuth not configured' }, { status: 500 });
    }

    // Google OAuth scopes needed for Google Sheets and Drive API access
    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ].join(' ');

    // Use the configured redirect URI
    const redirectUri = GOOGLE_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/google-workspace/callback`;

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    // Add state parameter to prevent CSRF attacks
    const state = crypto.randomUUID();
    authUrl.searchParams.set('state', state);

    // Store state in session or cookie for validation in callback
    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: env.server.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error) {
    console.error('Error in Google OAuth authorize:', error);
    return NextResponse.json({ success: false, error: 'OAuth authorization failed' }, { status: 500 });
  }
}
