import { createAuthClient } from 'better-auth/react';
import { ssoClient } from '@better-auth/sso/client';

export const { signIn, signUp, signOut, useSession } = createAuthClient({
  plugins: [ssoClient()], // Add SSO client plugin for OIDC support
});
