import { NextRequest, NextResponse } from 'next/server';
import { requireUserId } from '~/auth/session';
import { userService } from '~/lib/services/userService';

type UpdateRoleBody = {
  userId: string;
  role: 'ADMIN' | 'MEMBER';
};

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    const currentUser = await userService.getUser(userId);

    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const users = await userService.getAllUsers();

    return NextResponse.json({ success: true, users }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    const body = (await request.json()) as UpdateRoleBody;

    const currentUser = await userService.getUser(userId);

    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const targetUser = await userService.updateUserRole(body.userId, body.role);

    return NextResponse.json({ success: true, user: targetUser });
  } catch (error) {
    console.error('Failed to update user role:', error);
    return NextResponse.json({ success: false, error: 'Failed to update user role' }, { status: 500 });
  }
}
