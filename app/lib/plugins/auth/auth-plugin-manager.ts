import type { AuthProvider } from '~/lib/plugins/types';
import { GoogleIcon, AnonymousIcon, OidcIcon } from '~/components/auth/auth-provider-icons';

export class AuthPluginManager {
  static authProviders: AuthProvider[] = [
    {
      pluginId: 'google',
      icon: GoogleIcon(),
      label: 'Login with Google',
      provider: 'google',
    },
    {
      pluginId: 'oidc',
      icon: OidcIcon(),
      label: 'Login with SSO',
      provider: 'oidc',
    },
    {
      pluginId: 'anonymous',
      icon: AnonymousIcon(),
      label: 'Continue as Guest',
      provider: 'credential', // Use credential provider for the anonymous user
    },
  ];
}
