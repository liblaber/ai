'use client';
import React, { useEffect } from 'react';
import { signIn, useSession } from '~/auth/auth-client';
import {
  Description as DialogDescription,
  Root as DialogRoot,
  Title as DialogTitle,
  Trigger as DialogTrigger,
} from '@radix-ui/react-dialog';
import { Dialog } from '~/components/ui/Dialog';
import { useAuth } from '~/components/auth/AuthContext';
import { Button } from '~/components/ui/Button';
import { useAuthProvidersPlugin } from '~/lib/hooks/plugins/useAuthProvidersPlugin';
import type { AuthProvider, AuthProviderType } from '~/lib/plugins/types';

export function LoginButton() {
  const { isLoginModalOpen, toggleLoginModal, loginModalTitle } = useAuth();
  const { socialProviders, anonymousProvider } = useAuthProvidersPlugin();
  const { data: session } = useSession();

  useEffect(() => {
    // Allow auto login only if the anonymous plugin is enabled
    if (!anonymousProvider) {
      return;
    }

    if (session?.user) {
      return;
    }

    autoLoginAnonymous();
  }, [anonymousProvider]);

  const handleProviderLogin = async (provider: AuthProviderType) => {
    toggleLoginModal(false);

    try {
      switch (provider) {
        case 'anonymous': {
          const { error: signInError } = await signIn.email({
            email: 'anonymous@anonymous.com',
            password: 'password1234',
            rememberMe: true,
          });

          if (signInError) {
            console.error('Failed to sign in anonymous user:', signInError);
            return;
          }

          // Refresh the landing page after login to show data sources connection modal
          window.location.reload();
          break;
        }
        default:
          await signIn.social({ provider });
          break;
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const renderAuthButton = (provider: AuthProvider) => {
    return (
      <Button
        variant="outline"
        className="w-full h-12 text-base"
        onClick={() => handleProviderLogin(provider.provider)}
      >
        {provider.icon}
        {provider.label}
      </Button>
    );
  };

  return (
    <DialogRoot open={isLoginModalOpen} onOpenChange={toggleLoginModal}>
      <DialogTrigger asChild>
        <button className="px-4 py-2 rounded-md font-medium text-sm bg-white border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all shadow-sm hover:shadow text-liblab-elements-button-primary-text">
          Log in
        </button>
      </DialogTrigger>

      <Dialog
        className="sm:max-w-[500px] w-[500px] rounded-lg shadow-xs bg-gray-500 bg-opacity-70 border border-liblab-elements-borderColor backdrop-blur-[2px] flex flex-col items-center justify-center min-h-[400px]"
        onClose={() => toggleLoginModal(false)}
        onBackdrop={() => toggleLoginModal(false)}
      >
        <div className="w-full flex flex-col items-center justify-center">
          <DialogTitle asChild>
            <h2 className="text-center text-lg font-medium mb-4 mt-0 text-liblab-elements-textPrimary">
              {loginModalTitle || 'Log in'}
            </h2>
          </DialogTitle>
          <DialogDescription className="text-center text-sm mb-8 text-liblab-elements-textSecondary">
            Please log in to continue.
          </DialogDescription>

          <div className="flex flex-col gap-3 w-full max-w-80 px-6">
            {socialProviders.map((provider: AuthProvider) => (
              <div key={provider.pluginId}>{renderAuthButton(provider)}</div>
            ))}

            {socialProviders.length > 0 && anonymousProvider && (
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-[#0A0A0A] px-2 text-liblab-elements-textSecondary">OR</span>
                </div>
              </div>
            )}

            {anonymousProvider && <div>{renderAuthButton(anonymousProvider)}</div>}
          </div>
        </div>
      </Dialog>
    </DialogRoot>
  );
}

const autoLoginAnonymous = async () => {
  try {
    // Sign in the anonymous user (should be pre-created by seed)
    const { error: signInError } = await signIn.email({
      email: 'anonymous@anonymous.com',
      password: 'password1234',
      rememberMe: true,
    });

    if (signInError) {
      console.error('Failed to sign in anonymous user:', signInError);
      return;
    }

    // Refresh the landing page after successful login to show data sources connection modal
    window.location.reload();
  } catch (error: any) {
    throw new Error(`Anonymous login failed: ${error?.message}`);
  }
};
