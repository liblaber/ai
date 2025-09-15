import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '~/auth/session';
import { userHasMeaningfulPermissions } from '~/lib/services/permissionService';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('permissions-check');

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId(request);

    const hasPermissions = await userHasMeaningfulPermissions(userId);

    return NextResponse.json({
      success: true,
      hasPermissions,
    });
  } catch (error) {
    logger.error('Error checking user permissions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check permissions',
        hasPermissions: false,
      },
      { status: 500 },
    );
  }
}
