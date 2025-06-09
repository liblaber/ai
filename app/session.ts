import { auth } from './lib/auth';

export async function getSession(request: Request) {
  return await auth.api.getSession({ headers: request.headers });
}

export async function requireUserId(request: Request) {
  const session = await getSession(request);

  if (!session) {
    throw new Error('Session not found');
  }

  return session.user.id;
}
