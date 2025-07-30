import { type Table } from '../types';

export interface BaseAccessor {
  /**
   * Returns the format of the connection string for this accessor
   * @returns The format of the connection string
   */
  readonly connectionStringFormat: string;

  /**
   * Placeholder used in prepared statements for this accessor as an example for the LLM
   * @returns The placeholder string, e.g. "?" for SQLite, "$1, $2" for Postgres
   */
  readonly preparedStatementPlaceholderExample: string;

  /**
   * Executes a SQL query against the database
   * @param query - The SQL query string to execute
   * @param params - Optional array of parameters to safely substitute into the query
   * @returns Promise resolving to an array of query results
   */
  executeQuery: (query: string, params?: string[]) => Promise<any[]>;

  /**
   * Validates a query string to prevent SQL injection attacks
   * @param query - The SQL query string to validate
   * @throws Error if the query contains potentially malicious content
   */
  guardAgainstMaliciousQuery: (query: string) => void;

  /**
   * Validates a connection string for this accessor
   * @param connectionString - The connection string to validate
   * @throws Error if the connection string is invalid
   */
  validate: (connectionString: string) => void;

  /**
   * Retrieves the database schema information
   * @returns Promise resolving to an array of Table objects describing the database structure
   */
  getSchema: () => Promise<Table[]>;

  /**
   * Tests if a connection can be established to the database
   * @param databaseUrl - The connection URL for the database
   * @returns Promise resolving to true if connection is successful, false otherwise
   */
  testConnection: (databaseUrl: string) => Promise<boolean>;

  /**
   * Initializes the database connection
   * @param databaseUrl - The connection URL for the database
   */
  initialize: (databaseUrl: string) => void | Promise<void>;

  /**
   * Closes the database connection and cleans up resources
   * @returns Promise that resolves when the connection is fully closed
   */
  close: () => Promise<void>;

  /** A human-readable label identifying this accessor type */
  readonly label: string;
}

export interface Plugin {
  pluginId: string;
}

export interface BaseAccessorConstructor extends Plugin {
  new (): BaseAccessor;

  /**
   * Determines if this accessor type can handle the given database URL
   * @param databaseUrl - The connection URL to check
   * @returns true if this accessor can handle the URL, false otherwise
   */
  isAccessor(databaseUrl: string): boolean;
}
