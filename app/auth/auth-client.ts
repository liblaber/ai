import { createAuthClient } from 'better-auth/react';
import { anonymousClient } from 'better-auth/client/plugins';

export const { signIn, signOut, useSession } = createAuthClient({
  plugins: [anonymousClient()],
});
