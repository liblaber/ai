import { auth } from './auth-config';
import { getUserAbility } from '~/lib/casl/user-ability';

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

export async function getSession(request: Request): Promise<Session> {
  return await auth.api.getSession({ headers: request.headers });
}

export async function requireUserId(request: Request) {
  const session = await getSession(request);

  if (!session) {
    throw new Error('Session not found');
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
