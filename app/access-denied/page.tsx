'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/Card';
import { Button } from '~/components/ui/Button';
import { Logo } from '~/components/Logo';
import { signOut } from '~/auth/auth-client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AccessDeniedPage() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      // Check permissions again
      const response = await fetch('/api/me/permissions/check', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data && typeof data === 'object' && 'hasPermissions' in data) {
          const hasPermissions = data.hasPermissions as boolean;

          if (hasPermissions) {
            // User now has permissions, redirect to main app
            router.push('/');
            return;
          }
        }
      }

      // If still no permissions, refresh the page to show updated state
      router.refresh();
    } catch (error) {
      console.error('Error checking permissions:', error);
      // On error, just refresh the page
      router.refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-depth-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo />
        </div>

        {/* Access Denied Card */}
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <CardTitle className="text-xl text-red-500">Access Denied</CardTitle>
            <CardDescription className="text-secondary">
              You don't have permission to access this application
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="text-center text-sm text-secondary space-y-2">
              <p>Your account has been created, but you don't have any permissions assigned yet.</p>
              <p>Please contact your administrator to get the appropriate access levels.</p>
            </div>

            <div className="flex flex-col space-y-3">
              <Button onClick={handleRefresh} variant="primary" className="w-full" disabled={isRefreshing}>
                {isRefreshing ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Checking Permissions...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Refresh & Check Permissions
                  </>
                )}
              </Button>

              <Button onClick={handleSignOut} variant="outline" className="w-full">
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="mt-6 text-center text-xs text-secondary">
          <p>
            Need help? Contact your system administrator or check the{' '}
            <a
              href="https://docs.liblab.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-500 hover:text-accent-400 underline"
            >
              documentation
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
