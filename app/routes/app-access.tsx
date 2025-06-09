import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from '@remix-run/react';
import { LoginButton } from '~/components/auth/LoginButton';
import { logger } from '~/utils/logger';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const redirectUrl = searchParams.get('redirect');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If user is already logged in, redirect them
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/website-access/token');

        if (response.ok) {
          if (redirectUrl) {
            // Check if the redirect URL is external
            try {
              const url = new URL(decodeURIComponent(redirectUrl));
              const searchParams = new URLSearchParams();

              const responseJson = await response.json<{ token: string }>();

              searchParams.set('authToken', responseJson.token);

              // If the URL is external (different origin), use window.location
              window.location.href = url + '?' + searchParams.toString();

              console.log('Redirecting to external URL:', url.toString() + '?' + searchParams.toString());

              return;
            } catch (e) {
              // If URL parsing fails, treat it as an internal path
              console.error(e);
              logger.warn('Invalid redirect URL:', redirectUrl);
            }
          }

          // For internal URLs or no redirect, use Remix navigation
          navigate(redirectUrl || '/');
        } else {
          if (redirectUrl) {
            localStorage.setItem('authRedirectUrl', `/app-access?redirect=${encodeURIComponent(redirectUrl)}`);
          }
        }
      } catch (e) {
        logger.error(e);

        // Store the full app-access route with redirect parameter in localStorage if it exists
        if (redirectUrl) {
          localStorage.setItem('authRedirectUrl', `/app-access?redirect=${encodeURIComponent(redirectUrl)}`);
        }
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [redirectUrl]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">Access your personalized content</p>
        </div>
        <div className="mt-8 space-y-6">
          <div className="flex justify-center">
            <LoginButton />
          </div>
        </div>
      </div>
    </div>
  );
}
