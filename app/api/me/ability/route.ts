import { NextRequest, NextResponse } from 'next/server';
import { requireUserAbility } from '~/auth/session';
import { logger } from '~/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const { userAbility } = await requireUserAbility(request);

    return NextResponse.json({ success: true, rules: userAbility.rules });
  } catch (error) {
    logger.error('Error fetching user ability:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch user ability' }, { status: 500 });
  }
}
