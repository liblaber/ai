import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '~/lib/prisma';
import { createScopedLogger } from '~/utils/logger';
import {
  type OnboardingStepResponse,
  type OnboardingSuccessResponse,
  type OnboardingErrorResponse,
  AUTH_STEP_REQUEST_SCHEMA,
} from '~/types/onboarding';

const logger = createScopedLogger('onboarding-auth-api');

export async function POST(request: NextRequest): Promise<NextResponse<OnboardingStepResponse>> {
  try {
    const body = await request.json();

    // Debug logging
    logger.info('Received auth step request:', JSON.stringify(body, null, 2));

    // Validate request body structure using Zod
    const validationResult = AUTH_STEP_REQUEST_SCHEMA.safeParse(body);

    if (!validationResult.success) {
      logger.error('Validation failed:', validationResult.error.errors);

      const errorResponse: OnboardingErrorResponse = {
        success: false,
        error: `Invalid request format: ${validationResult.error.errors.map((e) => e.message).join(', ')}`,
      };

      return NextResponse.json(errorResponse, { status: 400 });
    }

    const { authMethod } = validationResult.data;

    // Check if onboarding progress already exists
    let progress = await prisma.onboardingProgress.findFirst({
      where: { userId: null }, // For initial setup, userId is null
    });

    if (progress) {
      // Update existing progress
      progress = await prisma.onboardingProgress.update({
        where: { id: progress.id },
        data: {
          authMethod,
          currentStep: 'auth-config',
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new progress
      progress = await prisma.onboardingProgress.create({
        data: {
          authMethod,
          currentStep: 'auth-config',
        },
      });
    }

    const successResponse: OnboardingSuccessResponse = {
      success: true,
      message: 'Authentication method saved successfully',
      currentStep: 'auth-config',
    };

    logger.info('Auth step completed successfully');

    return NextResponse.json(successResponse);
  } catch (error) {
    logger.error('Error in auth step:', error);

    const errorResponse: OnboardingErrorResponse = {
      success: false,
      error: 'Failed to save authentication method',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse<OnboardingStepResponse>> {
  try {
    // Get current auth step progress
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
      message: 'Auth step progress retrieved',
      currentStep: progress.currentStep as any,
    };

    return NextResponse.json(successResponse);
  } catch (error) {
    logger.error('Error retrieving auth step:', error);

    const errorResponse: OnboardingErrorResponse = {
      success: false,
      error: 'Failed to retrieve auth step progress',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
