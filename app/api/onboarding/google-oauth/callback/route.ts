import { NextRequest, NextResponse } from 'next/server';
import { createScopedLogger } from '~/utils/logger';
import { GoogleAuthService } from '~/lib/services/googleAuthService';

const logger = createScopedLogger('onboarding-google-oauth-callback');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      logger.error('Google OAuth error:', error);
      return NextResponse.redirect(`/onboarding?error=${encodeURIComponent(`Google OAuth error: ${error}`)}`);
    }

    if (!code || !state) {
      logger.error('Missing code or state parameter');
      return NextResponse.redirect('/onboarding?error=' + encodeURIComponent('Invalid OAuth response'));
    }

    // Decode the callback URL from state
    const callbackURL = decodeURIComponent(state);

    // Get Google OAuth configuration
    const googleConfig = await GoogleAuthService.getGoogleOAuthConfig();

    if (!googleConfig.enabled || !googleConfig.clientId || !googleConfig.clientSecret) {
      logger.error('Google OAuth is not configured');
      return NextResponse.redirect('/onboarding?error=' + encodeURIComponent('Google OAuth is not configured'));
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: googleConfig.clientId,
        client_secret: googleConfig.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.BASE_URL}/api/auth/callback/google`,
      }),
    });

    const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string };

    if (!tokenResponse.ok || tokenData.error) {
      logger.error('Failed to exchange code for token:', tokenData);
      return NextResponse.redirect('/onboarding?error=' + encodeURIComponent('Failed to authenticate with Google'));
    }

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = (await userResponse.json()) as {
      id?: string;
      name?: string;
      email?: string;
      picture?: string;
      error?: string;
    };

    if (!userResponse.ok || userData.error) {
      logger.error('Failed to get user info:', userData);
      return NextResponse.redirect(
        '/onboarding?error=' + encodeURIComponent('Failed to get user information from Google'),
      );
    }

    logger.info('Google OAuth successful for user:', userData.email);

    // Store the user data in the onboarding progress
    await storeGoogleUserData(userData);

    // Redirect back to the onboarding page with the user data
    const redirectUrl = new URL(callbackURL, process.env.BASE_URL);
    redirectUrl.searchParams.set(
      'googleUser',
      JSON.stringify({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
      }),
    );

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    logger.error('Error in Google OAuth callback:', error);
    return NextResponse.redirect(
      '/onboarding?error=' + encodeURIComponent('An unexpected error occurred during Google authentication'),
    );
  }
}

async function storeGoogleUserData(userData: any) {
  try {
    const { prisma } = await import('~/lib/prisma');

    // Find existing onboarding progress
    const progress = await prisma.onboardingProgress.findFirst({
      where: { userId: null },
      orderBy: { updatedAt: 'desc' },
    });

    const googleUserData = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      picture: userData.picture,
    };

    if (progress) {
      // Update existing progress
      await prisma.onboardingProgress.update({
        where: { id: progress.id },
        data: {
          adminData: {
            ...((progress.adminData as any) || {}),
            googleUser: googleUserData,
          } as any,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new progress
      await prisma.onboardingProgress.create({
        data: {
          adminData: {
            googleUser: googleUserData,
          } as any,
          currentStep: 'auth-config',
        },
      });
    }
  } catch (error) {
    logger.error('Error storing Google user data:', error);
  }
}
