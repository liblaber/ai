import { NextRequest, NextResponse } from 'next/server';
import { requireUserAbility } from '~/auth/session';
import { GoogleWorkspaceAuthManager } from '@liblab/data-access/accessors/google-workspace/auth-manager';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('google-workspace-refresh');

export async function POST(request: NextRequest) {
  try {
    await requireUserAbility(request);

    // Check if user has stored Google Workspace auth
    const authCookie = request.cookies.get('google_workspace_auth');

    if (!authCookie?.value) {
      return NextResponse.json(
        {
          success: false,
          error: 'No authentication found',
        },
        { status: 401 },
      );
    }

    try {
      // Decrypt existing tokens
      const authManager = new GoogleWorkspaceAuthManager(process.env.GOOGLE_AUTH_ENCRYPTION_KEY);
      const credentials = authManager.decryptCredentials(authCookie.value);

      if (!credentials.refresh_token) {
        return NextResponse.json(
          {
            success: false,
            error: 'No refresh token available',
          },
          { status: 400 },
        );
      }

      // Initialize auth manager with existing credentials
      await authManager.initialize({
        type: 'oauth2',
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        credentials,
        scopes: [],
      });

      // Force refresh tokens
      const refreshedCredentials = await authManager.refreshTokens();

      // Update cookie with new tokens
      const cookieMaxAge = 30 * 24 * 60 * 60; // 30 days
      const response = NextResponse.json({
        success: true,
        tokens: {
          access_token: refreshedCredentials.access_token,
          refresh_token: refreshedCredentials.refresh_token,
          expiry_date: refreshedCredentials.expiry_date,
        },
      });

      response.cookies.set('google_workspace_auth', authManager.encryptCredentials(refreshedCredentials), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: cookieMaxAge,
        path: '/',
      });

      return response;
    } catch (error) {
      logger.error('Token refresh failed:', error);

      // Clear invalid cookie
      const response = NextResponse.json(
        {
          success: false,
          error: 'Token refresh failed',
        },
        { status: 401 },
      );

      response.cookies.delete('google_workspace_auth');

      return response;
    }
  } catch (error) {
    logger.error('Google Workspace token refresh error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to refresh tokens',
      },
      { status: 500 },
    );
  }
}
