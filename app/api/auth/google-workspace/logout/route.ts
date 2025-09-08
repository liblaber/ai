import { NextRequest, NextResponse } from 'next/server';
import { createScopedLogger } from '~/utils/logger';
import { env } from '~/env/server';

const logger = createScopedLogger('google-workspace-logout');

export async function POST(_request: NextRequest) {
  try {
    // Clear the authentication cookie
    const response = NextResponse.json({ success: true });

    response.cookies.set('google_workspace_auth', '', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error('Google Workspace logout error:', error);
    return NextResponse.json({ success: false, error: 'Failed to logout' }, { status: 500 });
  }
}
