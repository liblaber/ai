import { executeQueryThroughProxy } from './execute-query.proxy';
import { executeQueryDirectly } from '@/db/execute-query.direct';

export type QueryData<T> =
  | { isError: false; data: T }
  | {
      isError: true;
      errorMessage: string;
    };

export async function executeQuery<T>(query: string, params?: string[]): Promise<QueryData<T[]>> {
  let result: { data: T[] };

  try {
    if (process.env.NODE_ENV === 'production') {
      result = await executeQueryDirectly(query, params);
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
