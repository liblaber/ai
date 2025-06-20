import type { LoaderFunction, ActionFunction } from '@remix-run/cloudflare';
import { getSession } from '~/auth/session';

/**
 * Middleware function to protect routes that require authentication
 * @param handler The original loader or action function
 * @returns A protected version of the handler
 */
export function requireAuth<T extends LoaderFunction | ActionFunction>(handler: T): T {
  return (async (args) => {
    /*
     * TODO: @skos this function triggers the login, need to setup the anonymous user
     * {
     *   "session": {
     *   "expiresAt": "2025-06-27T14:17:58.851Z",
     *     "token": "DlKstprgBl4MowgSvgJlL52MlrDW9Y8d",
     *     "createdAt": "2025-06-20T14:17:58.851Z",
     *     "updatedAt": "2025-06-20T14:17:58.851Z",
     *     "ipAddress": "",
     *     "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
     *     "userId": "WIXIpal5wcViKgrjH4ttFIm2uKGN4l9E",
     *     "id": "zXy59afAqK0YJZyHUWYNcrbcEuZebK4B"
     * },
     *   "user": {
     *   "name": "Stevan Kosijer",
     *     "email": "stevank@liblab.com",
     *     "emailVerified": true,
     *     "image": "https://lh3.googleusercontent.com/a/ACg8ocLghfZ21dsUcGbo4JLOz1FMYbdtb6qT4d8IiaSHcfgc6H2DsDU=s96-c",
     *     "createdAt": "2025-06-20T13:31:52.669Z",
     *     "updatedAt": "2025-06-20T13:31:52.669Z",
     *     "id": "WIXIpal5wcViKgrjH4ttFIm2uKGN4l9E"
     * }
     * }
     */
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
