import { DataAccessor } from '@/lib/data-access/dataAccessor';
import { decodeUrlCompletely } from '@/utils/url-decoder';

export type QueryData<T> =
  | { isError: false; data: T }
  | {
      isError: true;
      errorMessage: string;
    };

export async function executeQuery<T>(query: string, params?: string[]): Promise<QueryData<T[]>> {
  let result: { data: T[] };

  try {
    result = await executeQueryDirectly<T>(query, params);

    return {
      ...result,
      isError: false,
    };
  } catch (error) {
    const typedError = error as Error;
    const errorMessage = typedError?.message || `Something went wrong executing the query: ${query}`;

    return {
      isError: true,
      errorMessage,
    };
  }
}

let accessor: ReturnType<typeof DataAccessor.getDatabaseAccessor> | null = null;

async function getAccessor() {
  if (!accessor) {
    accessor = DataAccessor.getDatabaseAccessor(process.env.DATA_SOURCE_TYPE);
    const databaseUrlDecoded = decodeUrlCompletely(process.env.CONNECTION_URL || '');
    await accessor.initialize(databaseUrlDecoded);
  }

  return accessor;
}

// Cleanup function to be called when the application shuts down
export async function cleanupDatabaseConnection() {
  if (accessor) {
    await accessor.close();
    accessor = null;
  }
}

async function retryQuery<T>(query: string, params?: string[], maxRetries = 1): Promise<{ data: T[] }> {
  let lastError: Error | null = null;
  const currentAccessor = await getAccessor();

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const data =
        params && params.length > 0
          ? await currentAccessor.executeQuery(query, params)
          : await currentAccessor.executeQuery(query);
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
  const currentAccessor = await getAccessor();
  currentAccessor.guardAgainstMaliciousQuery(query);

  try {
    return params && params.length > 0 ? await retryQuery<T>(query, params) : await retryQuery<T>(query);
  } catch (error) {
    console.error('Error executing query:', { error, queryError: true });
    throw new Error(`Failed to execute query: ${(error as Error).message}`);
  }
}
