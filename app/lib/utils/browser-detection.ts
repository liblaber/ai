export interface BrowserInfo {
  name: 'Chrome' | 'Firefox' | 'Safari' | 'Edge' | 'Other';
  version: string;
  supportsWebContainers: boolean;
}

interface BrowserConfig {
  name: BrowserInfo['name'];
  userAgentCheck: (userAgent: string) => boolean;
  versionRegex: RegExp;
  supportsWebContainers: boolean;
}

const BROWSER_CONFIGS: BrowserConfig[] = [
  {
    name: 'Chrome',
    userAgentCheck: (ua) => ua.includes('Chrome') && !ua.includes('Edg'),
    versionRegex: /Chrome\/([0-9.]+)/,
    supportsWebContainers: true,
  },
  {
    name: 'Edge',
    userAgentCheck: (ua) => ua.includes('Edg'),
    versionRegex: /Edg\/([0-9.]+)/,
    supportsWebContainers: true,
  },
  {
    name: 'Firefox',
    userAgentCheck: (ua) => ua.includes('Firefox'),
    versionRegex: /Firefox\/([0-9.]+)/,
    supportsWebContainers: false,
  },
  {
    name: 'Safari',
    userAgentCheck: (ua) => ua.includes('Safari') && !ua.includes('Chrome'),
    versionRegex: /Safari\/([0-9.]+)/,
    supportsWebContainers: false,
  },
];

export function detectBrowser(): BrowserInfo {
  if (typeof window === 'undefined') {
    return {
      name: 'Other',
      version: 'unknown',
      supportsWebContainers: false,
    };
  }

  const userAgent = window.navigator.userAgent;

  for (const config of BROWSER_CONFIGS) {
    if (config.userAgentCheck(userAgent)) {
      const match = userAgent.match(config.versionRegex);
      const version = match ? match[1] : 'unknown';
      const supportsWebContainers = config.supportsWebContainers && checkWebContainerSupport();

      return {
        name: config.name,
        version,
        supportsWebContainers,
      };
    }
  }

  return {
    name: 'Other',
    version: 'unknown',
    supportsWebContainers: false,
  };
}

function checkWebContainerSupport(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
  const hasWorker = typeof Worker !== 'undefined';
  const hasWebAssembly = typeof WebAssembly !== 'undefined';

  // Chrome and Edge reliably support WebContainers with proper COEP headers
  return hasSharedArrayBuffer && hasWorker && hasWebAssembly;
}
