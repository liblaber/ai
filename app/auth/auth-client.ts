import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';

export const { signIn, signUp, signOut, useSession } = createAuthClient({
  plugins: [organizationClient()], // No plugins needed - we use built-in email/password and social auth
});
