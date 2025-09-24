'use client';

import { useEffect, useRef, createContext, useContext, useState } from 'react';
import { signIn, useSession } from '~/auth/auth-client';
import { useAuthProvidersPlugin } from '~/lib/hooks/plugins/useAuthProvidersPlugin';
import { useRouter } from 'next/navigation';
import { logger } from '~/utils/logger';

type AuthState =
  | { status: 'INITIALIZING' }
  | { status: 'UNAUTHENTICATED' }
  | { status: 'AUTHENTICATING' }
  | { status: 'AUTHENTICATED' }
  | { status: 'ERROR'; error: string };

interface AuthContextValue {
  authState: AuthState;
  session: any;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: any;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const { data: session } = useSession();
  const { anonymousProvider } = useAuthProvidersPlugin();
  const router = useRouter();
  const isLoggingIn = useRef(false);
  const [authState, setAuthState] = useState<AuthState>(
    initialUser ? { status: 'AUTHENTICATED' } : { status: 'INITIALIZING' },
  );

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // If we have initial user data from server, we're authenticated
        if (initialUser) {
          setAuthState({ status: 'AUTHENTICATED' });
          return;
        }

        // If no user and no session, handle anonymous login
        if (!session?.user) {
          if (anonymousProvider && !isLoggingIn.current) {
            setAuthState({ status: 'AUTHENTICATING' });
            await loginAnonymous();
            router.refresh();
          } else {
            setAuthState({ status: 'UNAUTHENTICATED' });
          }

          return;
        }

        // If we have a session, we're authenticated
        setAuthState({ status: 'AUTHENTICATED' });
      } catch (error) {
        logger.error('❌ Auth error:', error);
        setAuthState({
          status: 'ERROR',
          error: error instanceof Error ? error.message : 'Authentication failed',
        });
      }
    };

    handleAuth();
  }, [session?.user, anonymousProvider?.provider, initialUser, router]);

  const loginAnonymous = async () => {
    if (isLoggingIn.current) {
      return;
    }

    isLoggingIn.current = true;

    try {
      logger.debug('🔐 Attempting anonymous login...');

      const { error } = await signIn.email({
        email: 'anonymous@anonymous.com',
        password: 'password1234',
        rememberMe: true,
      });

      if (error) {
        throw new Error(`Anonymous login failed: ${error}`);
      }

      logger.debug('✅ Anonymous login successful');
    } finally {
      isLoggingIn.current = false;
    }
  };

  return <AuthContext.Provider value={{ authState, session }}>{children}</AuthContext.Provider>;
}
