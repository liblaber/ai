import { NextRequest, NextResponse } from 'next/server';
import { GoogleWorkspaceAuthManager } from '@liblab/data-access/accessors/google-workspace/auth-manager';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    return new NextResponse(
      `
      <html>
        <head><title>Authentication Error</title></head>
        <body>
          <script>
            window.opener?.postMessage({
              type: 'GOOGLE_AUTH_ERROR',
              error: 'Authentication was cancelled or failed'
            }, window.location.origin);
            window.close();
          </script>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      },
    );
  }

  if (!code || !state) {
    return new NextResponse(
      `
      <html>
        <head><title>Authentication Error</title></head>
        <body>
          <script>
            window.opener?.postMessage({
              type: 'GOOGLE_AUTH_ERROR',
              error: 'Missing authorization code or state'
            }, window.location.origin);
            window.close();
          </script>
        </body>
      </html>
      `,
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
    const authManager = new GoogleWorkspaceAuthManager(process.env.GOOGLE_AUTH_ENCRYPTION_KEY);

    await authManager.initialize({
      type: 'oauth2',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: `${request.nextUrl.origin}/api/auth/google-workspace/callback`,
      scopes: [], // Will be populated from the auth flow
    });

    // Exchange code for tokens
    const credentials = await authManager.exchangeCodeForTokens(code);

    // Store tokens in session/database (you may want to implement proper storage)
    // For now, we'll pass them back to the client
    const response = new NextResponse(
      `
      <html>
        <head><title>Authentication Success</title></head>
        <body>
          <script>
            window.opener?.postMessage({
              type: 'GOOGLE_AUTH_SUCCESS',
              tokens: {
                access_token: '${credentials.access_token}',
                refresh_token: '${credentials.refresh_token}',
                expiry_date: ${credentials.expiry_date}
              },
              userId: '${userId}',
              workspaceType: '${type}'
            }, window.location.origin);
            window.close();
          </script>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      },
    );

    // Set secure cookies for the tokens (optional - for session management)
    response.cookies.set('google_workspace_auth', authManager.encryptCredentials(credentials), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600, // 1 hour
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Google Workspace callback error:', error);

    return new NextResponse(
      `
      <html>
        <head><title>Authentication Error</title></head>
        <body>
          <script>
            window.opener?.postMessage({
              type: 'GOOGLE_AUTH_ERROR',
              error: 'Failed to complete authentication'
            }, window.location.origin);
            window.close();
          </script>
        </body>
      </html>
      `,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      },
    );
  }
}
