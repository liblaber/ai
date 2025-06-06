import { decryptData, encryptData } from '@/lib/crypto.server';

export async function executeQueryThroughProxy<T>(query: string, params?: string[]): Promise<{ data: T[] }> {
  const databaseUrl = decodeURIComponent(process.env.DATABASE_URL || '');

  const requestBody = {
    query,
    databaseUrl,
    ...(Array.isArray(params) && params.length > 0 ? { params } : {}),
  };

  const encryptedBody = encryptData(requestBody);

  const response = await fetchProxyApi<{ encryptedData: string }>('/execute-query', {
    method: 'POST',
    body: JSON.stringify({ encryptedData: encryptedBody }),
  });

  const decryptedData = decryptData(response.data.encryptedData);

  return { data: decryptedData };
}

async function fetchProxyApi<T>(endpoint: string, options: RequestInit = {}): Promise<{ data: T }> {
  const proxyBaseUrl = `${import.meta.env.VITE_API_BASE_URL}/api`;

  if (!proxyBaseUrl) {
    throw new Error(`No proxy baseUrl provided`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${proxyBaseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...options.headers,
      },
      signal: controller.signal,
    });

    return await handleResponse<T>(response);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new ApiRequestError(408, 'Request timeout');
      }

      throw new ApiRequestError(500, error.message);
    }

    throw new ApiRequestError(500, 'An unknown error occurred');
  } finally {
    clearTimeout(timeoutId);
  }
}

async function handleResponse<T>(response: Response): Promise<{ data: T }> {
  const data = await response.json();

  if (!response.ok) {
    throw new ApiRequestError(response.status, data?.error || 'An error occurred', data?.errors);
  }

  return { data };
}

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}
