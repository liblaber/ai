import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '~/lib/prisma';
import '~/lib/config/env';
import { anonymous, createAuthMiddleware } from 'better-auth/plugins';
import { UserManagementPluginManager } from '~/lib/plugins/user-management/user-management-plugin-manager';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'sqlite',
  }),
  plugins: [anonymous()],
  emailAndPassword: {
    enabled: true,
  },
  baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
  trustedOrigins: [(process.env.BASE_URL as string) ?? 'http://localhost:3000'],
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
