import pkg from 'pg';

const { Pool } = pkg;
const types = pkg.types;

// Scalars
const typesToParse = [types.builtins.INT4, types.builtins.INT8, types.builtins.NUMERIC];

// Arrays
const arrayTypesToParse = [
  1007, // INT4[]
  1016, // INT8[]
  1231, // NUMERIC[]
];

typesToParse.forEach((type) => {
  types.setTypeParser(type, (value) => parseFloat(value));
});

arrayTypesToParse.forEach((type) => {
  types.setTypeParser(type, (value) => {
    return value
      .slice(1, -1) // remove curly braces
      .split(',')
      .map((v) => (v === 'NULL' ? null : parseFloat(v)));
  });
});

export interface Column {
  name: string;
  type: string;
  isPrimary: boolean;
  enumValues?: string[];
}

export interface Table {
  tableName: string;
  columns: Column[];
}

const pool = new Pool({
  connectionString: decodeURIComponent(process.env.DATABASE_URL || ''),
  connectionTimeoutMillis: 10000, // Increased to 10 seconds
  idleTimeoutMillis: 60000, // 1 minute
  max: 10, // Increased pool size
  ssl: {
    rejectUnauthorized: false, // Required for RDS connections
  },
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

async function retryQuery<T>(query: string, params?: string[], maxRetries = 1): Promise<{ data: T[] }> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = params && params.length > 0 ? await pool.query(query, params) : await pool.query(query);
      return { data: result.rows };
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

export async function executePostgresQueryDirectly<T>(query: string, params?: string[]): Promise<{ data: T[] }> {
  try {
    return params && params.length > 0 ? await retryQuery<T>(query, params) : await retryQuery<T>(query);
  } catch (error) {
    console.error('Error executing SQL query:', { error, queryError: true });
    throw new Error(`Failed to execute SQL query: ${(error as Error).message}`);
  }
}
