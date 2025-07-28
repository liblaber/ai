import { getSession } from './session';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { env } from '~/lib/config/env';

/**
 * Middleware function to protect routes that require authentication
 * @returns Promise<void> - redirects if not authenticated
 */
export async function requireAuth(): Promise<void> {
  const headersList = await headers();
  const session = await getSession(
    new Request('http://localhost', {
      headers: Object.fromEntries(headersList.entries()),
    }),
  );

  if (!session) {
    // Redirect to root if not authenticated
    redirect((env.BASE_URL as string) ?? 'http://localhost:3000');
  }
}
