import { NextResponse } from 'next/server';
import { userService } from '~/lib/services/userService';
import { createScopedLogger } from '~/utils/logger';
import type { OnboardingStatusResponse } from '~/types/onboarding';
import { ONBOARDING_STATUS_RESPONSE_SCHEMA } from '~/types/onboarding';

const logger = createScopedLogger('onboarding-status-api');

export async function GET(): Promise<NextResponse<OnboardingStatusResponse>> {
  try {
    const isSetUp = await userService.isApplicationSetUp();

    const response: OnboardingStatusResponse = {
      isSetUp,
    };

    // Validate response structure
    const validationResult = ONBOARDING_STATUS_RESPONSE_SCHEMA.safeParse(response);

    if (!validationResult.success) {
      logger.error('Invalid response structure:', validationResult.error);
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error checking onboarding status:', error);

    const errorResponse: OnboardingStatusResponse = {
      error: 'Failed to check onboarding status',
      isSetUp: false,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
