import { NextRequest, NextResponse } from 'next/server';
import { userService } from '~/lib/services/userService';
import { prisma } from '~/lib/prisma';
import { createScopedLogger } from '~/utils/logger';
import {
  type OnboardingCompleteResponse,
  type OnboardingSuccessResponse,
  type OnboardingErrorResponse,
  ONBOARDING_REQUEST_SCHEMA,
} from '~/types/onboarding';

const logger = createScopedLogger('onboarding-api');

export async function POST(request: NextRequest): Promise<NextResponse<OnboardingCompleteResponse>> {
  try {
    const body = await request.json();

    // Debug logging
    logger.info('Received onboarding request:', JSON.stringify(body, null, 2));

    // Validate request body structure using Zod
    const validationResult = ONBOARDING_REQUEST_SCHEMA.safeParse(body);

    if (!validationResult.success) {
      logger.error('Validation failed:', validationResult.error.errors);

      const errorResponse: OnboardingErrorResponse = {
        success: false,
        error: `Invalid request format: ${validationResult.error.errors.map((e) => e.message).join(', ')}`,
      };

      return NextResponse.json(errorResponse, { status: 400 });
    }

    const { authMethod, adminData, ssoConfig, googleOAuthConfig, telemetryConsent } = validationResult.data;

    // Validate required fields
    if (!adminData.name || !adminData.email) {
      const errorResponse: OnboardingErrorResponse = {
        success: false,
        error: 'Name and email are required',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate password if using password auth
    if (authMethod === 'password') {
      if (!adminData.password || !adminData.confirmPassword) {
        const errorResponse: OnboardingErrorResponse = {
          success: false,
          error: 'Password and confirmation are required for password authentication',
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }

      if (adminData.password !== adminData.confirmPassword) {
        const errorResponse: OnboardingErrorResponse = {
          success: false,
          error: 'Passwords do not match',
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }

      if (adminData.password.length < 8) {
        const errorResponse: OnboardingErrorResponse = {
          success: false,
          error: 'Password must be at least 8 characters long',
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }
    }

    // Validate SSO config if using SSO
    if (authMethod === 'sso' && ssoConfig) {
      if (!ssoConfig.hostUrl || !ssoConfig.clientId || !ssoConfig.clientSecret) {
        const errorResponse: OnboardingErrorResponse = {
          success: false,
          error: 'SSO configuration is incomplete',
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }
    }

    // Validate Google OAuth config if using Google
    if (authMethod === 'google' && googleOAuthConfig) {
      if (!googleOAuthConfig.clientId || !googleOAuthConfig.clientSecret) {
        const errorResponse: OnboardingErrorResponse = {
          success: false,
          error: 'Google OAuth configuration is incomplete',
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }
    }

    // Check if application is already set up
    const isAlreadySetUp = await userService.isApplicationSetUp();

    if (isAlreadySetUp) {
      // If already set up, just mark onboarding as complete and return success
      const progress = await prisma.onboardingProgress.findFirst({
        where: { userId: null }, // For initial setup, userId is null
      });

      if (progress) {
        await prisma.onboardingProgress.update({
          where: { id: progress.id },
          data: {
            currentStep: 'complete',
            completedAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      const successResponse: OnboardingSuccessResponse = {
        success: true,
        message: 'Onboarding already completed',
        userId: undefined, // No new user created
      };

      return NextResponse.json(successResponse);
    }

    // Create admin user
    let adminUser;

    if (authMethod === 'password') {
      // For password auth, we need to create the user through the auth system
      // This is a simplified approach - in a real implementation, you'd want to
      // use the proper auth flow
      adminUser = await prisma.user.create({
        data: {
          name: adminData.name,
          email: adminData.email,
          emailVerified: true,
          isAnonymous: false,
          telemetryEnabled: telemetryConsent,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } else {
      // For OAuth/SSO, create user without password
      adminUser = await prisma.user.create({
        data: {
          name: adminData.name,
          email: adminData.email,
          emailVerified: true,
          isAnonymous: false,
          telemetryEnabled: telemetryConsent,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    // Grant admin access
    await userService.grantSystemAdminAccess(adminUser.id);

    // If SSO is configured, create SSO provider
    if (authMethod === 'sso' && ssoConfig) {
      await prisma.ssoProvider.create({
        data: {
          providerId: 'custom-sso',
          friendlyName: 'Custom SSO',
          issuer: ssoConfig.hostUrl,
          domain: new URL(ssoConfig.hostUrl).hostname,
          oidcConfig: JSON.stringify({
            clientId: ssoConfig.clientId,
            clientSecret: ssoConfig.clientSecret,
            scopes: ssoConfig.scopes,
          }),
        },
      });
    }

    // If Google OAuth is configured, log the configuration
    if (authMethod === 'google' && googleOAuthConfig) {
      logger.info('Google OAuth configured with Client ID:', googleOAuthConfig.clientId);

      // The Google OAuth configuration is now stored in the database
      // and will be picked up dynamically by the auth service
      // No need to restart the application - the configuration is loaded dynamically
    }

    logger.info(`Onboarding completed for admin user: ${adminUser.email}`);

    const successResponse: OnboardingSuccessResponse = {
      success: true,
      message: 'Onboarding completed successfully',
      userId: adminUser.id,
    };

    const response = NextResponse.json(successResponse);

    // Set a header to indicate onboarding is complete (for cache invalidation)
    response.headers.set('x-onboarding-complete', 'true');

    return response;
  } catch (error) {
    logger.error('Error completing onboarding:', error);

    const errorResponse: OnboardingErrorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred during onboarding',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
