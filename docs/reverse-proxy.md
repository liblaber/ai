# Reverse Proxy for Deployed Apps

This document describes the reverse proxy system that allows deployed applications to be served through friendly URLs like `localhost:3000/apps/{chatId}` instead of cryptic deployment URLs.

## Overview

The reverse proxy system provides:

- **Friendly URLs**: Access apps via `localhost:3000/apps/{chatId}` instead of cryptic deployment URLs
- **Content Proxying**: Serves app content through our domain to avoid CORS issues
- **URL Rewriting**: Automatically fixes relative URLs in HTML, CSS, and JavaScript
- **Security**: Proper iframe sandboxing and content validation
- **Error Handling**: Graceful fallbacks when apps are offline or inaccessible

## Architecture

### Components

1. **App Page** (`/apps/[chatId]/page.tsx`)
   - Main entry point for viewing deployed apps
   - Handles authentication and authorization
   - Renders the AppViewer component

2. **AppViewer Component** (`/apps/[chatId]/AppViewer.tsx`)
   - Provides a rich UI around the deployed app
   - Features: fullscreen, refresh, external link, app info
   - Handles loading states and errors

3. **Content Proxy API** (`/api/proxy-content/[chatId]/route.ts`)
   - Proxies requests to the actual deployment URL
   - Rewrites relative URLs to use the proxy
   - Handles different content types (HTML, CSS, JS, images)

4. **URL Utilities** (`/lib/utils/app-url.ts`)
   - Helper functions for generating app URLs
   - Deployment provider detection
   - URL validation

## Usage

### Basic App Viewing

```typescript
import { generateAppUrl } from '~/lib/utils/app-url';

// Generate a friendly app URL
const appUrl = generateAppUrl({ chatId: 'abc123' });
// Result: http://localhost:3000/apps/abc123
```

### Using the DeployedAppCard Component

```tsx
import DeployedAppCard from '~/components/DeployedAppCard';

<DeployedAppCard
  website={{
    id: 'website-id',
    chatId: 'abc123',
    siteName: 'My Awesome App',
    siteUrl: 'https://my-app.vercel.app',
    createdAt: '2024-01-01T00:00:00Z',
    isPublic: true,
    createdBy: { name: 'John Doe' },
  }}
  onView={(chatId) => {
    // Handle app viewing
    window.open(`/apps/${chatId}`, '_blank');
  }}
/>;
```

### Using the AppViewButton Component

```tsx
import AppViewButton from '~/components/@settings/tabs/deployed-apps/AppViewButton';

<AppViewButton chatId="abc123" siteUrl="https://my-app.vercel.app" siteName="My App" />;
```

## API Endpoints

### GET `/apps/[chatId]`

- **Purpose**: Main app viewing page
- **Authentication**: Required (public apps or user's own apps)
- **Response**: Renders the AppViewer component

### GET `/api/proxy-content/[chatId]?path={encodedPath}`

- **Purpose**: Proxies content from deployment URLs
- **Parameters**:
  - `chatId`: The chat ID associated with the app
  - `path`: The relative path to proxy (URL encoded)
- **Response**: Proxied content with rewritten URLs

### GET `/api/validate-url?url={encodedUrl}`

- **Purpose**: Validates if a deployment URL is accessible
- **Parameters**:
  - `url`: The URL to validate (URL encoded)
- **Response**: `{ valid: boolean, error?: string }`

## URL Rewriting

The proxy automatically rewrites URLs in different content types:

### HTML

- `src="relative/path"` → `src="/api/proxy-content/chatId?path=relative/path"`
- `href="relative/path"` → `href="/api/proxy-content/chatId?path=relative/path"`
- `action="relative/path"` → `action="/api/proxy-content/chatId?path=relative/path"`

### CSS

- `url(relative/path)` → `url("/api/proxy-content/chatId?path=relative/path")`

### JSON

- Relative URLs in JSON responses are also rewritten

## Security Features

### Iframe Sandboxing

The iframe uses a restrictive sandbox:

```html
<iframe
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-downloads"
/>
```

### Content Validation

- Only serves content from verified deployment URLs
- Validates URL format before proxying
- Timeout protection (30 seconds)

### CORS Headers

Proper CORS headers are set to allow cross-origin requests:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
```

## Error Handling

### App Not Found

- Shows a 404 page when the chatId doesn't exist
- Handles cases where the app hasn't been deployed

### Deployment URL Issues

- Shows error state when the deployment URL is inaccessible
- Provides retry functionality
- Graceful fallback to direct URL

### Network Issues

- Timeout handling (30 seconds)
- Retry mechanisms
- User-friendly error messages

## Supported Deployment Providers

The system automatically detects and handles URLs from:

- Vercel (vercel.app)
- Netlify (netlify.app)
- AWS (amazonaws.com, cloudfront.net)
- Heroku (herokuapp.com)
- Railway (railway.app)
- Render (render.com)
- Fly.io (fly.dev)
- Supabase (supabase.co)

## Configuration

### Environment Variables

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Base URL for app links
```

### Database Requirements

The system uses the existing `Website` model with these fields:

- `chatId`: Unique identifier for the app
- `siteUrl`: The deployment URL
- `siteName`: Human-readable app name
- `isPublic`: Whether the app is publicly accessible

## Best Practices

1. **Always validate URLs** before storing them in the database
2. **Use the proxy for internal links** to maintain the friendly URL structure
3. **Handle errors gracefully** with user-friendly messages
4. **Monitor proxy performance** for high-traffic apps
5. **Consider caching** for frequently accessed content

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure the deployment URL allows cross-origin requests
   - Check if the proxy is properly rewriting URLs

2. **Content Not Loading**
   - Verify the deployment URL is accessible
   - Check if the app requires authentication
   - Ensure the iframe sandbox allows necessary features

3. **URL Rewriting Issues**
   - Check if the content type is being detected correctly
   - Verify the regex patterns in the URL rewriting functions

### Debug Mode

Enable debug logging by setting the log level to debug in your environment configuration.

## Future Enhancements

- **Caching**: Add Redis or similar for caching proxied content
- **Analytics**: Track app usage and performance metrics
- **Custom Domains**: Support for custom domains per app
- **Authentication**: Handle apps that require authentication
- **WebSocket Support**: Proxy WebSocket connections for real-time apps
