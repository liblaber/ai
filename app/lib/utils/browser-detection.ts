export interface BrowserInfo {
  name: 'Chrome' | 'Firefox' | 'Safari' | 'Edge' | 'Other';
  version: string;
  supportsWebContainers: boolean;
  shouldUseServerRendered: boolean;
}

export function detectBrowser(): BrowserInfo {
  if (typeof window === 'undefined') {
    return {
      name: 'Other',
      version: 'unknown',
      supportsWebContainers: false,
      shouldUseServerRendered: true,
    };
  }

  const userAgent = window.navigator.userAgent;
  let name: BrowserInfo['name'] = 'Other';
  let version = 'unknown';

  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    name = 'Chrome';

    const match = userAgent.match(/Chrome\/([0-9.]+)/);
    version = match ? match[1] : 'unknown';
  } else if (userAgent.includes('Firefox')) {
    name = 'Firefox';

    const match = userAgent.match(/Firefox\/([0-9.]+)/);
    version = match ? match[1] : 'unknown';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    name = 'Safari';

    const match = userAgent.match(/Safari\/([0-9.]+)/);
    version = match ? match[1] : 'unknown';
  } else if (userAgent.includes('Edg')) {
    name = 'Edge';

    const match = userAgent.match(/Edg\/([0-9.]+)/);
    version = match ? match[1] : 'unknown';
  }

  const supportsWebContainers = checkWebContainerSupport(name);
  const shouldUseServerRendered = !supportsWebContainers;

  return { name, version, supportsWebContainers, shouldUseServerRendered };
}

function checkWebContainerSupport(browserName: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
  const hasWorker = typeof Worker !== 'undefined';
  const hasWebAssembly = typeof WebAssembly !== 'undefined';

  // Only Chrome reliably supports WebContainers with proper COEP headers
  return browserName === 'Chrome' && hasSharedArrayBuffer && hasWorker && hasWebAssembly;
}
