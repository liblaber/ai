import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '~/lib/prisma';
import { anonymous } from 'better-auth/plugins';
import '~/lib/config/env';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'sqlite',
  }),
  plugins: [anonymous()],
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },
  baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
  trustedOrigins: [(process.env.BASE_URL as string) ?? 'http://localhost:3000'],
});
