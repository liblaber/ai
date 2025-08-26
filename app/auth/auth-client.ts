import { createAuthClient } from 'better-auth/react';

export const { signIn, signUp, signOut, useSession } = createAuthClient({
  plugins: [], // No plugins needed - we use built-in email/password and social auth
});
