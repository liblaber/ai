import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '~/lib/prisma';
import { createScopedLogger } from '~/utils/logger';
import {
  type OnboardingStepResponse,
  type OnboardingSuccessResponse,
  type OnboardingErrorResponse,
  USERS_STEP_REQUEST_SCHEMA,
} from '~/types/onboarding';

const logger = createScopedLogger('onboarding-users-api');

export async function POST(request: NextRequest): Promise<NextResponse<OnboardingStepResponse>> {
  try {
    const body = await request.json();

    // Debug logging
    logger.info('Received users step request:', JSON.stringify(body, null, 2));

    // Validate request body structure using Zod
    const validationResult = USERS_STEP_REQUEST_SCHEMA.safeParse(body);

    if (!validationResult.success) {
      logger.error('Validation failed:', validationResult.error.errors);

      const errorResponse: OnboardingErrorResponse = {
        success: false,
        error: `Invalid request format: ${validationResult.error.errors.map((e) => e.message).join(', ')}`,
      };

      return NextResponse.json(errorResponse, { status: 400 });
    }

    const { usersConfig } = validationResult.data;

    // Check if onboarding progress already exists
    let progress = await prisma.onboardingProgress.findFirst({
      where: { userId: null }, // For initial setup, userId is null
    });

    if (progress) {
      // Update existing progress
      progress = await prisma.onboardingProgress.update({
        where: { id: progress.id },
        data: {
          usersConfig: usersConfig as any,
          currentStep: 'complete',
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new progress
      progress = await prisma.onboardingProgress.create({
        data: {
          usersConfig: usersConfig as any,
          currentStep: 'complete',
        },
      });
    }

    const successResponse: OnboardingSuccessResponse = {
      success: true,
      message: 'Users configuration saved successfully',
      currentStep: 'complete',
    };

    logger.info('Users step completed successfully');

    return NextResponse.json(successResponse);
  } catch (error) {
    logger.error('Error in users step:', error);

    const errorResponse: OnboardingErrorResponse = {
      success: false,
      error: 'Failed to save users configuration',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse<OnboardingStepResponse>> {
  try {
    // Get current users step progress
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
      message: 'Users step progress retrieved',
      currentStep: progress.currentStep as any,
    };

    return NextResponse.json(successResponse);
  } catch (error) {
    logger.error('Error retrieving users step:', error);

    const errorResponse: OnboardingErrorResponse = {
      success: false,
      error: 'Failed to retrieve users step progress',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
