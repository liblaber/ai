'use client';

import { useEffect } from 'react';

interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
}

interface OAuthSectionProps {
  isCheckingAuth: boolean;
  isGoogleAuthenticated: boolean;
  googleUser: GoogleUser | null;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
  pendingAuthCheck: boolean;
  setPendingAuthCheck: (value: boolean) => void;
  checkOAuthStatus: () => Promise<boolean>;
}

export function OauthSection({
  isCheckingAuth,
  isGoogleAuthenticated,
  googleUser,
  onGoogleSignIn,
  onSignOut,
  pendingAuthCheck,
  setPendingAuthCheck,
  checkOAuthStatus,
}: OAuthSectionProps) {
  // Add focus listener for post-OAuth auth checking
  useEffect(() => {
    const handleWindowFocus = () => {
      if (pendingAuthCheck) {
        setPendingAuthCheck(false);
        setTimeout(() => {
          checkOAuthStatus();
        }, 500);
      }
    };

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [pendingAuthCheck, setPendingAuthCheck, checkOAuthStatus]);

  return (
    <div>
      <h2
        className="mb-3"
        style={{
          fontFamily: 'SF Pro Text, sans-serif',
          fontSize: '16px',
          fontWeight: 500,
          lineHeight: '24px',
          color: '#F7F7F8',
        }}
      >
        OAuth Authentication
      </h2>

      <div
        className="mb-6"
        style={{
          fontFamily: 'SF Pro Text, sans-serif',
          fontSize: '14px',
          fontWeight: 400,
          lineHeight: '20px',
          color: '#999EA7',
        }}
      >
        Connect with your Google account to access your spreadsheets directly. This provides the most reliable access
        for both reading and writing.
      </div>

      {/* Horizontal divider line */}
      <div
        style={{
          height: '1px',
          backgroundColor: 'var(--Grey-Grey-600, #4A4F59)',
          marginTop: '24px',
          marginBottom: '24px',
        }}
      />

      {/* Authentication section */}
      <div className="space-y-4">
        {isCheckingAuth ? (
          <div className="flex items-center justify-center py-8">
            <div
              style={{
                fontFamily: 'SF Pro Text, sans-serif',
                fontSize: '14px',
                color: 'var(--color-gray-400)',
              }}
            >
              Checking authentication status...
            </div>
          </div>
        ) : !isGoogleAuthenticated ? (
          <div>
            <button
              onClick={onGoogleSignIn}
              className="flex items-center gap-3 cursor-pointer transition-colors hover:bg-[var(--color-gray-700)] border border-[var(--color-gray-600)] rounded-lg"
              style={{
                height: '44px',
                padding: '10px 16px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-gray-800)',
              }}
            >
              <img src="/icons/google-auth.svg" alt="Google" style={{ width: '16px', height: '16px' }} />
              <span
                style={{
                  fontFamily: 'SF Pro Text, sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--color-gray-100)',
                }}
              >
                Sign in with Google
              </span>
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div className="flex items-center gap-3">
              <img src="/icons/user-avatar.svg" alt="User Avatar" style={{ width: '32px', height: '32px' }} />
              <div>
                <div
                  style={{
                    fontFamily: 'SF Pro Text, sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--color-gray-100)',
                  }}
                >
                  {googleUser?.name}
                </div>
                <div
                  style={{
                    fontFamily: 'SF Pro Text, sans-serif',
                    fontSize: '12px',
                    fontWeight: 400,
                    color: 'var(--color-gray-400)',
                  }}
                >
                  {googleUser?.email}
                </div>
              </div>
            </div>
            <button
              onClick={onSignOut}
              className="cursor-pointer transition-colors hover:bg-[var(--color-gray-700)] border border-[var(--color-gray-600)] rounded-lg"
              style={{
                height: '32px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontFamily: 'SF Pro Text, sans-serif',
                fontSize: '12px',
                color: 'var(--color-gray-300)',
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
