import { NextRequest, NextResponse } from 'next/server';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('google-user-info-api');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, clientId, clientSecret } = body as { code?: string; clientId?: string; clientSecret?: string };

    // Validate required fields
    if (!code || !clientId || !clientSecret) {
      return NextResponse.json(
        { success: false, error: 'Authorization code, Client ID, and Client Secret are required' },
        { status: 400 },
      );
    }

    logger.info('Exchanging Google OAuth code for user info');

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${request.nextUrl.origin}/api/auth/google/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      logger.error('Failed to exchange code for token:', errorData);

      return NextResponse.json(
        {
          success: false,
          error: `Failed to exchange authorization code: ${(errorData as any).error_description || (errorData as any).error}`,
        },
        { status: 400 },
      );
    }

    const tokenData = (await tokenResponse.json()) as { access_token?: string };
    const { access_token: accessToken } = tokenData;

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      logger.error('Failed to get user info from Google');
      return NextResponse.json(
        { success: false, error: 'Failed to get user information from Google' },
        { status: 400 },
      );
    }

    const userInfo = (await userInfoResponse.json()) as {
      name?: string;
      email?: string;
      picture?: string;
      id?: string;
    };

    logger.info('Successfully retrieved Google user info:', { email: userInfo.email, name: userInfo.name });

    return NextResponse.json({
      success: true,
      user: {
        name: userInfo.name || '',
        email: userInfo.email || '',
        picture: userInfo.picture || '',
        id: userInfo.id || '',
      },
    });
  } catch (error) {
    logger.error('Error getting Google user info:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Failed to get user information: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 },
    );
  }
}
