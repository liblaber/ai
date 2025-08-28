import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '~/lib/prisma';
import { env } from '~/env';
import { createAuthMiddleware } from 'better-auth/plugins';
import { userService } from '~/lib/services/userService';

const { BASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, LICENSE_KEY } = env.server;

// Determine which auth providers to enable based on license and configuration
const isPremiumLicense = LICENSE_KEY === 'premium';
const hasGoogleOAuth = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);

// Enable Google OAuth only for premium licenses with proper configuration
const enableGoogleAuth = isPremiumLicense && hasGoogleOAuth;

// Enable email/password auth for anonymous user (free licenses or fallback)
const enableEmailPassword = !isPremiumLicense || !hasGoogleOAuth;

// Validate configuration
if (isPremiumLicense && !hasGoogleOAuth) {
  console.warn(
    'Premium license detected but Google OAuth not configured. Email/password auth will be enabled for anonymous user.',
  );
}

if (enableGoogleAuth && (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET)) {
  throw new Error(
    'Google OAuth is enabled but required secrets are missing. ' +
      'Please ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are properly configured.',
  );
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  plugins: [], // No anonymous plugin - we'll use email/password for the anonymous user
  emailAndPassword: {
    enabled: enableEmailPassword, // Enable email/password auth for anonymous user
  },
  socialProviders: {
    google: {
      clientId: GOOGLE_CLIENT_ID!,
      clientSecret: GOOGLE_CLIENT_SECRET!,
      enabled: enableGoogleAuth,
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
      // Handle Google OAuth callbacks
      if (ctx.path.startsWith('/callback/')) {
        const newSession = ctx.context.newSession;

        if (!newSession?.user?.email) {
          throw new Error('Unable to complete Google OAuth signup: Missing user email');
        }
      }

      // Handle email/password signups (only for free licenses or fallback)
      if (ctx.path.startsWith('/sign-in/email') && enableEmailPassword) {
        const newSession = ctx.context.newSession;

        if (!newSession?.user?.email) {
          throw new Error('Unable to complete email signup: Missing user email');
        }
      }

      // After any signup that produced a new session with an email, check if this is the first premium user
      // and grant system admin access if so. We resolve the concrete user id from the database using email
      // to avoid assumptions about shape of newSession.user.
      const newSession = ctx.context.newSession;
      const email = newSession?.user?.email as string | undefined;

      if (email) {
        const createdUser = await prisma.user.findUnique({ where: { email } });

        if (createdUser) {
          const firstUser = await prisma.user.findFirst({
            where: { isAnonymous: { not: true } },
            orderBy: { createdAt: 'asc' },
          });

          if (firstUser && firstUser.id === createdUser.id) {
            await userService.grantSystemAdminAccess(createdUser.id);
            console.log(`🎉 First premium user ${email} granted system admin access`);
          }
        }
      }
    }),
  },
});
