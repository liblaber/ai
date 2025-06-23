import type { LoaderFunction, ActionFunction } from '@remix-run/cloudflare';
import { getSession } from '~/auth/session';

/**
 * Middleware function to protect routes that require authentication
 * @param handler The original loader or action function
 * @returns A protected version of the handler
 */
export function requireAuth<T extends LoaderFunction | ActionFunction>(handler: T): T {
  return (async (args) => {
    const session = await getSession(args.request);

    if (!session) {
      // If it's a GET request, redirect to root
      if (args.request.method === 'GET') {
        return Response.redirect('/');
      }

      // For other methods, return 401
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Add the user to the context
    const context = {
      ...args,
      user: session.user,
    };

    return handler(context);
  }) as T;
}
