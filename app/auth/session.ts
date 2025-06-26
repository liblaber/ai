import { auth } from '~/auth/auth-config';

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
