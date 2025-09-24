import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Cache for onboarding status to avoid repeated API calls
let onboardingStatusCache: { isSetUp: boolean; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function checkOnboardingStatus(request: NextRequest): Promise<boolean> {
  // Check cache first
  if (onboardingStatusCache) {
    const now = Date.now();
    const isExpired = now - onboardingStatusCache.timestamp > CACHE_DURATION;

    if (!isExpired) {
      return onboardingStatusCache.isSetUp;
    }
  }

  try {
    // Make an internal API call to check onboarding status
    const baseUrl = new URL(request.url).origin;
    const response = await fetch(`${baseUrl}/api/onboarding/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }

    const data = (await response.json()) as { isSetUp?: boolean };
    const isSetUp = data.isSetUp || false;

    // Update cache
    onboardingStatusCache = {
      isSetUp,
      timestamp: Date.now(),
    };

    return isSetUp;
  } catch (error) {
    console.error('Error checking onboarding status in middleware:', error);
    // On error, assume not set up
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Store current request url in a custom header, which you can read later
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-url', request.url);

  // Check if this is an API call that completed onboarding
  if (pathname === '/api/onboarding/complete') {
    // Clear the cache when onboarding is completed
    onboardingStatusCache = null;
  }

  // Check onboarding status for root path and onboarding path
  if (pathname === '/' || pathname === '/onboarding') {
    const isApplicationSetUp = await checkOnboardingStatus(request);

    // If application is set up and user is trying to access onboarding, redirect to home
    if (isApplicationSetUp && pathname === '/onboarding') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // If application is not set up and user is trying to access home, redirect to onboarding
    if (!isApplicationSetUp && pathname === '/') {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Run middleware for all routes
export const config = {
  matcher: [
    // Match all routes except static files and API routes
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
