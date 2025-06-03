import { executeQueryDirectly } from '@/db/execute-query.direct';
import { executeQueryThroughProxy } from '@/db/execute-query.proxy';

export interface ExecuteQueryError {
  isError: true;
  errorMessage: string;
}

export type QueryData<T> = { isError: false; data: T } | ExecuteQueryError;

export async function executeQuery<T>(query: string, params?: string[]): Promise<QueryData<T[]>> {
  let result: { data: T[] };

  try {
    if (import.meta.env.VITE_PROD) {
      result = await executeQueryDirectly<T>(query, params);
    } else {
      result = await executeQueryThroughProxy<T>(query, params);
    }

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
