if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.API_MODE !== 'direct') {
  const originalFetch = global.fetch;

  global.fetch = async (url, options = {}) => {
    if (shouldSkipProxy(url)) {
      return originalFetch(url, options);
    }

    const proxyUrl = new URL('/api/execute-api-call', `${process.env.VITE_API_BASE_URL}/api`);
    proxyUrl.searchParams.set('url', typeof url === 'string' ? url : url.toString());

    return originalFetch(proxyUrl, options);
  };
}

function shouldSkipProxy(url: RequestInfo | URL): boolean {
  try {
    const hostname =
      typeof url === 'string'
        ? new URL(url).hostname
        : url instanceof URL
          ? url.hostname
          : url instanceof Request
            ? new URL(url.url).hostname
            : null;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true;
    }

    if (!process.env.VITE_API_BASE_URL) {
      return false;
    }

    return hostname === new URL(process.env.VITE_API_BASE_URL).hostname;
  } catch (error) {
    console.warn('Error parsing URL for proxy check:', error);
    return false;
  }
}
