// Only run on server side
if (typeof window === 'undefined') {
  // Dynamic import to avoid client-side bundling
  import('./env-server').catch(() => {
    // Ignore import errors on the client side
  });
}
