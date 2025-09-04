import { OAuth2Client } from 'google-auth-library';
import { GoogleAuth, JWT } from 'google-auth-library';
import crypto from 'crypto';
import { env } from '~/env';
import { type GoogleWorkspaceConfig, type GoogleCredentials, GoogleAuthError, GOOGLE_WORKSPACE_SCOPES } from './types';

export class GoogleWorkspaceAuthManager {
  private _oauth2Client: OAuth2Client | null = null;
  private _serviceAuth: GoogleAuth | null = null;
  private _config: GoogleWorkspaceConfig | null = null;
  private _encryptionKey: string;

  constructor(encryptionKey?: string) {
    // Use provided key or fail if not available in production
    if (encryptionKey) {
      this._encryptionKey = encryptionKey;
    } else if (env.server.GOOGLE_AUTH_ENCRYPTION_KEY) {
      this._encryptionKey = env.server.GOOGLE_AUTH_ENCRYPTION_KEY;
    } else {
      // In production, this should fail - never generate a key
      if (env.server.NODE_ENV === 'production') {
        throw new Error('GOOGLE_AUTH_ENCRYPTION_KEY is required in production environment');
      }

      // Only allow key generation in development
      console.warn(
        'WARNING: Generating encryption key for development only. Set GOOGLE_AUTH_ENCRYPTION_KEY in production.',
      );
      this._encryptionKey = this._generateEncryptionKey();
    }
  }

  /**
   * Initialize authentication with the provided configuration
   */
  async initialize(config: GoogleWorkspaceConfig): Promise<void> {
    this._config = config;

    switch (config.type) {
      case 'oauth2':
        await this._initializeOAuth2(config);
        break;
      case 'service-account':
        await this._initializeServiceAccount(config);
        break;
      case 'api-key':
        // API keys don't require initialization
        break;
      default:
        throw new GoogleAuthError(`Unsupported authentication type: ${config.type}`);
    }
  }

  /**
   * Initialize OAuth 2.0 authentication
   */
  private async _initializeOAuth2(config: GoogleWorkspaceConfig): Promise<void> {
    if (!config.clientId || !config.clientSecret) {
      throw new GoogleAuthError('OAuth 2.0 requires clientId and clientSecret');
    }

    this._oauth2Client = new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri);

    // Set credentials if available
    if (config.credentials) {
      this._oauth2Client.setCredentials(config.credentials);
    }
  }

  /**
   * Initialize Service Account authentication
   */
  private async _initializeServiceAccount(config: GoogleWorkspaceConfig): Promise<void> {
    if (!config.serviceAccountPath) {
      throw new GoogleAuthError('Service account requires serviceAccountPath');
    }

    this._serviceAuth = new GoogleAuth({
      keyFilename: config.serviceAccountPath,
      scopes: config.scopes,
    });
  }

  /**
   * Generate OAuth 2.0 authorization URL
   */
  generateAuthUrl(scopes: string[], state?: string): string {
    if (!this._oauth2Client) {
      throw new GoogleAuthError('OAuth 2.0 client not initialized');
    }

    const authUrl = this._oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state,
      prompt: 'consent', // Force consent screen to get refresh token
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<GoogleCredentials> {
    if (!this._oauth2Client) {
      throw new GoogleAuthError('OAuth 2.0 client not initialized');
    }

    try {
      const { tokens } = await this._oauth2Client.getToken(code);

      const credentials: GoogleCredentials = {
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token!,
        expiry_date: tokens.expiry_date!,
        token_type: tokens.token_type || undefined,
        scope: tokens.scope || undefined,
      };

      // Store credentials in OAuth client
      this._oauth2Client.setCredentials(tokens);

      return credentials;
    } catch (error) {
      throw new GoogleAuthError(
        `Failed to exchange code for tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TOKEN_EXCHANGE_FAILED',
      );
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(): Promise<GoogleCredentials> {
    if (!this._oauth2Client) {
      throw new GoogleAuthError('OAuth 2.0 client not initialized');
    }

    try {
      const { credentials } = await this._oauth2Client.refreshAccessToken();

      const refreshedCredentials: GoogleCredentials = {
        access_token: credentials.access_token!,
        refresh_token: credentials.refresh_token!,
        expiry_date: credentials.expiry_date!,
        token_type: credentials.token_type || undefined,
        scope: credentials.scope || undefined,
      };

      return refreshedCredentials;
    } catch (error) {
      throw new GoogleAuthError(
        `Failed to refresh tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TOKEN_REFRESH_FAILED',
      );
    }
  }

  /**
   * Check if current tokens are valid and not expired
   */
  isTokenValid(): boolean {
    if (!this._oauth2Client) {
      return false;
    }

    const credentials = this._oauth2Client.credentials;

    if (!credentials.access_token || !credentials.expiry_date) {
      return false;
    }

    // Check if token expires within the next 10 minutes (longer buffer for better UX)
    const now = Date.now();
    const expiry = credentials.expiry_date;
    const bufferTime = 10 * 60 * 1000; // 10 minutes in milliseconds

    return expiry > now + bufferTime;
  }

  /**
   * Ensure valid authentication (refresh if needed)
   */
  async ensureValidAuth(): Promise<void> {
    if (this._config?.type === 'oauth2' && !this.isTokenValid()) {
      const refreshedCredentials = await this.refreshTokens();

      // Update the oauth client with refreshed credentials
      if (this._oauth2Client) {
        this._oauth2Client.setCredentials({
          access_token: refreshedCredentials.access_token,
          refresh_token: refreshedCredentials.refresh_token,
          expiry_date: refreshedCredentials.expiry_date,
          token_type: refreshedCredentials.token_type,
          scope: refreshedCredentials.scope,
        });
      }
    }
  }

  /**
   * Check if token needs proactive refresh (within 20 minutes of expiry)
   */
  needsProactiveRefresh(): boolean {
    if (!this._oauth2Client) {
      return false;
    }

    const credentials = this._oauth2Client.credentials;

    if (!credentials.access_token || !credentials.expiry_date) {
      return false;
    }

    const now = Date.now();
    const expiry = credentials.expiry_date;
    const proactiveRefreshTime = 20 * 60 * 1000; // 20 minutes

    return expiry <= now + proactiveRefreshTime && Boolean(credentials.refresh_token);
  }

  /**
   * Get authenticated client for API requests
   */
  async getAuthenticatedClient(): Promise<OAuth2Client | JWT> {
    await this.ensureValidAuth();

    if (this._oauth2Client) {
      return this._oauth2Client;
    }

    if (this._serviceAuth) {
      return (await this._serviceAuth.getClient()) as JWT;
    }

    throw new GoogleAuthError('No authenticated client available');
  }

  /**
   * Get API key (for API key authentication)
   */
  getApiKey(): string {
    if (this._config?.type !== 'api-key' || !this._config.apiKey) {
      throw new GoogleAuthError('API key not configured');
    }

    return this._config.apiKey;
  }

  /**
   * Revoke authentication tokens
   */
  async revokeTokens(): Promise<void> {
    if (!this._oauth2Client) {
      throw new GoogleAuthError('OAuth 2.0 client not initialized');
    }

    try {
      await this._oauth2Client.revokeCredentials();
    } catch (error) {
      throw new GoogleAuthError(
        `Failed to revoke tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TOKEN_REVOKE_FAILED',
      );
    }
  }

  /**
   * Encrypt credentials for storage
   */
  encryptCredentials(credentials: GoogleCredentials): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', crypto.scryptSync(this._encryptionKey, 'salt', 32), iv);
    let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt credentials from storage
   */
  decryptCredentials(encryptedCredentials: string): GoogleCredentials {
    try {
      const [ivHex, encryptedData] = encryptedCredentials.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', crypto.scryptSync(this._encryptionKey, 'salt', 32), iv);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted) as GoogleCredentials;
    } catch (error) {
      throw new GoogleAuthError(
        `Failed to decrypt credentials: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DECRYPTION_FAILED',
      );
    }
  }

  /**
   * Validate scopes for the requested operation
   */
  validateScopes(requiredScopes: string[]): boolean {
    if (!this._config?.scopes) {
      return false;
    }

    return requiredScopes.every(
      (scope) => this._config!.scopes.includes(scope) || this._config!.scopes.includes(scope.replace('.readonly', '')),
    );
  }

  /**
   * Get recommended scopes for a service type
   */
  static getRecommendedScopes(serviceType: 'docs' | 'sheets', readOnly = true): string[] {
    if (serviceType === 'docs') {
      return readOnly ? [GOOGLE_WORKSPACE_SCOPES.DOCS.READONLY] : [GOOGLE_WORKSPACE_SCOPES.DOCS.FULL];
    } else {
      return readOnly ? [GOOGLE_WORKSPACE_SCOPES.SHEETS.READONLY] : [GOOGLE_WORKSPACE_SCOPES.SHEETS.FULL];
    }
  }

  /**
   * Parse connection string to extract auth configuration
   */
  static parseConnectionString(connectionString: string): Partial<GoogleWorkspaceConfig> {
    try {
      const url = new URL(connectionString);
      const params = new URLSearchParams(url.search);

      const config: Partial<GoogleWorkspaceConfig> = {
        type: (params.get('auth') as 'oauth2' | 'service-account' | 'api-key') || 'oauth2',
        clientId: params.get('client_id') || undefined,
        scopes: params.get('scope')?.split(',') || [],
      };

      return config;
    } catch (error) {
      throw new GoogleAuthError(
        `Invalid connection string format: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INVALID_CONNECTION_STRING',
      );
    }
  }

  /**
   * Generate a secure encryption key
   */
  private _generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this._oauth2Client = null;
    this._serviceAuth = null;
    this._config = null;
  }
}
