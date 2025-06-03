import { DataAccessor } from '@/lib/data-access/dataAccessor';

const databaseUrlDecoded = decodeURIComponent(process.env.DATABASE_URL || '');

const accessor = DataAccessor.getAccessor(databaseUrlDecoded);

async function retryQuery<T>(query: string, params?: string[], maxRetries = 1): Promise<{ data: T[] }> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const data =
        params && params.length > 0
          ? await accessor.executeQuery(databaseUrlDecoded, query, params)
          : await accessor.executeQuery(databaseUrlDecoded, query);
      return { data };
    } catch (error) {
      lastError = error as Error;
      console.error(`Query attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 500));
      }
    }
  }

  throw new Error(lastError?.message);
}

export async function executeQueryDirectly<T>(query: string, params?: string[]): Promise<{ data: T[] }> {
  accessor.guardAgainstMaliciousQuery(query);

  try {
    return params && params.length > 0 ? await retryQuery<T>(query, params) : await retryQuery<T>(query);
  } catch (error) {
    console.error('Error executing SQL query:', { error, queryError: true });
    throw new Error(`Failed to execute SQL query: ${(error as Error).message}`);
  }
}
