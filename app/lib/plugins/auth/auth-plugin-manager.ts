import type { AuthProvider } from '~/lib/plugins/types';
import { GoogleIcon, TwitchIcon, TwitterIcon, AnonymousIcon } from '~/components/auth/auth-provider-icons';

export class AuthPluginManager {
  static authProviders: AuthProvider[] = [
    {
      pluginId: 'google',
      icon: GoogleIcon(),
      label: 'Login with Google',
      provider: 'google',
    },
    {
      pluginId: 'twitch',
      icon: TwitchIcon(),
      label: 'Login with Twitch',
      provider: 'twitch',
    },
    {
      pluginId: 'twitter',
      icon: TwitterIcon(),
      label: 'Login with X',
      provider: 'twitter',
    },
    {
      pluginId: 'anonymous',
      icon: AnonymousIcon(),
      label: 'Continue as Guest',
      provider: 'anonymous',
    },
  ];
}
