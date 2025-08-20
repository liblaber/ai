import type {
  DataAccessPluginId,
  DataSourceProperty,
  DataSourcePropertyDescriptor,
  DataSourceType,
} from './utils/types';

export interface BaseAccessor {
  /**
   * Returns a list of required properties for this data source type
   */
  getRequiredDataSourcePropertyDescriptors(): DataSourcePropertyDescriptor[];

  /**
   * Tests if a connection can be established to the datasource
   * @param dataSourceProperties - Array of data source properties required to establish the connection
   * @returns Promise resolving to true if connection is successful, false otherwise
   */
  testConnection(dataSourceProperties: DataSourceProperty[]): Promise<boolean>;

  /**
   * Validates properties required to connect to the datasource
   * @param dataSourceProperties - Array of data source properties to validate
   * @throws Error if any required property is missing or invalid
   */
  validateProperties(dataSourceProperties: DataSourceProperty[]): void;

  /** The type of data source this accessor supports */
  readonly dataSourceType: DataSourceType;

  /** A human-readable label identifying this accessor type */
  readonly label: string;

  /**  The unique identifier for the plugin this accessor belongs to */
  readonly pluginId: DataAccessPluginId;
}
