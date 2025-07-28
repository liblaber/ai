// Helper to detect OS
function getPlatform(): string {
  if (typeof navigator !== 'undefined') {
    // Prefer userAgentData.platform if available
    // Fallback to deprecated navigator.platform
    // Some browsers may not support userAgentData
    // @ts-ignore: userAgentData is not in all TS DOM types
    const platform = navigator.userAgentData?.platform || navigator.platform;
    return platform ? platform.toLowerCase() : '';
  }

  return '';
}

export function isMac(): boolean {
  return getPlatform().includes('mac');
}

export function isWindows(): boolean {
  return getPlatform().includes('win');
}

export function isLinux(): boolean {
  return getPlatform().includes('linux');
}
