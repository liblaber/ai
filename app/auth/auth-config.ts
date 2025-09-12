import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { sso } from '@better-auth/sso';
import { prisma } from '~/lib/prisma';
import { env } from '~/env';
import { createAuthMiddleware } from 'better-auth/plugins';
import { userService } from '~/lib/services/userService';
import { inviteService } from '~/lib/services/inviteService';

const {
  BASE_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  LICENSE_KEY,
  OIDC_ISSUER,
  OIDC_CLIENT_ID,
  OIDC_CLIENT_SECRET,
  OIDC_DOMAIN,
  OIDC_PROVIDER_ID,
} = env.server;

// Determine which auth providers to enable based on license and configuration
const isPremiumLicense = LICENSE_KEY === 'premium';
const hasGoogleOAuth = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
const hasOIDCSSO = !!(OIDC_ISSUER && OIDC_CLIENT_ID && OIDC_CLIENT_SECRET && OIDC_DOMAIN && OIDC_PROVIDER_ID);

// Enable Google OAuth only for premium licenses with proper configuration
const enableGoogleAuth = isPremiumLicense && hasGoogleOAuth;

// Enable OIDC SSO when properly configured (regardless of license)
const enableOIDCSSO = hasOIDCSSO;

// Enable email/password auth for anonymous user (free licenses or fallback)
// Always enable email/password as a fallback option
const enableEmailPassword = true;

// Validate configuration
if (isPremiumLicense && !hasGoogleOAuth && !hasOIDCSSO) {
  console.warn(
    'Premium license detected but neither Google OAuth nor OIDC SSO configured. Email/password auth will be used as fallback.',
  );
}

if (enableGoogleAuth && (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET)) {
  throw new Error(
    'Google OAuth is enabled but required secrets are missing. ' +
      'Please ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are properly configured.',
  );
}

if (enableOIDCSSO && (!OIDC_ISSUER || !OIDC_CLIENT_ID || !OIDC_CLIENT_SECRET || !OIDC_DOMAIN || !OIDC_PROVIDER_ID)) {
  throw new Error(
    'OIDC SSO is enabled but required configuration is missing. ' +
      'Please ensure OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_DOMAIN, and OIDC_PROVIDER_ID are properly configured.',
  );
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  plugins: [
    // Add SSO plugin for OIDC support
    ...(enableOIDCSSO
      ? [
          sso({
            provisionUser: async ({ user }) => {
              // Provision user when they sign in with SSO

              const { email } = user;

              if (!email) {
                return;
              }

              // Skip anonymous users — we only want to grant system admin to the first
              // non-anonymous user.
              if (user.isAnonymous) {
                return;
              }

              await grantSystemAdminAccess(user.id).catch();

              // Check for pending invites and auto-accept them
              try {
                const pendingInvite = await inviteService.getInviteByEmail(email);

                if (pendingInvite) {
                  await inviteService.acceptInvite(pendingInvite.id, user.id);
                }
              } catch {
                // Don't fail the auth flow if invite acceptance fails
              }
            },
          }),
        ]
      : []),
  ],
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
      if (ctx.path.endsWith('callback/liblab')) {
        return;
      }

      // Handle OAuth/SSO callbacks (Google OAuth or OIDC SSO)
      if (ctx.path.startsWith('/callback/')) {
        const newSession = ctx.context.newSession;

        if (!newSession?.user?.email) {
          throw new Error('Unable to complete OAuth/SSO signup: Missing user email');
        }
      }

      // Handle SSO callbacks
      if (ctx.path.startsWith('/sso/callback/')) {
        const newSession = ctx.context.newSession;

        if (!newSession?.user?.email) {
          throw new Error('Unable to complete SSO signup: Missing user email');
        }
      }

      // Email/password authentication is handled automatically by Better Auth

      const newSession = ctx.context.newSession;
      const email = newSession?.user?.email as string | undefined;

      if (!email) {
        return;
      }

      const createdUser = await prisma.user.findUnique({ where: { email } });

      if (!createdUser) {
        return;
      }

      // Skip anonymous users — we only want to grant system admin to the first
      // non-anonymous user.
      if (createdUser.isAnonymous) {
        return;
      }

      await grantSystemAdminAccess(createdUser.id);

      // Check for pending invites and auto-accept them
      try {
        const pendingInvite = await inviteService.getInviteByEmail(email);

        if (pendingInvite) {
          await inviteService.acceptInvite(pendingInvite.id, createdUser.id);
        }
      } catch {
        // Don't fail the auth flow if invite acceptance fails
      }
    }),
  },
});

async function grantSystemAdminAccess(userId: string) {
  // Check and potentially grant first-user system admin access

  // Use a transaction to serialize the check; attempt an advisory lock but
  // don't fail the whole flow if the DB doesn't support it or permissions
  // prevent it. We also treat `isAnonymous = null` as a non-anonymous user
  // (OAuth users), matching `userService.isFirstPremiumUser` behavior.
  await prisma.$transaction(async (tx) => {
    try {
      // Arbitrary 64-bit integer key. Keep constant across deployments.
      // Using pg_advisory_xact_lock ensures the lock is held for the duration
      // of the current transaction only.
      await tx.$executeRaw`select pg_advisory_xact_lock(${BigInt(424242424242)})`;
    } catch {
      // Advisory locks aren't supported or allowed in some DB setups;
      // continue without the lock so the signup flow doesn't break.
    }

    const nonAnonymousCount = await tx.user.count({
      where: {
        OR: [{ isAnonymous: false }, { isAnonymous: null }],
      },
    });

    // If there's exactly one non-anonymous user after this signup, it's the
    // newly created user — grant system admin access.
    if (nonAnonymousCount === 1) {
      await userService.grantSystemAdminAccess(userId);
    }
  });
}
