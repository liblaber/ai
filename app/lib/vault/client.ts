import { InfisicalSDK } from '@infisical/sdk';
import { env } from '~/lib/config/env';

export async function getInfisicalClient() {
  const client = new InfisicalSDK({
    siteUrl: env.INFISICAL_URL || 'https://app.infisical.com',
  });

  await client.auth().universalAuth.login({
    clientId: env.INFISICAL_CLIENT_ID!,
    clientSecret: env.INFISICAL_CLIENT_SECRET!,
  });

  return client;
}
