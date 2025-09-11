/**
 * Utility functions for generating app URLs and handling deployment URLs
 */

export interface AppUrlOptions {
  chatId: string;
  baseUrl?: string;
  useProxy?: boolean;
}

/**
 * Generate a friendly app URL for a deployed application
 */
export function generateAppUrl(options: AppUrlOptions): string {
  const { chatId, baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', useProxy = true } = options;

  if (useProxy) {
    return `${baseUrl}/apps/${chatId}`;
  }

  return `${baseUrl}/apps/${chatId}`;
}

/**
 * Generate a proxy URL for serving app content
 */
export function generateProxyUrl(chatId: string, targetPath: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const encodedPath = encodeURIComponent(targetPath);

  return `${base}/api/proxy-content/${chatId}?path=${encodedPath}`;
}

/**
 * Check if a URL is a deployment URL (Vercel, Netlify, AWS, etc.)
 */
export function isDeploymentUrl(url: string): boolean {
  const deploymentPatterns = [
    /vercel\.app$/,
    /netlify\.app$/,
    /amazonaws\.com$/,
    /cloudfront\.net$/,
    /herokuapp\.com$/,
    /railway\.app$/,
    /render\.com$/,
    /fly\.dev$/,
    /supabase\.co$/,
  ];

  try {
    const urlObj = new URL(url);
    return deploymentPatterns.some((pattern) => pattern.test(urlObj.hostname));
  } catch {
    return false;
  }
}

/**
 * Extract the deployment provider from a URL
 */
export function getDeploymentProvider(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (hostname.includes('vercel.app')) {
      return 'Vercel';
    }

    if (hostname.includes('netlify.app')) {
      return 'Netlify';
    }

    if (hostname.includes('amazonaws.com') || hostname.includes('cloudfront.net')) {
      return 'AWS';
    }

    if (hostname.includes('herokuapp.com')) {
      return 'Heroku';
    }

    if (hostname.includes('railway.app')) {
      return 'Railway';
    }

    if (hostname.includes('render.com')) {
      return 'Render';
    }

    if (hostname.includes('fly.dev')) {
      return 'Fly.io';
    }

    if (hostname.includes('supabase.co')) {
      return 'Supabase';
    }

    return 'Unknown';
  } catch {
    return null;
  }
}

/**
 * Generate a human-readable app name from a deployment URL
 */
export function generateAppNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Extract app name from subdomain or path
    if (hostname.includes('vercel.app')) {
      const subdomain = hostname.split('.')[0];
      return subdomain.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    }

    if (hostname.includes('netlify.app')) {
      const subdomain = hostname.split('.')[0];
      return subdomain.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    }

    // For other providers, use the hostname
    return hostname.replace(/\./g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  } catch {
    return 'Untitled App';
  }
}

/**
 * Validate if a deployment URL is accessible
 */
export async function validateDeploymentUrl(url: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (response.ok) {
      return { valid: true };
    }

    return {
      valid: false,
      error: `HTTP ${response.status}: ${response.statusText}`,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TimeoutError') {
        return { valid: false, error: 'Request timeout' };
      }

      return { valid: false, error: error.message };
    }

    return { valid: false, error: 'Unknown error' };
  }
}

/**
 * Generate a QR code URL for easy mobile access
 */
export function generateQRCodeUrl(appUrl: string): string {
  const encodedUrl = encodeURIComponent(appUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUrl}`;
}

/**
 * Generate a shareable link with metadata
 */
export function generateShareableLink(
  options: AppUrlOptions & {
    appName?: string;
    description?: string;
  },
): string {
  const { appName, description, ...urlOptions } = options;
  const appUrl = generateAppUrl(urlOptions);

  // You could extend this to include Open Graph meta tags or other sharing features
  return appUrl;
}
