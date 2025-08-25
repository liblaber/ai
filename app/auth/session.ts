import { auth } from './auth-config';
import { getUserAbility } from '~/lib/casl/user-ability';

// Define proper session types that match better-auth's actual structure
type SessionUser = {
  id: string;
  email: string;
  name?: string;
  image?: string;
};

type Session = {
  user: SessionUser | null;
};

export async function getSession(request: Request): Promise<Session | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session as Session | null;
}

export async function requireUserId(request: Request) {
  const session = await getSession(request);

  if (!session) {
    throw new Error('Session not found');
  }

  if (!session.user) {
    throw new Error('User not found');
  }

  return session.user.id;
}

export async function requireUserAbility(request: Request) {
  const userId = await requireUserId(request);
  const userAbility = await getUserAbility(userId);

  if (!userAbility) {
    throw new Error('User ability not found');
  }

  return { userId, userAbility };
}
