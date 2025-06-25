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
import type { AuthPluginId } from '~/lib/plugins/plugin-manager';
import { Button } from '~/components/ui/Button';
import type { Plugin } from '~/lib/plugins/types';

interface AuthProvider extends Plugin {
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

  const socialProviders: AuthProvider[] = [
    {
      pluginId: 'google',
      renderLoginButton: () => (
        <Button variant="outline" className="w-full h-12 text-base" onClick={() => handleProviderLogin('google')}>
          <svg
            stroke="currentColor"
            fill="currentColor"
            strokeWidth="0"
            viewBox="0 0 488 512"
            height="1em"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-2"
          >
            <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
          </svg>
          Login with Google
        </Button>
      ),
    },
    {
      pluginId: 'twitch',
      renderLoginButton: () => (
        <Button variant="outline" className="w-full h-12 text-base">
          <svg
            stroke="currentColor"
            fill="currentColor"
            strokeWidth="0"
            viewBox="0 0 512 512"
            height="1em"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-2"
          >
            <path d="M391.17,103.47H352.54v109.7h38.63ZM285,103H246.37V212.75H285ZM120.83,0,24.31,91.42V420.58H140.14V512l96.53-91.42h77.25L487.69,256V0ZM449.07,237.75l-77.22,73.12H294.61l-67.6,64v-64H140.14V36.58H449.07Z"></path>
          </svg>
          Login with Twitch
        </Button>
      ),
    },
    {
      pluginId: 'x',
      renderLoginButton: () => (
        <Button variant="outline" className="w-full h-12 text-base">
          <svg
            stroke="currentColor"
            fill="currentColor"
            strokeWidth="0"
            viewBox="0 0 512 512"
            height="1em"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-2"
          >
            <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z"></path>
          </svg>
          Login with X
        </Button>
      ),
    },
  ];

  const anonymousProvider: AuthProvider = {
    pluginId: 'anonymous',
    renderLoginButton: () => (
      <Button variant="outline" className="w-full h-12 text-base" onClick={handleAnonymousLogin}>
        <LuCircleUserRound className="h-4 w-4 mr-2" />
        Continue as Guest
      </Button>
    ),
  };

  return (
    <DialogRoot open={isLoginModalOpen} onOpenChange={toggleLoginModal}>
      <DialogTrigger asChild>
        <button className="px-4 py-2 rounded-md font-medium text-sm bg-white border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all shadow-sm hover:shadow">
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
            {/* Social Login Buttons */}
            {socialProviders
              .filter(({ pluginId }) => pluginAccess.auth[pluginId as AuthPluginId])
              .map((provider) => (
                <div key={provider.pluginId}>{provider.renderLoginButton()}</div>
              ))}

            {Object.keys(pluginAccess.auth).some(
              (key) => key !== 'anonymous' && pluginAccess.auth[key as AuthPluginId],
            ) && (
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-[#0A0A0A] px-2 text-liblab-elements-textSecondary">OR</span>
                </div>
              </div>
            )}

            {pluginAccess.auth.anonymous && <div>{anonymousProvider.renderLoginButton()}</div>}
          </div>
        </div>
      </Dialog>
    </DialogRoot>
  );
}
