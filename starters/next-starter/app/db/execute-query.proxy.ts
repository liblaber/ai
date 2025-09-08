import { decryptData, encryptData } from '@/lib/encryption/encryption';
import { decodeUrlCompletely } from '@/utils/url-decoder';

export async function executeQueryThroughProxy<T>(query: string, params?: string[]): Promise<{ data: T[] }> {
  const databaseUrl = decodeUrlCompletely(process.env.CONNECTION_URL || '');
  const dataSourceType = process.env.DATA_SOURCE_TYPE || '';

  const requestBody = {
    query,
    databaseUrl,
    dataSourceType,
    ...(Array.isArray(params) && params.length > 0 ? { params } : {}),
  };

  const dataBuffer = Buffer.from(JSON.stringify(requestBody));

  const encryptedBody = encryptData(process.env.ENCRYPTION_KEY as string, dataBuffer);

  const response = await fetchProxyApi<{ encryptedData: string }>('/execute-query', {
    method: 'POST',
    body: JSON.stringify({ encryptedData: encryptedBody }),
  });

  const decryptedData = decryptData(process.env.ENCRYPTION_KEY as string, response.data.encryptedData);

  return { data: JSON.parse(decryptedData.toString()) };
}

async function fetchProxyApi<T>(endpoint: string, options: RequestInit = {}): Promise<{ data: T }> {
  const proxyBaseUrl = `${process.env.VITE_API_BASE_URL}/api`;

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
    // Check if error response is encrypted (has encryptedData property)
    if (data?.encryptedData && process.env.ENCRYPTION_KEY) {
      try {
        const decryptedError = decryptData(process.env.ENCRYPTION_KEY, data.encryptedData);
        const errorData = JSON.parse(decryptedError.toString());
        throw new ApiRequestError(
          response.status,
          errorData?.error || errorData?.details || 'An error occurred',
          errorData?.errors,
        );
      } catch (decryptError) {
        // If decryption fails, fallback to original error message
        throw new ApiRequestError(response.status, data?.error || 'An error occurred', data?.errors);
      }
    }

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
