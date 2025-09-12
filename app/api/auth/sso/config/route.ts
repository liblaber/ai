import { NextResponse } from 'next/server';
import { env } from '~/env/server';
import { createScopedLogger } from '~/utils/logger';
import { PrismaClient } from '@prisma/client';

const logger = createScopedLogger('sso-config');
const prisma = new PrismaClient();

export async function GET() {
  try {
    // Check if OIDC SSO environment variables are configured
    const hasOIDCIssuer = !!env.OIDC_ISSUER;
    const hasOIDCClientId = !!env.OIDC_CLIENT_ID;
    const hasOIDCClientSecret = !!env.OIDC_CLIENT_SECRET;
    const hasOIDCDomain = !!env.OIDC_DOMAIN;
    const hasOIDCProviderId = !!env.OIDC_PROVIDER_ID;

    const oidcConfigured =
      hasOIDCIssuer && hasOIDCClientId && hasOIDCClientSecret && hasOIDCDomain && hasOIDCProviderId;

    // Check if Google OAuth is configured
    const hasGoogleClientId = !!env.GOOGLE_CLIENT_ID;
    const hasGoogleClientSecret = !!env.GOOGLE_CLIENT_SECRET;
    const googleConfigured = hasGoogleClientId && hasGoogleClientSecret;

    const configured = oidcConfigured || googleConfigured;

    // Get OIDC provider friendly name from database
    let oidcFriendlyName = 'Continue with SSO';

    if (oidcConfigured && env.OIDC_PROVIDER_ID) {
      try {
        const oidcProvider = await prisma.ssoProvider.findUnique({
          where: { providerId: env.OIDC_PROVIDER_ID },
          select: { friendlyName: true } as any,
        });

        if (oidcProvider?.friendlyName) {
          oidcFriendlyName = (oidcProvider as any).friendlyName;
        }
      } catch (error) {
        logger.warn('Failed to fetch OIDC provider friendly name:', error);
      }
    }

    return NextResponse.json({
      success: true,
      configured,
      providers: {
        oidc: {
          configured: oidcConfigured,
          friendlyName: oidcFriendlyName,
          providerId: env.OIDC_PROVIDER_ID,
          missing: {
            ...(!hasOIDCIssuer && { OIDC_ISSUER: 'OIDC Issuer URL is required' }),
            ...(!hasOIDCClientId && { OIDC_CLIENT_ID: 'OIDC Client ID is required' }),
            ...(!hasOIDCClientSecret && { OIDC_CLIENT_SECRET: 'OIDC Client Secret is required' }),
            ...(!hasOIDCDomain && { OIDC_DOMAIN: 'OIDC Domain is required' }),
            ...(!hasOIDCProviderId && { OIDC_PROVIDER_ID: 'OIDC Provider ID is required' }),
          },
        },
        google: {
          configured: googleConfigured,
          missing: {
            ...(!hasGoogleClientId && { GOOGLE_CLIENT_ID: 'Google OAuth Client ID is required' }),
            ...(!hasGoogleClientSecret && { GOOGLE_CLIENT_SECRET: 'Google OAuth Client Secret is required' }),
          },
        },
      },
    });
  } catch (error) {
    logger.error('SSO config check error:', error);
    return NextResponse.json(
      {
        success: false,
        configured: false,
        error: 'Failed to check SSO configuration',
      },
      { status: 500 },
    );
  }
}
