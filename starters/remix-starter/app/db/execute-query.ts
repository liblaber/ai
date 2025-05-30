import { executePostgresQueryDirectly } from '@/db/execute-query.direct';
import { executePostgresQueryThroughProxy } from '@/db/execute-query.proxy';

export interface ExecuteQueryError {
  isError: true;
  errorMessage: string;
}

export type QueryData<T> = { isError: false; data: T } | ExecuteQueryError;

export async function executePostgresQuery<T>(query: string, params?: string[]): Promise<QueryData<T[]>> {
  let result: { data: T[] };

  try {
    guardAgainstMaliciousQuery(query);

    if (import.meta.env.VITE_PROD) {
      result = await executePostgresQueryDirectly<T>(query, params);
    } else {
      result = await executePostgresQueryThroughProxy<T>(query, params);
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

function guardAgainstMaliciousQuery(query?: string) {
  if (!query) {
    throw new Error('No SQL query provided. Please provide a valid SQL query to execute.');
  }

  const normalizedQuery = query.trim().toUpperCase();

  if (!normalizedQuery.startsWith('SELECT') && !normalizedQuery.startsWith('WITH')) {
    throw new Error('Only SELECT queries are allowed for security reasons');
  }

  const forbiddenKeywords = [
    'INSERT ',
    'UPDATE ',
    'DELETE ',
    'DROP ',
    'TRUNCATE ',
    'ALTER ',
    'CREATE ',
    'GRANT ',
    'REVOKE ',
  ];

  if (forbiddenKeywords.some((keyword) => normalizedQuery.includes(keyword))) {
    throw new Error('Query contains forbidden SQL keywords');
  }
}
