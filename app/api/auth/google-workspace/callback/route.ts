import { NextRequest, NextResponse } from 'next/server';
import { GoogleWorkspaceAuthManager } from '@liblab/data-access/accessors/google-workspace/auth-manager';
import { env } from '~/env/server';
import { createScopedLogger } from '~/utils/logger';
import { generateOAuthCallbackHTML } from '~/lib/oauth-templates';

const logger = createScopedLogger('google-workspace-callback');

export async function GET(request: NextRequest) {
  // Validate required environment variables
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_AUTH_ENCRYPTION_KEY) {
    logger.error('Google Workspace auth is not configured. Missing required environment variables.');
    return new NextResponse(
      generateOAuthCallbackHTML({
        type: 'error',
        error: 'Google Workspace authentication is not configured',
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
    // Parse state to get user info
    const stateData = JSON.parse(state);
    const { userId, type } = stateData;

    // Initialize auth manager
    const authManager = new GoogleWorkspaceAuthManager(env.GOOGLE_AUTH_ENCRYPTION_KEY!);

    await authManager.initialize({
      type: 'oauth2',
      clientId: env.GOOGLE_CLIENT_ID!,
      clientSecret: env.GOOGLE_CLIENT_SECRET!,
      redirectUri: `${request.nextUrl.origin}/api/auth/google-workspace/callback`,
      scopes: [], // Will be populated from the auth flow
    });

    // Exchange code for tokens
    const credentials = await authManager.exchangeCodeForTokens(code);

    // Return success HTML page
    const successData = {
      tokens: {
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token,
        expiry_date: credentials.expiry_date,
      },
      userId,
      workspaceType: type,
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

    // Set secure cookies for the tokens with extended lifetime
    // Google refresh tokens are long-lived, so we can set a longer cookie expiration
    const cookieMaxAge = 30 * 24 * 60 * 60; // 30 days in seconds
    const encryptedCredentials = authManager.encryptCredentials(credentials);

    // Try multiple approaches to ensure the cookie is set
    response.cookies.set('google_workspace_auth', encryptedCredentials, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: cookieMaxAge,
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error('Google Workspace callback error:', error);

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
