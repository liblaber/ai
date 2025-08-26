import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if required OAuth environment variables are configured
    const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
    const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
    const hasRedirectUri = !!process.env.GOOGLE_REDIRECT_URI;

    const configured = hasClientId && hasClientSecret && hasRedirectUri;

    return NextResponse.json({
      configured,
      missing: {
        ...(!hasClientId && { GOOGLE_CLIENT_ID: 'Google OAuth Client ID is required' }),
        ...(!hasClientSecret && { GOOGLE_CLIENT_SECRET: 'Google OAuth Client Secret is required' }),
        ...(!hasRedirectUri && { GOOGLE_REDIRECT_URI: 'Google OAuth Redirect URI is required' }),
      },
    });
  } catch (error) {
    console.error('OAuth config check error:', error);
    return NextResponse.json(
      {
        configured: false,
        error: 'Failed to check OAuth configuration',
      },
      { status: 500 },
    );
  }
}
