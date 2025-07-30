import { env as serverEnv } from '~/env/server';
import { env as clientEnv } from '~/env/client';

export const env = {
  server: serverEnv,
  client: clientEnv,
};
