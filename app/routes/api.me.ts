import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { userService, type UserProfile } from '~/lib/services/userService';
import { requireUserId } from '~/auth/session';

interface UserResponse {
  success: boolean;
  user?: UserProfile;
  error?: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const userId = await requireUserId(request);
    const user = await userService.getUser(userId);

    if (!user) {
      const response: UserResponse = {
        success: false,
        error: 'User not found',
      };
      return json(response, { status: 404 });
    }

    const response: UserResponse = {
      success: true,
      user,
    };

    return json(response);
  } catch (error) {
    console.error('Failed to fetch user data:', error);

    const response: UserResponse = {
      success: false,
      error: 'Failed to fetch user data',
    };

    return json(response, { status: 500 });
  }
}
