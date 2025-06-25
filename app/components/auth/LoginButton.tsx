import React from 'react';
import { signIn } from '~/auth/auth-client';
import {
  Description as DialogDescription,
  Root as DialogRoot,
  Title as DialogTitle,
  Trigger as DialogTrigger,
} from '@radix-ui/react-dialog';
import { Dialog } from '~/components/ui/Dialog';
import { useAuth } from '~/components/auth/AuthContext';
import { LuCircleUserRound } from 'react-icons/lu';
import { usePluginStore } from '~/lib/plugins/plugin-store';
import { Button } from '~/components/ui/Button';

interface AuthProvider {
  id: string;
  renderLoginButton: () => React.ReactNode;
}

export function LoginButton() {
  const { isLoginModalOpen, toggleLoginModal, loginModalTitle } = useAuth();
  const { pluginAccess } = usePluginStore();

  const handleProviderLogin = async (provider: string) => {
    toggleLoginModal(false);

    try {
      await signIn.social({ provider });
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleAnonymousLogin = async () => {
    toggleLoginModal(false);

    try {
      await signIn.anonymous();
    } catch (error) {
      console.error('Anonymous login failed:', error);
    }
  };

  const authProviders: AuthProvider[] = [
    {
      id: 'google',
      renderLoginButton: () => (
        <Button variant="outline" onClick={() => handleProviderLogin('google')}>
          <svg
            stroke="currentColor"
            fill="currentColor"
            strokeWidth="0"
            viewBox="0 0 488 512"
            height="1em"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
          >
            <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
          </svg>
          Sign up with Google
        </Button>
      ),
    },
    {
      id: 'anonymous',
      renderLoginButton: () => (
        <Button variant="outline" onClick={handleAnonymousLogin}>
          <LuCircleUserRound className="size-6" />
          Continue as Guest
        </Button>
      ),
    },
  ];

  return (
    <DialogRoot open={isLoginModalOpen} onOpenChange={toggleLoginModal}>
      <DialogTrigger asChild>
        <button className="px-4 py-2 rounded-md font-medium text-sm bg-white border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all shadow-sm hover:shadow">
          Log in
        </button>
      </DialogTrigger>

      <Dialog
        className="sm:max-w-[450px] w-[500px] rounded-lg shadow-xs bg-gray-500 bg-opacity-70 border border-liblab-elements-borderColor backdrop-blur-[2px] flex flex-col items-center justify-center min-h-[400px]"
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
          <div className="flex flex-col gap-2 max-w-60 w-full">
            {authProviders
              .filter(({ id }) => pluginAccess.auth[id])
              .map((provider) => (
                <div key={provider.id}>{provider.renderLoginButton()}</div>
              ))}
          </div>
        </div>
      </Dialog>
    </DialogRoot>
  );
}
