export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.API_MODE !== 'direct') {
    const originalFetch = global.fetch;

    global.fetch = async (url, options = {}) => {
      if (isLocalhost(url)) {
        return originalFetch(url, options);
      }

      const proxyUrl = new URL('/api/execute-api-call', `${process.env.VITE_API_BASE_URL}/api`);
      proxyUrl.searchParams.set('url', typeof url === 'string' ? url : url.toString());

      return originalFetch(proxyUrl, options);
    };
  }
}

function isLocalhost(url: RequestInfo | URL): boolean {
  const hostname = typeof url === 'string' ? new URL(url).hostname : url instanceof URL ? url.hostname : '';

  return hostname === 'localhost' || hostname === '127.0.1' || hostname === '[::1]';
}
