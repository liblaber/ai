import { prisma } from '~/lib/prisma';
import { env } from '~/env';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('google-auth-service');

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  enabled: boolean;
}

export class GoogleAuthService {
  /**
   * Get Google OAuth configuration, checking environment variables first,
   * then falling back to onboarding credentials
   */
  static async getGoogleOAuthConfig(): Promise<GoogleOAuthConfig> {
    // First, check environment variables
    const envClientId = env.server.GOOGLE_CLIENT_ID;
    const envClientSecret = env.server.GOOGLE_CLIENT_SECRET;
    const isPremiumLicense = env.server.LICENSE_KEY === 'premium';

    if (envClientId && envClientSecret && isPremiumLicense) {
      logger.info('Using Google OAuth credentials from environment variables');
      return {
        clientId: envClientId,
        clientSecret: envClientSecret,
        enabled: true,
      };
    }

    // If no env vars, check onboarding credentials
    try {
      const onboardingProgress = await prisma.onboardingProgress.findFirst({
        where: {
          userId: null, // For initial setup
          googleOAuthConfig: { not: null as any },
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (onboardingProgress?.googleOAuthConfig) {
        const config = onboardingProgress.googleOAuthConfig as any;

        if (config.clientId && config.clientSecret) {
          logger.info('Using Google OAuth credentials from onboarding configuration');
          return {
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            enabled: true,
          };
        }
      }
    } catch (error) {
      logger.error('Error retrieving onboarding Google OAuth config:', error);
    }

    // No valid configuration found
    logger.info('No Google OAuth configuration found');

    return {
      clientId: '',
      clientSecret: '',
      enabled: false,
    };
  }

  /**
   * Check if Google OAuth is available (either from env or onboarding)
   */
  static async isGoogleOAuthAvailable(): Promise<boolean> {
    const config = await this.getGoogleOAuthConfig();
    return config.enabled && !!config.clientId && !!config.clientSecret;
  }

  /**
   * Get the source of the Google OAuth configuration
   */
  static async getConfigSource(): Promise<'environment' | 'onboarding' | 'none'> {
    const envClientId = env.server.GOOGLE_CLIENT_ID;
    const envClientSecret = env.server.GOOGLE_CLIENT_SECRET;
    const isPremiumLicense = env.server.LICENSE_KEY === 'premium';

    if (envClientId && envClientSecret && isPremiumLicense) {
      return 'environment';
    }

    try {
      const onboardingProgress = await prisma.onboardingProgress.findFirst({
        where: {
          userId: null,
          googleOAuthConfig: { not: null as any },
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (onboardingProgress?.googleOAuthConfig) {
        const config = onboardingProgress.googleOAuthConfig as any;

        if (config.clientId && config.clientSecret) {
          return 'onboarding';
        }
      }
    } catch (error) {
      logger.error('Error checking onboarding config source:', error);
    }

    return 'none';
  }

  /**
   * Update environment variables with onboarding credentials
   * Note: This is a placeholder for future implementation
   * In production, you'd want to securely update environment variables
   */
  static async updateEnvironmentWithOnboardingCredentials(): Promise<void> {
    const config = await this.getGoogleOAuthConfig();

    if (config.enabled && config.clientId && config.clientSecret) {
      logger.info('Google OAuth credentials are available for environment update');
      // TODO: Implement secure environment variable update
      // This could involve:
      // 1. Updating a secrets management system
      // 2. Restarting the application
      // 3. Or dynamically reloading the auth configuration
    }
  }
}
