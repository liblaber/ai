import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '~/auth/session';
import { userHasMeaningfulPermissions } from '~/lib/services/permissionService';

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId(request);

    const hasPermissions = await userHasMeaningfulPermissions(userId);

    return NextResponse.json({
      success: true,
      hasPermissions,
    });
  } catch (error) {
    console.error('Error checking user permissions:', error);
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
