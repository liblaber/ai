import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '~/lib/prisma';
import { createScopedLogger } from '~/utils/logger';
import {
  type OnboardingStepResponse,
  type OnboardingSuccessResponse,
  type OnboardingErrorResponse,
  LLM_STEP_REQUEST_SCHEMA,
} from '~/types/onboarding';

const logger = createScopedLogger('onboarding-llm-api');

export async function POST(request: NextRequest): Promise<NextResponse<OnboardingStepResponse>> {
  try {
    const body = await request.json();

    // Debug logging
    logger.info('Received LLM step request:', JSON.stringify(body, null, 2));

    // Validate request body structure using Zod
    const validationResult = LLM_STEP_REQUEST_SCHEMA.safeParse(body);

    if (!validationResult.success) {
      logger.error('Validation failed:', validationResult.error.errors);

      const errorResponse: OnboardingErrorResponse = {
        success: false,
        error: `Invalid request format: ${validationResult.error.errors.map((e) => e.message).join(', ')}`,
      };

      return NextResponse.json(errorResponse, { status: 400 });
    }

    const { llmConfig } = validationResult.data;

    // Check if onboarding progress already exists
    let progress = await prisma.onboardingProgress.findFirst({
      where: { userId: null }, // For initial setup, userId is null
    });

    if (progress) {
      // Update existing progress
      progress = await prisma.onboardingProgress.update({
        where: { id: progress.id },
        data: {
          llmConfig: llmConfig as any,
          currentStep: 'datasource',
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new progress
      progress = await prisma.onboardingProgress.create({
        data: {
          llmConfig: llmConfig as any,
          currentStep: 'datasource',
        },
      });
    }

    const successResponse: OnboardingSuccessResponse = {
      success: true,
      message: 'LLM configuration saved successfully',
      currentStep: 'datasource',
    };

    logger.info('LLM step completed successfully');

    return NextResponse.json(successResponse);
  } catch (error) {
    logger.error('Error in LLM step:', error);

    const errorResponse: OnboardingErrorResponse = {
      success: false,
      error: 'Failed to save LLM configuration',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse<OnboardingStepResponse>> {
  try {
    // Get current LLM step progress
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
      message: 'LLM step progress retrieved',
      currentStep: progress.currentStep as any,
    };

    return NextResponse.json(successResponse);
  } catch (error) {
    logger.error('Error retrieving LLM step:', error);

    const errorResponse: OnboardingErrorResponse = {
      success: false,
      error: 'Failed to retrieve LLM step progress',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
