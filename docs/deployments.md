# Deployment Plugins Guide

This document explains how to create and add new deployment plugins to the LibLab AI platform, and how to configure deployment methods for different environments.

## Overview

The deployment system uses a plugin architecture that allows you to deploy applications to various hosting providers. The system is built around a base class that provides common functionality, making it easy to add new deployment targets.

## Deployment Methods Configuration

Before deploying applications, you need to configure deployment methods for your environments. Deployment methods store encrypted credentials for different hosting providers and can be applied to specific environments or across all environments.

### Managing Deployment Methods

Deployment methods are managed through the Settings panel:

1. **Navigate to Settings**: Go to the Settings panel in the application
2. **Select Deployment Methods**: Click on the "Deployment Methods" tab
3. **Add New Method**: Click the "Add" button to create a new deployment method
4. **Configure Credentials**: Fill in the required credentials for your chosen provider

### Supported Providers

The following deployment providers are currently supported:

- **Vercel**: Requires API Key
- **Netlify**: Requires API Key
- **AWS**: Requires Access Key, Secret Key, and Region

### Creating Deployment Methods

#### Single Environment

1. Select the target environment from the dropdown
2. Choose a deployment provider
3. Enter the deployment method name
4. Fill in the required credentials
5. Click "Create"

#### All Environments

1. Check "Apply to all environments" checkbox
2. Choose a deployment provider
3. Enter the deployment method name
4. Fill in the required credentials
5. Click "Create"

This will create identical deployment methods across all available environments.

### Editing Deployment Methods

1. Click on an existing deployment method to edit it
2. Modify the name, provider, or credentials as needed
3. Use "Apply to all environments" to update matching methods across all environments
4. Click "Update" to save changes

### Security Features

- **Credential Encryption**: All sensitive credentials are encrypted using AES encryption
- **Masked Input**: Sensitive fields (API keys, secrets) are masked by default with reveal/hide toggle
- **Environment Isolation**: Credentials are stored per environment for security
- **Access Control**: Only authorized users can manage deployment methods

### Credential Types

Different providers require different types of credentials:

- **API_KEY**: Used by Vercel and Netlify
- **ACCESS_KEY**: Used by AWS for access key ID
- **SECRET_KEY**: Used by AWS for secret access key
- **REGION**: Used by AWS for region specification

### Environment-Specific Configuration

Deployment methods can be configured for:

- **Individual Environments**: Specific to one environment
- **All Environments**: Applied across all available environments

When editing a deployment method, you can choose to update only the current environment or apply changes to all environments with the same name and provider.

### Using Deployment Methods in Plugins

Deployment plugins automatically retrieve credentials from the configured deployment methods. The system provides helper functions to access encrypted credentials:

```typescript
import { getDeploymentMethodCredential } from '~/lib/services/deploymentMethodService';
import { DeploymentMethodCredentialsType } from '@prisma/client';

// Get a specific credential for a provider and environment
const apiKey = await getDeploymentMethodCredential(
  'VERCEL', // Provider
  environmentId, // Environment ID
  DeploymentMethodCredentialsType.API_KEY, // Credential type
  userId, // User ID
);

// Fallback to environment variables if deployment method not found
const token = apiKey || process.env.VERCEL_API_KEY;
```

### Credential Retrieval Flow

1. **Plugin requests credential**: Calls `getDeploymentMethodCredential()` with provider, environment, and credential type
2. **System looks up method**: Finds deployment method for the specified provider and environment
3. **Decrypts credential**: Automatically decrypts the stored credential value
4. **Returns credential**: Returns the decrypted value for use in deployment
5. **Fallback handling**: If no deployment method found, falls back to environment variables

### Environment Variables Fallback

If no deployment method is configured, plugins will fall back to environment variables:

- **Vercel**: `VERCEL_TOKEN` or `VERCEL_API_KEY`
- **Netlify**: `NETLIFY_AUTH_TOKEN`
- **AWS**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`

## Architecture

### Base Class: `BaseDeploymentPlugin`

All deployment plugins extend the `BaseDeploymentPlugin` abstract class located at:

```
app/lib/plugins/deployment/base-deployment-plugin.ts
```

This base class provides common functionality for:

- File operations (zip extraction, temp directory management)
- Command execution with timeout and progress callbacks
- Database operations (website creation/updates)
- Telemetry tracking
- Progress reporting
- Utility methods (site name generation, slug creation)

### Plugin Interface

Each deployment plugin must implement the `DeploymentPlugin` interface:

```typescript
interface DeploymentPlugin {
  pluginId: DeploymentPluginId;
  name: string;
  description: string;

  deploy(
    zipFile: File,
    config: DeploymentConfig,
    onProgress: (progress: DeploymentProgress) => Promise<void>,
  ): Promise<DeploymentResult>;
}
```

## Creating a New Deployment Plugin

### Step 1: Create the Plugin File

Create a new file in `app/lib/plugins/deployment/` with the naming convention:

```
{provider}-deploy-plugin.ts
```

For example: `vercel-deploy-plugin.ts`, `railway-deploy-plugin.ts`

### Step 2: Implement the Plugin Class

```typescript
import { BaseDeploymentPlugin } from './base-deployment-plugin';
import type { DeploymentConfig, DeploymentProgress, DeploymentResult } from '~/lib/plugins/types';
import { getDeploymentMethodCredential } from '~/lib/services/deploymentMethodService';
import { DeploymentMethodCredentialsType } from '@prisma/client';

export class YourProviderDeployPlugin extends BaseDeploymentPlugin {
  pluginId = 'your-provider' as const;
  name = 'Your Provider';
  description = 'Deploy your application to Your Provider';
  protected totalSteps = 6; // Adjust based on your deployment steps

  async deploy(
    zipFile: File,
    config: DeploymentConfig,
    onProgress: (progress: DeploymentProgress) => Promise<void>,
  ): Promise<DeploymentResult> {
    const { websiteId, chatId, userId, environmentId } = config;
    let currentStepIndex = 1;

    // Step 1: Get credentials from deployment methods
    let apiKey;
    if (environmentId) {
      try {
        apiKey = await getDeploymentMethodCredential(
          'YOUR_PROVIDER',
          environmentId,
          DeploymentMethodCredentialsType.API_KEY,
          userId,
        );
      } catch (error) {
        logger.warn('Failed to get API key from deployment method, falling back to environment variable', {
          error: error instanceof Error ? error.message : 'Unknown error',
          chatId,
        });
      }
    }

    // Fallback to environment variable if deployment method not found
    if (!apiKey) {
      apiKey = process.env.YOUR_PROVIDER_API_KEY;
    }

    if (!apiKey) {
      throw new Error(
        'Your Provider API key not configured. Please set up deployment method in settings or set YOUR_PROVIDER_API_KEY environment variable.',
      );
    }

    // Step 2: Initialize deployment
    await this.sendProgress(currentStepIndex, this.totalSteps, 'Initializing deployment...', 'in_progress', onProgress);

    // Step 3: Create temporary directory
    const tempDir = await this.createTempDirectory(chatId, 'your-provider-deploy');

    try {
      // Step 4: Extract files
      await this.sendProgress(
        ++currentStepIndex,
        this.totalSteps,
        'Preparing deployment files...',
        'in_progress',
        onProgress,
      );
      await this.extractZipFile(zipFile, tempDir, chatId);

      // Step 5: Install dependencies
      await this.sendProgress(
        ++currentStepIndex,
        this.totalSteps,
        'Installing dependencies...',
        'in_progress',
        onProgress,
      );
      await this.runCommand('pnpm', ['install'], tempDir, { YOUR_PROVIDER_API_KEY: apiKey });

      // Step 6: Deploy to your provider
      await this.sendProgress(
        ++currentStepIndex,
        this.totalSteps,
        'Deploying to Your Provider...',
        'in_progress',
        onProgress,
      );

      // Your provider-specific deployment logic here
      const deployResult = await this.deployToYourProvider(tempDir, chatId, apiKey);

      // Step 7: Create site info and update database
      const siteInfo = {
        id: deployResult.siteId,
        name: `your-provider-${chatId}`,
        url: deployResult.url,
        chatId,
      };

      // Track telemetry
      await this.trackDeploymentTelemetry(siteInfo, userId, 'your-provider');

      // Update database
      const website = await this.updateWebsiteDatabase(
        websiteId,
        siteInfo.id,
        siteInfo.name,
        siteInfo.url,
        chatId,
        userId,
      );

      return {
        deploy: {
          id: deployResult.deployId,
          state: 'ready',
          url: siteInfo.url,
        },
        site: siteInfo,
        website,
      };
    } catch (error: any) {
      logger.error('Error during deployment', JSON.stringify({ chatId, error: error.message }));
      throw new Error(`Deployment failed: ${error.message}`);
    } finally {
      await this.cleanupTempDirectory(tempDir, chatId);
    }
  }

  // Add your provider-specific methods here
  private async deployToYourProvider(tempDir: string, chatId: string, apiKey: string) {
    // Implementation specific to your provider
    // This might involve API calls, CLI commands, etc.
    // Use the apiKey parameter for authentication
  }
}
```

### Step 3: Add Plugin ID to Types

Update `app/lib/plugins/types.ts` to include your new plugin ID:

```typescript
export type DeploymentPluginId = 'netlify' | 'vercel' | 'railway' | 'aws' | 'your-provider';
```

### Step 4: Register the Plugin

Update `app/lib/plugins/deployment/deployment-plugin-manager.ts`:

```typescript
import { YourProviderDeployPlugin } from './your-provider-deploy-plugin';

export class DeploymentPluginManager {
  // ... existing code ...

  async initialize(): Promise<void> {
    if (this._initialized) {
      return;
    }

    // Register available deployment plugins
    this.registerPlugin(new NetlifyDeployPlugin());
    this.registerPlugin(new AwsDeployPlugin());
    this.registerPlugin(new YourProviderDeployPlugin()); // Add this line

    this._initialized = true;
  }
}
```

## Available Base Class Methods

### File Operations

- `createTempDirectory(chatId: string, prefix?: string): Promise<string>`
- `extractZipFile(zipFile: File, tempDir: string, chatId: string): Promise<void>`
- `readEnvFile(tempDir: string): Promise<Record<string, string>>`
- `fileExists(filePath: string): Promise<boolean>`
- `cleanupTempDirectory(tempDir: string, chatId: string): Promise<void>`

### Command Execution

- `runCommand(command: string, args: string[], cwd: string, env?: Record<string, string>, timeout?: number, onProgress?: (message: string) => void): Promise<CommandResult>`

### Database Operations

- `updateWebsiteDatabase(websiteId: string | undefined, siteId: string, siteName: string, siteUrl: string, chatId: string, userId: string): Promise<any>`
- `getSiteIdFromChat(chatId: string): Promise<string>`

### Telemetry & Progress

- `trackDeploymentTelemetry(siteInfo: SiteInfo, userId: string, provider: string): Promise<void>`
- `sendProgress(step: number, totalSteps: number, message: string, status: 'in_progress' | 'success' | 'error', onProgress: (progress: DeploymentProgress) => Promise<void>): Promise<void>`

### Utility Methods

- `generateSiteName(chatId: string, prefix?: string, length?: number): string`
- `generateUniqueSiteName(chatId: string, prefix?: string, maxAttempts?: number): Promise<string>`
- `generateSlug(text: string): string`

## Configuration

### Environment Variables

Your plugin may need environment variables for authentication. Add them to your environment configuration:

```typescript
// In your plugin
const token = process.env.YOUR_PROVIDER_API_TOKEN;
if (!token) {
  throw new Error('Your Provider API token not configured');
}
```

### Deployment Configuration

The `DeploymentConfig` interface provides:

```typescript
interface DeploymentConfig {
  siteId?: string; // Existing site ID (for updates)
  websiteId?: string; // Database website ID
  chatId: string; // Chat session ID
  description?: string; // Deployment description
  userId: string; // User ID
  environmentId?: string; // Environment ID for credential retrieval
}
```

The `environmentId` is used by deployment plugins to retrieve the appropriate deployment method credentials for the current environment.

### Database Schema

Deployment methods are stored in the database using the following schema:

```prisma
model DeploymentMethod {
  id            String   @id @default(cuid())
  name          String
  provider      DeploymentProvider
  environmentId String
  environment   Environment @relation(fields: [environmentId], references: [id])
  credentials   DeploymentMethodCredentials[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([name, provider, environmentId])
}

model DeploymentMethodCredentials {
  id                String   @id @default(cuid())
  deploymentMethodId String
  deploymentMethod   DeploymentMethod @relation(fields: [deploymentMethodId], references: [id], onDelete: Cascade)
  type              DeploymentMethodCredentialsType
  value             String // Encrypted value
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

enum DeploymentProvider {
  VERCEL
  NETLIFY
  AWS
}

enum DeploymentMethodCredentialsType {
  API_KEY
  ACCESS_KEY
  SECRET_KEY
  REGION
}
```

### Security Considerations

- **Encryption**: All credential values are encrypted using AES encryption before storage
- **Environment Isolation**: Credentials are tied to specific environments for security
- **Access Control**: Only authorized users can access deployment methods
- **Audit Trail**: All changes are tracked with timestamps

## Best Practices

### 1. Error Handling

- Always wrap deployment logic in try-catch blocks
- Use descriptive error messages
- Log errors with context (chatId, etc.)
- Clean up resources in finally blocks

### 2. Progress Reporting

- Use `sendProgress()` for each major step
- Provide meaningful progress messages
- Update step indices correctly

### 3. Resource Management

- Always clean up temporary directories
- Use the base class cleanup methods
- Handle timeouts appropriately

### 4. Security

- Never log sensitive information (API keys, tokens)
- Validate environment variables
- Use secure methods for credential storage

### 5. Testing

- Test with various zip file contents
- Test error scenarios (network failures, invalid credentials)
- Test cleanup in all scenarios

## Example: Vercel Deployment Plugin

Here's a simplified example of how a Vercel plugin might look:

```typescript
export class VercelDeployPlugin extends BaseDeploymentPlugin {
  pluginId = 'vercel' as const;
  name = 'Vercel';
  description = 'Deploy your application to Vercel';
  protected totalSteps = 5;

  async deploy(
    zipFile: File,
    config: DeploymentConfig,
    onProgress: (progress: DeploymentProgress) => Promise<void>,
  ): Promise<DeploymentResult> {
    const { websiteId, chatId, userId } = config;
    let currentStepIndex = 1;

    // Check Vercel token
    const token = process.env.VERCEL_TOKEN;
    if (!token) {
      throw new Error('Vercel token not configured');
    }

    await this.sendProgress(
      currentStepIndex,
      this.totalSteps,
      'Initializing Vercel deployment...',
      'in_progress',
      onProgress,
    );

    const tempDir = await this.createTempDirectory(chatId, 'vercel-deploy');

    try {
      await this.sendProgress(++currentStepIndex, this.totalSteps, 'Preparing files...', 'in_progress', onProgress);
      await this.extractZipFile(zipFile, tempDir, chatId);

      await this.sendProgress(
        ++currentStepIndex,
        this.totalSteps,
        'Installing dependencies...',
        'in_progress',
        onProgress,
      );
      await this.runCommand('npm', ['install'], tempDir, { VERCEL_TOKEN: token });

      await this.sendProgress(++currentStepIndex, this.totalSteps, 'Deploying to Vercel...', 'in_progress', onProgress);
      const deployResult = await this.runCommand('npx', ['vercel', '--prod', '--yes'], tempDir, {
        VERCEL_TOKEN: token,
      });

      // Parse deployment URL from output
      const deployUrl = this.parseVercelUrl(deployResult.output);

      const siteInfo = {
        id: `vercel-${chatId}`,
        name: `vercel-${chatId}`,
        url: deployUrl,
        chatId,
      };

      await this.trackDeploymentTelemetry(siteInfo, userId, 'vercel');
      const website = await this.updateWebsiteDatabase(
        websiteId,
        siteInfo.id,
        siteInfo.name,
        siteInfo.url,
        chatId,
        userId,
      );

      return {
        deploy: { id: `deploy-${chatId}`, state: 'ready', url: siteInfo.url },
        site: siteInfo,
        website,
      };
    } finally {
      await this.cleanupTempDirectory(tempDir, chatId);
    }
  }

  private parseVercelUrl(output: string): string {
    // Parse Vercel deployment URL from command output
    const urlMatch = output.match(/https:\/\/[^\s]+\.vercel\.app/);
    return urlMatch ? urlMatch[0] : 'https://vercel.com';
  }
}
```

## Troubleshooting

### Common Issues

1. **Plugin not appearing in UI**: Ensure the plugin is registered in `deployment-plugin-manager.ts`
2. **Type errors**: Make sure the plugin ID is added to `DeploymentPluginId` type
3. **Environment variables not found**: Check that environment variables are properly configured
4. **Command execution failures**: Verify that required CLI tools are installed and accessible
5. **Database errors**: Ensure proper error handling for database operations

### Debugging

- Use the logger to track deployment progress
- Check browser developer tools for client-side errors
- Review server logs for deployment failures
- Test with minimal zip files first

## Contributing

When contributing a new deployment plugin:

1. Follow the existing code style and patterns
2. Add comprehensive error handling
3. Include proper logging
4. Test thoroughly with various scenarios
5. Update this documentation if needed
6. Consider adding unit tests for your plugin

## Support

For questions or issues with deployment plugins:

- Check existing plugin implementations for reference
- Review the base class documentation
- Test with the existing Netlify and AWS plugins as examples
