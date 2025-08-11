import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '~/lib/prisma';
import { env } from '~/env';
import { anonymous, createAuthMiddleware } from 'better-auth/plugins';
import { UserManagementPluginManager } from '~/lib/plugins/user-management/user-management-plugin-manager';

const { BASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = env.server;
const { NEXT_PUBLIC_USE_GOOGLE_AUTH } = env.client;

// Validate Google OAuth configuration when enabled
if (NEXT_PUBLIC_USE_GOOGLE_AUTH) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error(
      'Google OAuth is enabled but required secrets are missing. ' +
        'Please ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are properly configured.',
    );
  }
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  plugins: [anonymous()],
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: GOOGLE_CLIENT_ID!,
      clientSecret: GOOGLE_CLIENT_SECRET!,
      enabled: NEXT_PUBLIC_USE_GOOGLE_AUTH,
    },
  },
  baseURL: BASE_URL,
  trustedOrigins: [BASE_URL],
  advanced: {
    database: {
      generateId: false, // Assumes a database handles ID generation
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path.startsWith('/callback/') || ctx.path.startsWith('/sign-in/email')) {
        const newSession = ctx.context.newSession;

        if (!newSession?.user?.email) {
          throw new Error('Unable to complete signup: Missing user email');
        }

        const managementPlugin = await UserManagementPluginManager.getPlugin();

        try {
          await managementPlugin.createOrganizationFromEmail(newSession.user.email, newSession.user.id);
        } catch (error) {
          console.error('Organization setup failed:', error);
          throw new Error('Unable to complete signup: Failed to setup organization');
        }
      }
    }),
  },
});
