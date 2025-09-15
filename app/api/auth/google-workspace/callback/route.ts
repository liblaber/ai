import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '~/env/server';
import { createScopedLogger } from '~/utils/logger';
import { generateOAuthCallbackHTML } from '~/lib/oauth-templates';

const logger = createScopedLogger('google-workspace-callback');

// Zod schemas for OAuth responses
const googleTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
  token_type: z.string().optional(),
  scope: z.string().optional(),
});

const googleUserInfoSchema = z.object({
  email: z.string(),
  name: z.string(),
  picture: z.string().optional(),
  id: z.string().optional(),
  verified_email: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  // Validate required environment variables
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    logger.error('Google OAuth is not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.');
    return new NextResponse(
      generateOAuthCallbackHTML({
        type: 'error',
        error: 'Google OAuth authentication is not configured',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    logger.error('OAuth error:', error);
    return new NextResponse(
      generateOAuthCallbackHTML({
        type: 'error',
        error: 'Authentication was cancelled or failed',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      },
    );
  }

  if (!code || !state) {
    return new NextResponse(
      generateOAuthCallbackHTML({
        type: 'error',
        error: 'Missing authorization code or state',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      },
    );
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${request.nextUrl.origin}/api/auth/google-workspace/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error('Token exchange failed:', errorText);

      return new NextResponse(
        generateOAuthCallbackHTML({
          type: 'error',
          error: 'Failed to exchange authorization code',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'text/html' },
        },
      );
    }

    const tokensRaw = await tokenResponse.json();
    const tokens = googleTokenResponseSchema.parse(tokensRaw);

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      logger.error('Failed to get user info');
      return new NextResponse(
        generateOAuthCallbackHTML({
          type: 'error',
          error: 'Failed to get user information',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'text/html' },
        },
      );
    }

    const userInfoRaw = await userInfoResponse.json();
    const userInfo = googleUserInfoSchema.parse(userInfoRaw);

    // Return success HTML page with tokens
    const successData = {
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
      },
      user: {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      },
    };

    const response = new NextResponse(
      generateOAuthCallbackHTML({
        type: 'success',
        data: successData,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      },
    );

    // Set secure cookies for the tokens
    response.cookies.set('google_access_token', tokens.access_token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in || 3600,
      path: '/',
    });

    if (tokens.refresh_token) {
      response.cookies.set('google_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
      });
    }

    response.cookies.set('google_user_info', JSON.stringify(userInfo), {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error('Google OAuth callback error:', error);

    return new NextResponse(
      generateOAuthCallbackHTML({
        type: 'error',
        error: 'Failed to complete authentication',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      },
    );
  }
}
