# Custom Deployment Plugin Guide

This guide will help you create and upload your own deployment plugin for the application.

## Plugin Structure

Your plugin should be packaged as a ZIP file containing the following files:

```
your-plugin.zip
├── plugin.json
└── index.ts
```

### plugin.json

This file contains metadata about your plugin:

```json
{
  "id": "your-plugin-id",
  "name": "Your Plugin Name",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "A brief description of what your plugin does",
  "entryPoint": "index.ts"
}
```

### index.ts

This is the main plugin file that implements the deployment logic. Use the template in `index.ts` as a reference.

## Plugin Interface

Your plugin must implement the following interface:

```typescript
interface DeploymentPlugin {
  id: string;
  name: string;
  description: string;
  icon: string;
  theme: {
    primary: string;
    background: string;
    hover: string;
    dark: {
      primary: string;
      background: string;
      hover: string;
    };
  };
  isEnabled: () => Promise<boolean>;
  deploy: (options: {
    projectId: string;
    buildPath: string;
    environment: 'development' | 'production';
    variables: Record<string, string>;
  }) => Promise<{
    success: boolean;
    url?: string;
    message?: string;
    error?: string;
  }>;
}
```

## Icons

The application uses [Phosphor Icons](https://phosphoricons.com/). You can use any icon from their collection by prefixing the icon name with `i-ph:`. For example:

- `i-ph:rocket-launch`
- `i-ph:cloud-upload`
- `i-ph:server`

## Theme Colors

You can customize your plugin's appearance by defining theme colors. Use Tailwind CSS color classes:

- Primary: `blue-500`, `green-500`, `purple-500`, etc.
- Background: `blue-50`, `green-50`, `purple-50`, etc.
- Hover: `blue-500`, `green-500`, `purple-500`, etc.

For dark mode, use the same colors but with different opacity values:

- Background: `blue-900/20`, `green-900/20`, `purple-900/20`, etc.

## Security Considerations

1. Your plugin runs in a sandboxed environment with limited access to system resources.
2. You can only access environment variables that are explicitly provided.
3. Network requests are restricted to prevent abuse.
4. File system access is limited to the plugin's own directory.

## Uploading Your Plugin

1. Package your plugin files into a ZIP file.
2. Go to the Plugin Management page in the application.
3. Click "Upload Plugin" and select your ZIP file.
4. The application will validate your plugin and install it if everything is correct.

## Best Practices

1. Keep your plugin code simple and focused on deployment.
2. Handle errors gracefully and provide meaningful error messages.
3. Use environment variables for sensitive information.
4. Test your plugin thoroughly before uploading.
5. Document any special requirements or configuration needed.

## Example

Here's a simple example of a plugin that deploys to a custom server:

```typescript
const customPlugin: DeploymentPlugin = {
  id: 'custom-server',
  name: 'Custom Server',
  description: 'Deploy to your own server',
  icon: 'i-ph:server',
  theme: {
    primary: 'blue-500',
    background: 'blue-50',
    hover: 'blue-500',
    dark: {
      primary: 'blue-500',
      background: 'blue-900/20',
      hover: 'blue-500',
    },
  },
  isEnabled: async () => {
    // Check if required environment variables are set
    return !!process.env.CUSTOM_SERVER_URL;
  },
  deploy: async (options) => {
    try {
      // Your deployment logic here
      return {
        success: true,
        url: process.env.CUSTOM_SERVER_URL,
        message: 'Deployment successful',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deployment failed',
      };
    }
  },
};
```
