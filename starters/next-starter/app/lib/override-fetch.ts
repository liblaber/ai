if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.API_MODE !== 'direct') {
  const originalFetch = global.fetch;

  global.fetch = async (url, options = {}) => {
    console.log('Overriden fetch called with URL:', url);

    if (isApiUrl(url)) {
      return originalFetch(url, options);
    }

    const proxyUrl = new URL('/api/execute-api-call', `${process.env.VITE_API_BASE_URL}/api`);
    proxyUrl.searchParams.set('url', typeof url === 'string' ? url : url.toString());

    return originalFetch(proxyUrl, options);
  };
}

function isApiUrl(url: RequestInfo | URL): boolean {
  const hostname = typeof url === 'string' ? new URL(url).hostname : url instanceof URL ? url.hostname : '';

  return hostname === process.env.VITE_API_BASE_URL;
}
