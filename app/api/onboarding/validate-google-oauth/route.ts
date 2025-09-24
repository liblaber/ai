import { NextRequest, NextResponse } from 'next/server';
import { createScopedLogger } from '~/utils/logger';
import { z } from 'zod';

const logger = createScopedLogger('google-oauth-validation');

/**
 * Google OAuth Credential Validation
 *
 * This endpoint validates Google OAuth credentials by hitting Google's token endpoint
 * with a dummy refresh token. Google checks client credentials first:
 *
 * - If client_id/secret are wrong → {"error":"invalid_client"} (HTTP 401)
 * - If client_id/secret are correct but refresh token is fake → {"error":"invalid_grant"} (HTTP 400)
 *
 * This is the simplest way to validate credentials without doing a full browser auth flow,
 * since Google doesn't support client_credentials grant for user-data APIs.
 */

const VALIDATE_GOOGLE_OAUTH_SCHEMA = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client Secret is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = VALIDATE_GOOGLE_OAUTH_SCHEMA.safeParse(body);

    if (!validationResult.success) {
      logger.error('Validation failed:', validationResult.error.errors);
      return NextResponse.json(
        {
          success: false,
          error: `Invalid request format: ${validationResult.error.errors.map((e) => e.message).join(', ')}`,
        },
        { status: 400 },
      );
    }

    const { clientId, clientSecret } = validationResult.data;

    logger.info('Validating Google OAuth credentials for Client ID:', clientId);

    // Test the credentials by making a request to Google's token endpoint
    // We'll use a fake refresh token to test if the credentials are valid
    // This will return an error, but the error type will tell us if the credentials are valid
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: 'THIS_IS_FAKE_REFRESH_TOKEN_FOR_VALIDATION',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const responseData = (await response.json()) as { error?: string; error_description?: string };

    // Check the response to determine if credentials are valid
    // According to Google's OAuth 2.0 spec:
    // - {"error":"invalid_client"} → credentials are invalid (HTTP 401)
    // - {"error":"invalid_grant"} → credentials are valid (HTTP 400)

    if (responseData.error === 'invalid_client') {
      // Client credentials are invalid
      return NextResponse.json({
        success: false,
        error: 'Invalid Google OAuth credentials. Please check your Client ID and Client Secret.',
        valid: false,
      });
    } else if (responseData.error === 'invalid_grant') {
      // Client credentials are valid, but refresh token is fake (expected)
      return NextResponse.json({
        success: true,
        message: 'Google OAuth credentials are valid',
        valid: true,
      });
    }

    // If we get here, we received an unexpected response
    // Log the response for debugging
    logger.warn('Unexpected Google OAuth response:', {
      status: response.status,
      error: responseData.error,
      error_description: responseData.error_description,
    });

    // Check if the client_id format is valid as a fallback
    if (!clientId.includes('.apps.googleusercontent.com')) {
      return NextResponse.json({
        success: false,
        error: 'Invalid Client ID format. It should end with .apps.googleusercontent.com',
        valid: false,
      });
    }

    // If format is correct but response is unexpected, provide a cautious response
    return NextResponse.json({
      success: false,
      error: `Unexpected response from Google OAuth: ${responseData.error || 'Unknown error'}. Please verify your credentials.`,
      valid: false,
    });
  } catch (error) {
    logger.error('Error validating Google OAuth credentials:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to validate Google OAuth credentials. Please check your internet connection and try again.',
        valid: false,
      },
      { status: 500 },
    );
  }
}
