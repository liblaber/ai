import { type Table } from '../types';
import {
  type DataAccessPluginId,
  type DataSourceProperty,
  type DataSourcePropertyDescriptor,
  DataSourcePropertyType,
  type DataSourceType,
} from './utils/types';
import type { BaseAccessor } from './baseAccessor';

export abstract class BaseDatabaseAccessor implements BaseAccessor {
  getRequiredDataSourcePropertyDescriptors(): DataSourcePropertyDescriptor[] {
    return [
      {
        type: DataSourcePropertyType.CONNECTION_URL,
        label: 'Connection URL',
        format: this.connectionStringFormat,
      },
    ];
  }

  /** The type of data source this accessor supports */
  abstract readonly dataSourceType: DataSourceType;

  /**
   * Returns the format of the connection string for this accessor
   * @returns The format of the connection string
   */
  abstract readonly connectionStringFormat: string;

  /** A human-readable label identifying this accessor type */
  abstract readonly label: string;

  /** The unique identifier for the plugin this accessor belongs to */
  abstract readonly pluginId: DataAccessPluginId;

  /**
   * Placeholder used in prepared statements for this accessor as an example for the LLM
   * @returns The placeholder string, e.g. "?" for SQLite, "$1, $2" for Postgres
   */
  abstract readonly preparedStatementPlaceholderExample: string;

  /**
   * Executes a SQL query against the database
   * @param query - The SQL query string to execute
   * @param params - Optional array of parameters to safely substitute into the query
   * @returns Promise resolving to an array of query results
   */
  abstract executeQuery(query: string, params?: string[]): Promise<any[]>;

  /**
   * Validates a query string to prevent SQL injection attacks
   * @param query - The SQL query string to validate
   * @throws Error if the query contains potentially malicious content
   */
  abstract guardAgainstMaliciousQuery(query: string): void;

  /**
   * Validates properties required to connect to the datasource
   * @param dataSourceProperties - Array of data source properties to validate
   * @throws Error if any required property is missing or invalid
   */
  abstract validateProperties(dataSourceProperties: DataSourceProperty[]): void;

  /**
   * Retrieves the database schema information
   * @returns Promise resolving to an array of Table objects describing the database structure
   */
  abstract getSchema(): Promise<Table[]>;

  /**
   * Tests if a connection can be established to the datasource
   * @param dataSourceProperties - Array of data source properties required to establish the connection
   * @returns Promise resolving to true if connection is successful, false otherwise
   */
  abstract testConnection(dataSourceProperties: DataSourceProperty[]): Promise<boolean>;

  /**
   * Initializes the database connection
   * @param databaseUrl - The connection URL for the database
   */
  abstract initialize(databaseUrl: string): void | Promise<void>;

  /**
   * Closes the database connection and cleans up resources
   * @returns Promise that resolves when the connection is fully closed
   */
  abstract close(): Promise<void>;

  /**
   * Generates a sample schema for demonstration purposes when no real data source is connected
   * @returns Array of Table objects representing a sample schema for this database type
   */
  abstract generateSampleSchema(): Table[];

  /**
   * Formats a query string for display purposes
   * @param query - The raw query string to format
   * @returns The formatted query string
   */
  abstract formatQuery(query: string): string;

  /**
   * Generates the appropriate system prompt for query generation based on database type
   * @param databaseType - The database type identifier
   * @param dbSchema - The formatted database schema
   * @param existingQueries - Optional array of existing queries
   * @param userPrompt - The user's query request
   * @returns The system prompt for this database type
   */
  abstract generateSystemPrompt(
    databaseType: string,
    dbSchema: string,
    existingQueries: string[] | undefined,
    userPrompt: string,
  ): string;

  protected getConnectionStringFromProperties(dataSourceProperties: DataSourceProperty[]): string {
    const connectionUrlProperty = dataSourceProperties.find(
      (prop) => prop.type === DataSourcePropertyType.CONNECTION_URL,
    );

    if (!connectionUrlProperty || !connectionUrlProperty.value) {
      throw new Error('Missing required property: Connection URL');
    }

    return connectionUrlProperty.value;
  }
}
