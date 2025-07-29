export const getBaseUrl = async (): Promise<string> => {
  // Only make fetch call on client side
  if (typeof window === 'undefined') {
    // Server-side: fallback to BASE_URL environment variable
    return process.env.BASE_URL || '';
  }

  try {
    const response = await fetch('/api/tunnel-config');

    if (response.ok) {
      const data = (await response.json()) as { url: string };
      return data.url || '';
    }
  } catch (error) {
    console.warn('Failed to fetch tunnel config:', error);
  }

  // Fallback to BASE_URL environment variable
  return process.env.BASE_URL || '';
};
