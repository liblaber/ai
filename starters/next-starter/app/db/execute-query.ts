import { executeQueryThroughProxy } from './execute-query.proxy';

export interface ExecuteQueryError {
  isError: true;
  errorMessage: string;
}

export type QueryData<T> = { isError: false; data: T } | ExecuteQueryError;

export async function executeQuery<T>(query: string, params?: string[]): Promise<QueryData<T[]>> {
  let result: { data: T[] };

  try {
    result = await executeQueryThroughProxy<T>(query, params);

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
