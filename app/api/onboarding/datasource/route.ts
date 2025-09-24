import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '~/lib/prisma';
import { createScopedLogger } from '~/utils/logger';
import {
  type OnboardingStepResponse,
  type OnboardingSuccessResponse,
  type OnboardingErrorResponse,
  DATASOURCE_STEP_REQUEST_SCHEMA,
} from '~/types/onboarding';

const logger = createScopedLogger('onboarding-datasource-api');

export async function POST(request: NextRequest): Promise<NextResponse<OnboardingStepResponse>> {
  try {
    const body = await request.json();

    // Debug logging
    logger.info('Received datasource step request:', JSON.stringify(body, null, 2));

    // Validate request body structure using Zod
    const validationResult = DATASOURCE_STEP_REQUEST_SCHEMA.safeParse(body);

    if (!validationResult.success) {
      logger.error('Validation failed:', validationResult.error.errors);

      const errorResponse: OnboardingErrorResponse = {
        success: false,
        error: `Invalid request format: ${validationResult.error.errors.map((e) => e.message).join(', ')}`,
      };

      return NextResponse.json(errorResponse, { status: 400 });
    }

    const { datasourceConfig } = validationResult.data;

    // Check if onboarding progress already exists
    let progress = await prisma.onboardingProgress.findFirst({
      where: { userId: null }, // For initial setup, userId is null
    });

    if (progress) {
      // Update existing progress
      progress = await prisma.onboardingProgress.update({
        where: { id: progress.id },
        data: {
          datasourceConfig: datasourceConfig as any,
          currentStep: 'users',
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new progress
      progress = await prisma.onboardingProgress.create({
        data: {
          datasourceConfig: datasourceConfig as any,
          currentStep: 'users',
        },
      });
    }

    const successResponse: OnboardingSuccessResponse = {
      success: true,
      message: 'Data source configuration saved successfully',
      currentStep: 'users',
    };

    logger.info('Datasource step completed successfully');

    return NextResponse.json(successResponse);
  } catch (error) {
    logger.error('Error in datasource step:', error);

    const errorResponse: OnboardingErrorResponse = {
      success: false,
      error: 'Failed to save data source configuration',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse<OnboardingStepResponse>> {
  try {
    // Get current datasource step progress
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
      message: 'Datasource step progress retrieved',
      currentStep: progress.currentStep as any,
    };

    return NextResponse.json(successResponse);
  } catch (error) {
    logger.error('Error retrieving datasource step:', error);

    const errorResponse: OnboardingErrorResponse = {
      success: false,
      error: 'Failed to retrieve datasource step progress',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
