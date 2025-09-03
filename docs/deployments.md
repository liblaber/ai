# Deployment Plugins Guide

This document explains how to create and add new deployment plugins to the LibLab AI platform.

## Overview

The deployment system uses a plugin architecture that allows you to deploy applications to various hosting providers. The system is built around a base class that provides common functionality, making it easy to add new deployment targets.

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
    const { websiteId, chatId, userId } = config;
    let currentStepIndex = 1;

    // Step 1: Initialize deployment
    await this.sendProgress(currentStepIndex, this.totalSteps, 'Initializing deployment...', 'in_progress', onProgress);

    // Step 2: Create temporary directory
    const tempDir = await this.createTempDirectory(chatId, 'your-provider-deploy');

    try {
      // Step 3: Extract files
      await this.sendProgress(
        ++currentStepIndex,
        this.totalSteps,
        'Preparing deployment files...',
        'in_progress',
        onProgress,
      );
      await this.extractZipFile(zipFile, tempDir, chatId);

      // Step 4: Install dependencies
      await this.sendProgress(
        ++currentStepIndex,
        this.totalSteps,
        'Installing dependencies...',
        'in_progress',
        onProgress,
      );
      await this.runCommand('pnpm', ['install'], tempDir);

      // Step 5: Deploy to your provider
      await this.sendProgress(
        ++currentStepIndex,
        this.totalSteps,
        'Deploying to Your Provider...',
        'in_progress',
        onProgress,
      );

      // Your provider-specific deployment logic here
      const deployResult = await this.deployToYourProvider(tempDir, chatId);

      // Step 6: Create site info and update database
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
  private async deployToYourProvider(tempDir: string, chatId: string) {
    // Implementation specific to your provider
    // This might involve API calls, CLI commands, etc.
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
}
```

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
