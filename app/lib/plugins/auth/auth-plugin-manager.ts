import type { AuthProvider } from '~/lib/plugins/types';
import { GoogleIcon, AnonymousIcon } from '~/components/auth/auth-provider-icons';

export class AuthPluginManager {
  static authProviders: AuthProvider[] = [
    {
      pluginId: 'google',
      icon: GoogleIcon(),
      label: 'Login with Google',
      provider: 'google',
    },
    {
      pluginId: 'anonymous',
      icon: AnonymousIcon(),
      label: 'Continue as Guest',
      provider: 'anonymous',
    },
  ];
}
