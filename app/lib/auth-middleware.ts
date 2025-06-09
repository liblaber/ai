import { auth } from './auth';
import { json, redirect } from '@remix-run/cloudflare';
import type { LoaderFunction, ActionFunction } from '@remix-run/cloudflare';

/**
 * Middleware function to protect routes that require authentication
 * @param handler The original loader or action function
 * @returns A protected version of the handler
 */
export function requireAuth<T extends LoaderFunction | ActionFunction>(handler: T): T {
  return (async (args) => {
    const session = await auth.api.getSession({ headers: args.request.headers });

    if (!session) {
      // If it's a GET request, redirect to root
      if (args.request.method === 'GET') {
        return redirect('/');
      }

      // For other methods, return 401
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Add the user to the context
    const context = {
      ...args,
      user: session.user,
    };

    return handler(context);
  }) as T;
}

/**
 * Decorator to protect routes that require authentication
 * Can be used with @requireAuth decorator syntax
 */
export function requireAuthDecorator() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = requireAuth(originalMethod);

    return descriptor;
  };
}
