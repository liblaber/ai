import { NextRequest, NextResponse } from 'next/server';
import { createScopedLogger } from '~/utils/logger';
import { z } from 'zod';
import { prisma } from '~/lib/prisma';

const logger = createScopedLogger('save-google-oauth');

const SAVE_GOOGLE_OAUTH_SCHEMA = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client Secret is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = SAVE_GOOGLE_OAUTH_SCHEMA.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid request format: ${validationResult.error.errors.map((e) => e.message).join(', ')}`,
        },
        { status: 400 },
      );
    }

    const { clientId, clientSecret } = validationResult.data;

    logger.info('Saving Google OAuth credentials for Client ID:', clientId);

    // Find existing onboarding progress or create new one
    let progress = await prisma.onboardingProgress.findFirst({
      where: { userId: null }, // For initial setup
      orderBy: { updatedAt: 'desc' },
    });

    const googleOAuthConfig = {
      clientId,
      clientSecret,
    };

    if (progress) {
      // Update existing progress
      progress = await prisma.onboardingProgress.update({
        where: { id: progress.id },
        data: {
          googleOAuthConfig: googleOAuthConfig as any,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new progress
      progress = await prisma.onboardingProgress.create({
        data: {
          googleOAuthConfig: googleOAuthConfig as any,
          currentStep: 'auth-config',
        },
      });
    }

    logger.info('Google OAuth credentials saved successfully');

    return NextResponse.json({
      success: true,
      message: 'Google OAuth credentials saved successfully',
    });
  } catch (error) {
    logger.error('Error saving Google OAuth credentials:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while saving credentials.' },
      { status: 500 },
    );
  }
}
