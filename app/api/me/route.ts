import { NextRequest, NextResponse } from 'next/server';
import { userService, type UserProfile } from '~/lib/services/userService';
import { requireUserId } from '~/auth/session';

interface UserResponse {
  success: boolean;
  user?: UserProfile;
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId(request);
    const user = await userService.getUser(userId);

    if (!user) {
      const response: UserResponse = {
        success: false,
        error: 'User not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: UserResponse = {
      success: true,
      user,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch user data:', error);

    const response: UserResponse = {
      success: false,
      error: 'Failed to fetch user data',
    };

    return NextResponse.json(response, { status: 500 });
  }
}
