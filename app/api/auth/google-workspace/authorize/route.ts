import { NextRequest, NextResponse } from 'next/server';
import { requireUserAbility } from '~/auth/session';
import { GoogleWorkspaceAuthManager } from '@liblab/data-access/accessors/google-workspace/auth-manager';
import { GOOGLE_WORKSPACE_SCOPES } from '@liblab/data-access/accessors/google-workspace/types';
import { env } from '~/env/server';
import { createScopedLogger } from '~/utils/logger';
import { z } from 'zod';

const logger = createScopedLogger('google-workspace-auth');

const requestSchema = z.object({
  type: z.enum(['docs', 'sheets']),
  scopes: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Validate required environment variables
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_AUTH_ENCRYPTION_KEY) {
      logger.error('Google Workspace auth is not configured. Missing required environment variables.');
      return NextResponse.json(
        {
          success: false,
          error: 'Google Workspace authentication is not configured.',
        },
        { status: 500 },
      );
    }

    const { userId } = await requireUserAbility(request);

    // Validate request body with Zod
    const body = await request.json();
    const { type, scopes } = requestSchema.parse(body);

    // Initialize auth manager
    const authManager = new GoogleWorkspaceAuthManager(env.GOOGLE_AUTH_ENCRYPTION_KEY!);

    // Determine scopes based on type
    const requestedScopes =
      scopes || (type === 'docs' ? [GOOGLE_WORKSPACE_SCOPES.DOCS.READONLY] : [GOOGLE_WORKSPACE_SCOPES.SHEETS.READONLY]);

    // Add Drive scope for file listing and ensure we get offline access
    const allScopes = [
      ...requestedScopes,
      'https://www.googleapis.com/auth/drive.readonly', // For listing files
      'https://www.googleapis.com/auth/userinfo.email', // For user identification
    ];

    await authManager.initialize({
      type: 'oauth2',
      clientId: env.GOOGLE_CLIENT_ID!,
      clientSecret: env.GOOGLE_CLIENT_SECRET!,
      redirectUri: `${request.nextUrl.origin}/api/auth/google-workspace/callback`,
      scopes: allScopes,
    });

    // Generate auth URL with user ID in state
    const authUrl = authManager.generateAuthUrl(allScopes, JSON.stringify({ userId, type }));

    return NextResponse.json({ success: true, authUrl });
  } catch (error) {
    logger.error('Google Workspace auth error:', error);
    return NextResponse.json({ success: false, error: 'Failed to initialize Google authentication' }, { status: 500 });
  }
}
