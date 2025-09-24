import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '~/lib/prisma';
import { createScopedLogger } from '~/utils/logger';
import {
  type OnboardingStepResponse,
  type OnboardingSuccessResponse,
  type OnboardingErrorResponse,
  AUTH_CONFIG_STEP_REQUEST_SCHEMA,
} from '~/types/onboarding';

const logger = createScopedLogger('onboarding-auth-config-api');

export async function POST(request: NextRequest): Promise<NextResponse<OnboardingStepResponse>> {
  try {
    const body = await request.json();

    // Debug logging
    logger.info('Received auth-config step request:', JSON.stringify(body, null, 2));

    // Validate request body structure using Zod
    const validationResult = AUTH_CONFIG_STEP_REQUEST_SCHEMA.safeParse(body);

    if (!validationResult.success) {
      logger.error('Validation failed:', validationResult.error.errors);

      const errorResponse: OnboardingErrorResponse = {
        success: false,
        error: `Invalid request format: ${validationResult.error.errors.map((e) => e.message).join(', ')}`,
      };

      return NextResponse.json(errorResponse, { status: 400 });
    }

    const { adminData, ssoConfig, googleOAuthConfig } = validationResult.data;

    // Validate password if using password auth
    if (adminData.password && adminData.confirmPassword) {
      if (adminData.password !== adminData.confirmPassword) {
        const errorResponse: OnboardingErrorResponse = {
          success: false,
          error: 'Passwords do not match',
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }
    }

    // Check if onboarding progress already exists
    let progress = await prisma.onboardingProgress.findFirst({
      where: { userId: null }, // For initial setup, userId is null
    });

    if (progress) {
      // Update existing progress
      progress = await prisma.onboardingProgress.update({
        where: { id: progress.id },
        data: {
          adminData: adminData as any,
          ssoConfig: ssoConfig as any,
          googleOAuthConfig: googleOAuthConfig as any,
          currentStep: 'complete',
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new progress
      progress = await prisma.onboardingProgress.create({
        data: {
          adminData: adminData as any,
          ssoConfig: ssoConfig as any,
          googleOAuthConfig: googleOAuthConfig as any,
          currentStep: 'complete',
        },
      });
    }

    const successResponse: OnboardingSuccessResponse = {
      success: true,
      message: 'Authentication configuration saved successfully',
      currentStep: 'complete',
    };

    logger.info('Auth-config step completed successfully');

    return NextResponse.json(successResponse);
  } catch (error) {
    logger.error('Error in auth-config step:', error);

    const errorResponse: OnboardingErrorResponse = {
      success: false,
      error: 'Failed to save authentication configuration',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse<OnboardingStepResponse>> {
  try {
    // Get current auth-config step progress
    const progress = await prisma.onboardingProgress.findFirst({
      where: { userId: null },
    });

    if (!progress) {
      const errorResponse: OnboardingErrorResponse = {
        success: false,
        error: 'No onboarding progress found',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    const successResponse: OnboardingSuccessResponse = {
      success: true,
      message: 'Auth-config step progress retrieved',
      currentStep: progress.currentStep as any,
    };

    return NextResponse.json(successResponse);
  } catch (error) {
    logger.error('Error retrieving auth-config step:', error);

    const errorResponse: OnboardingErrorResponse = {
      success: false,
      error: 'Failed to retrieve auth-config step progress',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
