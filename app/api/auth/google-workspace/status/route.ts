import { NextRequest, NextResponse } from 'next/server';
import { requireUserAbility } from '~/auth/session';
import { GoogleWorkspaceAuthManager } from '@liblab/data-access/accessors/google-workspace/auth-manager';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('google-workspace-status');

export async function GET(request: NextRequest) {
  try {
    await requireUserAbility(request);

    // Check if user has stored Google Workspace auth
    const authCookie = request.cookies.get('google_workspace_auth');

    if (!authCookie?.value) {
      return NextResponse.json({
        authenticated: false,
        tokens: null,
      });
    }

    try {
      // Decrypt and validate tokens
      const authManager = new GoogleWorkspaceAuthManager(process.env.GOOGLE_AUTH_ENCRYPTION_KEY);
      const credentials = authManager.decryptCredentials(authCookie.value);

      // Check if tokens are still valid (not expired)
      // Convert both dates to UTC for consistent comparison
      const nowUtc = Date.now();
      const expiryDateUtc = new Date(credentials.expiry_date).getTime();
      const isExpired = expiryDateUtc <= nowUtc;

      if (isExpired && credentials.refresh_token) {
        // Try to refresh tokens
        await authManager.initialize({
          type: 'oauth2',
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          credentials,
          scopes: [], // Will be determined from existing tokens
        });

        try {
          const refreshedCredentials = await authManager.refreshTokens();

          // Update cookie with new tokens
          const response = NextResponse.json({
            authenticated: true,
            tokens: {
              access_token: refreshedCredentials.access_token,
              refresh_token: refreshedCredentials.refresh_token,
            },
          });

          // Set longer-lived cookie for refreshed tokens
          const cookieMaxAge = 30 * 24 * 60 * 60; // 30 days
          response.cookies.set('google_workspace_auth', authManager.encryptCredentials(refreshedCredentials), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: cookieMaxAge,
            path: '/',
          });

          return response;
        } catch (refreshError) {
          logger.error('Google Workspace token refresh failed during status check:', refreshError);

          // Refresh failed, clear the cookie
          const response = NextResponse.json({
            authenticated: false,
            tokens: null,
          });

          response.cookies.delete('google_workspace_auth');

          return response;
        }
      }

      return NextResponse.json({
        authenticated: !isExpired,
        tokens: !isExpired
          ? {
              access_token: credentials.access_token,
              refresh_token: credentials.refresh_token,
            }
          : null,
      });
    } catch (decryptError) {
      logger.error('Failed to decrypt Google Workspace credentials:', decryptError);

      // Invalid/corrupted cookie, clear it
      const response = NextResponse.json({
        authenticated: false,
        tokens: null,
      });

      response.cookies.delete('google_workspace_auth');

      return response;
    }
  } catch (error) {
    logger.error('Google Workspace status check error:', error);
    return NextResponse.json({ success: false, error: 'Failed to check authentication status' }, { status: 500 });
  }
}
