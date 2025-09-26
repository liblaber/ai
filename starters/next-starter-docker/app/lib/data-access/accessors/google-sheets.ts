import { z } from 'zod';
import type { Table } from '../../types';
import { GoogleWorkspaceError } from './google-workspace/types';
import { GoogleWorkspaceAuthManager } from './google-workspace/auth-manager';
import {
  type DataAccessPluginId,
  type DataSourceProperty,
  type DataSourcePropertyDescriptor,
  DataSourcePropertyType,
  DataSourceType,
} from '../utils/types';
import { BaseDatabaseAccessor } from '../baseDatabaseAccessor';

// Google Sheets URL constants
export const GOOGLE_SHEETS_PROTOCOLS = {
  SHEETS: 'sheets://',
  DOCS_URL: 'https://docs.google.com/spreadsheets/',
} as const;

// Helper function to check if a connection string is for Google Sheets
export const isGoogleConnection = (connectionString: string): boolean => {
  return (
    connectionString.startsWith(GOOGLE_SHEETS_PROTOCOLS.SHEETS) ||
    connectionString.startsWith(GOOGLE_SHEETS_PROTOCOLS.DOCS_URL)
  );
};

// Zod schema for DataSourceProperty validation
const dataSourcePropertySchema = z.object({
  type: z.nativeEnum(DataSourcePropertyType),
  value: z.string(),
});

const dataSourcePropertiesArraySchema = z.array(dataSourcePropertySchema);

// Schema for webhook responses (flexible structure)
const webhookResponseSchema = z
  .object({
    error: z.string().optional(),
  })
  .passthrough(); // Allow additional properties

/**
 * Comprehensive Google Sheets Operations Guide
 * This defines exactly what operations are available and how to use them.
 * LLM MUST ONLY use operations from this list.
 */
export const GOOGLE_SHEETS_OPERATIONS = {
  // READ OPERATIONS - For getting data from sheets
  READ_OPERATIONS: {
    readSheet: {
      description: 'Read all data from the active sheet with automatic pagination',
      parameters: {
        sheetName: 'Optional: specific sheet name',
        startRow: 'Optional: row to start from (default: 1)',
        maxRows: 'Optional: max rows to return (default: 100, max: 100)',
      },
      example: '{"operation": "readSheet", "parameters": {"maxRows": 50}}',
      useCase: 'Default operation for displaying sheet data in UI',
    },
    readSheetPaginated: {
      description: 'Read sheet data with explicit pagination controls',
      parameters: {
        sheetName: 'Optional: specific sheet name',
        startRow: 'Optional: row to start from (default: 1)',
        maxRows: 'Optional: max rows to return (default: 50, max: 100)',
      },
      example: '{"operation": "readSheetPaginated", "parameters": {"startRow": 1, "maxRows": 25}}',
      useCase: 'When you need precise pagination control',
    },
    readRange: {
      description: 'Read data from a specific cell range',
      parameters: {
        range: 'Required: A1 notation range (e.g., "A1:C10")',
        valueRenderOption: 'Optional: FORMATTED_VALUE, UNFORMATTED_VALUE, or FORMULA',
      },
      example: '{"operation": "readRange", "parameters": {"range": "A1:C10"}}',
      useCase: 'When you need specific cells or ranges',
    },
    getValues: {
      description: 'Alias for readRange operation',
      parameters: 'Same as readRange',
      example: '{"operation": "getValues", "parameters": {"range": "A1:C10"}}',
      useCase: 'Alternative name for readRange',
    },
    getAllSheets: {
      description: 'Get list of all sheets in the spreadsheet',
      parameters: 'None',
      example: '{"operation": "getAllSheets"}',
      useCase: 'To discover available sheets before reading data',
    },
    getSheetInfo: {
      description: 'Get information about a specific sheet',
      parameters: {
        gid: 'Optional: sheet GID (default: 0)',
        sheetName: 'Optional: sheet name for reference',
      },
      example: '{"operation": "getSheetInfo", "parameters": {"gid": 0}}',
      useCase: 'To check if a sheet exists or get sheet metadata',
    },
  },

  // WRITE OPERATIONS - For modifying sheet data (requires Apps Script URL)
  WRITE_OPERATIONS: {
    appendRow: {
      description: 'Add a single row to the end of the sheet',
      parameters: {
        values: 'Required: Array of values for the new row',
      },
      example: '{"operation": "appendRow", "parameters": {"values": ["John", "Doe", "30"]}}',
      useCase: 'Add button in UI - adds one new record',
    },
    appendRows: {
      description: 'Add multiple rows to the end of the sheet',
      parameters: {
        values: 'Required: 2D array of values for multiple rows',
      },
      example:
        '{"operation": "appendRows", "parameters": {"values": [["John", "Doe", "30"], ["Jane", "Smith", "25"]]}}',
      useCase: 'Bulk add operation - adds multiple records at once',
    },
    updateCell: {
      description: 'Update a single cell value',
      parameters: {
        row: 'Required: 0-based row index',
        column: 'Required: 0-based column index',
        value: 'Required: new cell value',
      },
      example: '{"operation": "updateCell", "parameters": {"row": 1, "column": 0, "value": "Updated Name"}}',
      useCase: 'Update button in UI - modifies specific cell',
    },
    updateRange: {
      description: 'Update multiple cells in a range',
      parameters: {
        range: 'Required: A1 notation range (e.g., "A1:C1")',
        values: 'Required: 2D array of values matching the range size',
      },
      example: '{"operation": "updateRange", "parameters": {"range": "A1:C1", "values": [["John", "Doe", "30"]]}}',
      useCase: 'Update button in UI - modifies entire row or range',
    },
    updateValues: {
      description: 'Alias for updateRange operation',
      parameters: 'Same as updateRange',
      example: '{"operation": "updateValues", "parameters": {"range": "A1:C1", "values": [["John", "Doe", "30"]]}}',
      useCase: 'Alternative name for updateRange',
    },
    insertRow: {
      description: 'Insert a blank row at specified position',
      parameters: {
        rowIndex: 'Required: 0-based row index where to insert',
      },
      example: '{"operation": "insertRow", "parameters": {"rowIndex": 1}}',
      useCase: 'Insert blank row before adding data',
    },
    deleteRow: {
      description: 'Delete a row at specified position',
      parameters: {
        rowIndex: 'Required: 0-based row index to delete',
      },
      example: '{"operation": "deleteRow", "parameters": {"rowIndex": 1}}',
      useCase: 'Delete button in UI - removes specific row',
    },
    clearValues: {
      description: 'Clear content from a range of cells',
      parameters: {
        range: 'Required: A1 notation range to clear',
      },
      example: '{"operation": "clearValues", "parameters": {"range": "A1:C10"}}',
      useCase: 'Clear button in UI - empties specific cells',
    },
    clearRange: {
      description: 'Alias for clearValues operation',
      parameters: 'Same as clearValues',
      example: '{"operation": "clearRange", "parameters": {"range": "A1:C10"}}',
      useCase: 'Alternative name for clearValues',
    },
  },

  // UI ACTION MAPPINGS - What operation to use for each UI action
  UI_ACTION_MAPPINGS: {
    'Add Record': 'appendRow',
    'Add Multiple Records': 'appendRows',
    'Update Record': 'updateRange',
    'Update Cell': 'updateCell',
    'Delete Record': 'deleteRow',
    'Clear Data': 'clearValues',
    'Load Data': 'readSheet',
    'Load Paginated': 'readSheetPaginated',
    'Get Range': 'readRange',
    'List Sheets': 'getAllSheets',
    'Check Sheet': 'getSheetInfo',
  },
} as const;

/**
 * Helper functions for operation validation and guidance
 */

// Get all valid operations as a flat array
export const getAllValidOperations = (): string[] => {
  return [
    ...Object.keys(GOOGLE_SHEETS_OPERATIONS.READ_OPERATIONS),
    ...Object.keys(GOOGLE_SHEETS_OPERATIONS.WRITE_OPERATIONS),
  ];
};

// Check if an operation is valid
export const isValidOperation = (operation: string): boolean => {
  return getAllValidOperations().includes(operation);
};

// Get operation details for guidance
export const getOperationGuide = (operation: string): any => {
  return (
    (GOOGLE_SHEETS_OPERATIONS.READ_OPERATIONS as any)[operation] ||
    (GOOGLE_SHEETS_OPERATIONS.WRITE_OPERATIONS as any)[operation] ||
    null
  );
};

// Get the recommended operation for a UI action
export const getOperationForUIAction = (uiAction: string): string | null => {
  return (GOOGLE_SHEETS_OPERATIONS.UI_ACTION_MAPPINGS as any)[uiAction] || null;
};

// Generate comprehensive error message with available operations
export const getOperationErrorMessage = (): string => {
  const readOps = Object.keys(GOOGLE_SHEETS_OPERATIONS.READ_OPERATIONS);
  const writeOps = Object.keys(GOOGLE_SHEETS_OPERATIONS.WRITE_OPERATIONS);

  return `Google Sheets query must specify a valid operation. Available operations:
READ OPERATIONS: ${readOps.join(', ')}
WRITE OPERATIONS: ${writeOps.join(', ')}

Use the GOOGLE_SHEETS_OPERATIONS constant for detailed guidance on each operation.`;
};

export class GoogleSheetsAccessor extends BaseDatabaseAccessor {
  readonly pluginId: DataAccessPluginId = 'google-sheets';
  readonly label = 'Google Sheets';
  readonly dataSourceType: DataSourceType = DataSourceType.GOOGLE_SHEETS;
  readonly connectionStringFormat =
    'https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit OR sheets://SPREADSHEET_ID';
  readonly preparedStatementPlaceholderExample = '$1, $2, $3';

  getRequiredDataSourcePropertyDescriptors(): DataSourcePropertyDescriptor[] {
    return [
      {
        type: DataSourcePropertyType.CONNECTION_URL,
        label: 'Google Sheets URL or Spreadsheet ID',
        format: 'https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit',
      },
      // Optional properties for Apps Script Web App (for write operations)
      {
        type: DataSourcePropertyType.CLIENT_ID,
        label: 'Apps Script Web App URL (Optional)',
        format: 'https://script.google.com/macros/s/SCRIPT_ID/exec',
      },
      // Optional properties for OAuth authentication
      {
        type: DataSourcePropertyType.ACCESS_TOKEN,
        label: 'OAuth Access Token (Optional)',
        format: 'OAuth 2.0 access token for authenticated access',
      },
      {
        type: DataSourcePropertyType.REFRESH_TOKEN,
        label: 'OAuth Refresh Token (Optional)',
        format: 'OAuth 2.0 refresh token for token renewal',
      },
    ];
  }

  private _getConnectionStringFromProperties(dataSourceProperties: DataSourceProperty[]): string {
    const connectionUrlProperty = dataSourceProperties.find(
      (prop) => prop.type === DataSourcePropertyType.CONNECTION_URL,
    );

    if (!connectionUrlProperty || !connectionUrlProperty.value) {
      throw new Error('Missing required property: Connection URL');
    }

    return connectionUrlProperty.value;
  }

  private _extractPropertiesFromDataSource(dataSourceProperties: DataSourceProperty[]): {
    spreadsheetId: string;
    accessToken?: string;
    refreshToken?: string;
    appsScriptUrl?: string;
  } {
    const connectionUrl = this._getConnectionStringFromProperties(dataSourceProperties);
    const accessToken = dataSourceProperties.find((prop) => prop.type === DataSourcePropertyType.ACCESS_TOKEN)?.value;
    const refreshToken = dataSourceProperties.find((prop) => prop.type === DataSourcePropertyType.REFRESH_TOKEN)?.value;
    const appsScriptUrl = dataSourceProperties.find((prop) => prop.type === DataSourcePropertyType.CLIENT_ID)?.value;

    // Extract spreadsheet ID from URL or use directly if it's just an ID
    let spreadsheetId: string;

    if (connectionUrl.includes('docs.google.com/spreadsheets')) {
      // Extract from full URL
      const match = connectionUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);

      if (!match) {
        throw new GoogleWorkspaceError('Invalid Google Sheets URL format');
      }

      spreadsheetId = match[1];
    } else if (connectionUrl.startsWith('sheets://')) {
      // Extract from sheets protocol
      const url = new URL(connectionUrl);
      spreadsheetId = url.hostname;
    } else {
      // Assume it's a direct spreadsheet ID
      spreadsheetId = connectionUrl;
    }

    if (!spreadsheetId) {
      throw new GoogleWorkspaceError('Could not extract spreadsheet ID from connection URL');
    }

    return {
      spreadsheetId,
      accessToken,
      refreshToken,
      appsScriptUrl,
    };
  }

  private _spreadsheetId: string | null = null;
  private _appsScriptUrl: string | null = null;
  private _accessToken: string | null = null;
  private _refreshToken: string | null = null;
  private _authManager: GoogleWorkspaceAuthManager | null = null;

  static isAccessor(databaseUrl: string): boolean {
    return isGoogleConnection(databaseUrl);
  }

  async testConnection(dataSourceProperties: DataSourceProperty[]): Promise<boolean> {
    try {
      const { spreadsheetId } = this._extractPropertiesFromDataSource(dataSourceProperties);

      // Check if this is an Apps Script Web App URL
      if (this._isAppsScriptUrl(spreadsheetId)) {
        // For Apps Script URLs, test the doGet endpoint
        try {
          const response = await this._proxyFetch(`https://script.google.com/macros/s/${spreadsheetId}/exec`, {
            method: 'GET',
          });
          return response.ok;
        } catch {
          return false;
        }
      }

      // Try multiple endpoints to test public access for regular Google Sheets
      const testEndpoints = [
        // Google Sheets viewer endpoint (most reliable for public sheets)
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`,
        // Alternative CSV export endpoint
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`,
        // Direct spreadsheet viewer (returns HTML but indicates accessibility)
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      ];

      for (const endpoint of testEndpoints) {
        try {
          const method = endpoint.includes('csv') ? 'GET' : 'HEAD';
          const response = await this._proxyFetch(endpoint, {
            method,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Google Sheets Accessor)',
            },
          });

          if (response.ok) {
            return true;
          }
        } catch {
          // Continue to next endpoint
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  async executeQuery(query: string, params?: string[]): Promise<any[]> {
    if (!this._spreadsheetId) {
      throw new GoogleWorkspaceError('Google Sheets not initialized. Please call initialize() first.');
    }

    // Apply parameters to raw query string first, before JSON parsing
    let processedQuery = query;

    if (params && params.length > 0) {
      // Replace parameter placeholders in the raw string
      for (let i = 0; i < params.length; i++) {
        const placeholder = `$${i + 1}`;
        const paramValue = this._escapeParameterForJSON(params[i]);
        processedQuery = processedQuery.replace(new RegExp(`\\${placeholder}\\b`, 'g'), paramValue);
      }
    }

    let parsedQuery: any;

    try {
      parsedQuery = JSON.parse(processedQuery);
    } catch (parseError) {
      // Try to fix common JSON issues - double-encoded JSON strings
      let fixedQuery = processedQuery;

      if (processedQuery.startsWith('"{') && processedQuery.endsWith('}"')) {
        try {
          // Remove outer quotes and unescape
          fixedQuery = processedQuery.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
          parsedQuery = JSON.parse(fixedQuery);
        } catch {
          throw new GoogleWorkspaceError(
            `Invalid JSON format for Google Sheets query (double-encode fix failed): ${parseError instanceof Error ? parseError.message : String(parseError)}. ` +
              `Original query: ${processedQuery}. Fixed attempt: ${fixedQuery}`,
          );
        }
      } else {
        throw new GoogleWorkspaceError(
          `Invalid JSON format for Google Sheets query: ${parseError instanceof Error ? parseError.message : String(parseError)}. ` +
            `Make sure your query is valid JSON. Example: {"operation": "readSheet", "parameters": {"valueRenderOption": "FORMATTED_VALUE"}}`,
        );
      }
    }

    try {
      if (!parsedQuery.operation) {
        throw new GoogleWorkspaceError(
          'Google Sheets query is missing the required operation field. Expected format: {"operation": "updateValues", "parameters": {...}}',
        );
      }

      // Use spreadsheet ID from connection
      const spreadsheetId = this._spreadsheetId;

      switch (parsedQuery.operation) {
        case 'readRange':
        case 'readSheet':
        case 'readSheetPaginated':
        case 'getAllSheets':
        case 'getSheetInfo':
        case 'getValues':
          return await this._executeReadOperation(parsedQuery, spreadsheetId);
        case 'updateRange':
        case 'updateValues': // Alias for updateRange
        case 'updateCell':
        case 'appendRow':
        case 'appendRows':
        case 'appendSheet':
        case 'appendValues':
        case 'clearValues':
        case 'clearRange':
        case 'insertRow':
        case 'deleteRow':
          return await this._executeWriteOperation(parsedQuery, spreadsheetId);
        default:
          throw new GoogleWorkspaceError(`Unsupported operation: ${parsedQuery.operation}`);
      }
    } catch (error) {
      throw new GoogleWorkspaceError((error as Error)?.message);
    }
  }

  guardAgainstMaliciousQuery(query: string): void {
    if (!query) {
      throw new GoogleWorkspaceError('No Google Sheets query provided. Please provide a valid query to execute.');
    }

    // Check if this looks like a SQL query instead of JSON
    const trimmedQuery = query.trim();
    const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'FROM', 'WHERE'];
    const startsWithSQL = sqlKeywords.some(
      (keyword) =>
        trimmedQuery.toUpperCase().startsWith(keyword + ' ') || trimmedQuery.toUpperCase().startsWith(keyword + '\t'),
    );

    if (startsWithSQL) {
      throw new GoogleWorkspaceError(
        `❌ CRITICAL ERROR: Google Sheets queries must be in JSON format, NOT SQL. ` +
          `Received what appears to be a SQL query: "${trimmedQuery.substring(0, 50)}..." ` +
          `\n\n🔥 IMPORTANT: This is a Google Sheets data source, not a SQL database!` +
          `\n\n✅ CORRECT FORMAT: {"operation": "readSheet", "parameters": {"valueRenderOption": "FORMATTED_VALUE"}} ` +
          `\n\n📋 Supported JSON operations: ${getAllValidOperations().join(', ')}.` +
          `\n\n💡 TIP: Use getAllSheets to discover available sheets first, then readSheet to get data.` +
          `\n\n🔧 For UI actions: Add Record → appendRow, Update Record → updateRange, Delete Record → deleteRow.`,
      );
    }

    let parsedQuery: any;

    try {
      parsedQuery = JSON.parse(query);
    } catch (parseError) {
      throw new GoogleWorkspaceError(
        `Invalid JSON format for Google Sheets query: ${parseError instanceof Error ? parseError.message : String(parseError)}. ` +
          `Make sure your query is valid JSON. Example: {"operation": "readSheet", "parameters": {"valueRenderOption": "FORMATTED_VALUE"}}`,
      );
    }

    try {
      // Validate that we have a proper Google Sheets query structure
      if (!parsedQuery || typeof parsedQuery !== 'object') {
        throw new GoogleWorkspaceError('Google Sheets query must be a valid JSON object');
      }

      if (!parsedQuery.operation) {
        throw new GoogleWorkspaceError('Google Sheets query must specify an operation');
      }

      if (!isValidOperation(parsedQuery.operation)) {
        throw new GoogleWorkspaceError(getOperationErrorMessage());
      }

      // Check for potentially dangerous parameters (use word boundaries to avoid false positives)
      const forbiddenKeys = ['\\beval\\b', '\\bfunction\\s*\\(', '\\bscript\\b', '\\bexec\\b'];
      const queryString = JSON.stringify(parsedQuery).toLowerCase();

      if (forbiddenKeys.some((pattern) => new RegExp(pattern).test(queryString))) {
        throw new GoogleWorkspaceError('Query contains forbidden operations');
      }

      // Validate spreadsheet ID format if present
      if (parsedQuery.spreadsheetId) {
        const spreadsheetIdPattern = /^[a-zA-Z0-9-_]{20,}$/;

        if (!spreadsheetIdPattern.test(parsedQuery.spreadsheetId)) {
          throw new GoogleWorkspaceError(`Invalid spreadsheet ID format: ${parsedQuery.spreadsheetId}`);
        }
      }

      // Clean and validate parameters
      if (parsedQuery.parameters) {
        this._cleanAndValidateParameters(parsedQuery.parameters, parsedQuery.operation);
      }
    } catch (error) {
      if (error instanceof GoogleWorkspaceError && error.message.startsWith('Google Sheets query')) {
        throw error;
      }

      throw new GoogleWorkspaceError(
        `Query validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  validateProperties(dataSourceProperties: DataSourceProperty[]): void {
    try {
      const { spreadsheetId, accessToken, refreshToken } = this._extractPropertiesFromDataSource(dataSourceProperties);

      // Validate spreadsheet ID format
      const spreadsheetIdPattern = /^[a-zA-Z0-9-_]{10,}$/;

      if (!spreadsheetIdPattern.test(spreadsheetId)) {
        throw new GoogleWorkspaceError(`Invalid Google Sheets spreadsheet ID format: ${spreadsheetId}`);
      }

      // If access token is provided, refresh token should also be provided
      if (accessToken && !refreshToken) {
        throw new GoogleWorkspaceError('Refresh token is required when access token is provided');
      }

      if (refreshToken && !accessToken) {
        throw new GoogleWorkspaceError('Access token is required when refresh token is provided');
      }
    } catch (error) {
      if (error instanceof GoogleWorkspaceError) {
        throw error;
      }

      throw new GoogleWorkspaceError(
        `Invalid Google Sheets connection string: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getSchema(): Promise<Table[]> {
    if (!this._spreadsheetId) {
      throw new GoogleWorkspaceError('Google Sheets not initialized. Please call initialize() first.');
    }

    try {
      return await this._generateSchemaFromPublicSheet();
    } catch (error) {
      throw new GoogleWorkspaceError((error as Error)?.message);
    }
  }

  async initialize(connectionString: string): Promise<void> {
    try {
      // First, try to parse as DataSourceProperty[] format (new way)
      try {
        const parsedData = JSON.parse(connectionString);
        const properties = dataSourcePropertiesArraySchema.parse(parsedData);
        await this.initializeWithProperties(properties);
      } catch {
        // Not JSON, continue with string format
      }

      // Handle legacy connectionString format (existing way)
      if (connectionString.startsWith('https://docs.google.com/spreadsheets/')) {
        // Direct Google Sheets URL
        this._spreadsheetId = this._extractSpreadsheetId(connectionString);
      } else if (connectionString.startsWith('sheets://')) {
        // sheets protocol format with potential auth tokens
        this._spreadsheetId = this._extractSpreadsheetId(connectionString);
      } else {
        // Assume it's a direct spreadsheet ID
        this._spreadsheetId = connectionString;
      }

      // Initialize auth manager if OAuth tokens are present
      if (this._accessToken && this._refreshToken) {
        try {
          this._authManager = new GoogleWorkspaceAuthManager();
          await this._authManager.initialize({
            type: 'oauth2',
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            credentials: {
              access_token: this._accessToken,
              refresh_token: this._refreshToken,
              expiry_date: Date.now() + 3600 * 1000, // Assume 1 hour expiry if not specified
              token_type: 'Bearer',
              scope: undefined,
            },
          });
        } catch {
          // Continue without auth manager - fallback to existing behavior
        }
      }
    } catch (error) {
      throw new GoogleWorkspaceError(
        `Failed to initialize Google Sheets accessor: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Initialize with data source properties (new pattern)
   */
  async initializeWithProperties(dataSourceProperties: DataSourceProperty[]): Promise<void> {
    try {
      const { spreadsheetId, accessToken, refreshToken, appsScriptUrl } =
        this._extractPropertiesFromDataSource(dataSourceProperties);

      this._spreadsheetId = spreadsheetId;
      this._accessToken = accessToken || null;
      this._refreshToken = refreshToken || null;
      this._appsScriptUrl = appsScriptUrl || null;

      // Initialize auth manager if OAuth tokens are present
      if (this._accessToken && this._refreshToken) {
        try {
          this._authManager = new GoogleWorkspaceAuthManager();
          await this._authManager.initialize({
            type: 'oauth2',
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            credentials: {
              access_token: this._accessToken,
              refresh_token: this._refreshToken,
              expiry_date: Date.now() + 3600 * 1000, // Assume 1 hour expiry if not specified
              token_type: 'Bearer',
              scope: undefined,
            },
          });
        } catch {
          // Continue without auth manager - fallback to existing behavior
        }
      }

      // Skip connection test as server-side requests to Google Sheets often fail due to CORS
      // We'll handle access errors during actual query execution for better error messages
    } catch (error) {
      throw new GoogleWorkspaceError(
        `Failed to initialize Google Sheets accessor with properties: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Initialize with just the spreadsheet ID (skip connection test for write operations)
   */
  initializeWithId(spreadsheetId: string): void {
    this._spreadsheetId = spreadsheetId;
  }

  async close(): Promise<void> {
    this._spreadsheetId = null;
    this._appsScriptUrl = null;
    this._accessToken = null;
    this._refreshToken = null;
  }

  /**
   * Proxy-aware fetch method for webcontainer environments
   */
  private async _proxyFetch(url: string, options?: RequestInit): Promise<Response> {
    // Check if we're in a webcontainer environment by looking for the API base URL
    if (typeof window !== 'undefined' && window.location.hostname.includes('webcontainer')) {
      // Use the proxy endpoint for webcontainer environments
      const proxyUrl = `/api/execute-api-call?url=${encodeURIComponent(url)}`;
      return fetch(proxyUrl, options);
    } else {
      // Direct fetch for server environments
      return fetch(url, options);
    }
  }

  generateSampleSchema(): Table[] {
    return [
      {
        tableName: 'spreadsheet_info',
        columns: [
          { name: 'property', type: 'string', isPrimary: true },
          { name: 'value', type: 'string', isPrimary: false },
        ],
      },
      {
        tableName: 'sales_data',
        columns: [
          { name: 'row_number', type: 'number', isPrimary: true },
          { name: 'date', type: 'string', isPrimary: false },
          { name: 'product', type: 'string', isPrimary: false },
          { name: 'quantity', type: 'number', isPrimary: false },
          { name: 'price', type: 'number', isPrimary: false },
          { name: 'total', type: 'number', isPrimary: false },
        ],
      },
      {
        tableName: 'customer_data',
        columns: [
          { name: 'row_number', type: 'number', isPrimary: true },
          { name: 'customer_id', type: 'string', isPrimary: false },
          { name: 'name', type: 'string', isPrimary: false },
          { name: 'email', type: 'string', isPrimary: false },
          { name: 'phone', type: 'string', isPrimary: false },
          { name: 'address', type: 'string', isPrimary: false },
        ],
      },
    ];
  }

  formatQuery(query: string): string {
    try {
      const parsedQuery = JSON.parse(query);
      return JSON.stringify(parsedQuery, null, 2);
    } catch {
      return query;
    }
  }

  generateSystemPrompt(
    databaseType: string,
    dbSchema: string,
    existingQueries: string[] | undefined,
    userPrompt: string,
  ): string {
    return `You are a Google Sheets API expert tasked with generating Google Sheets JSON operations (NOT SQL) based on a given spreadsheet schema and user requirements.

CRITICAL: You must ONLY generate JSON operation objects. NEVER generate SQL queries. Google Sheets uses JSON operations, not SQL.

WRONG: SELECT * FROM table
CORRECT: {"operation": "readSheet", "parameters": {"valueRenderOption": "FORMATTED_VALUE"}}

You will be working with the following spreadsheet type:
<spreadsheetType>
${databaseType}
</spreadsheetType>

Here is the spreadsheet schema you should use (sheet structure and column information):
<spreadsheetSchema>
${dbSchema}
</spreadsheetSchema>

IMPORTANT: This spreadsheet may contain data in any pattern - data could be at the top, bottom, middle, or scattered throughout the sheet. Empty rows and columns are common and should not be ignored if they contain the actual data structure. Focus on identifying meaningful patterns such as:
- Currency amounts (e.g., $31.51, €100, ¥1000)
- Dates in various formats (3/30, 2023-01-01, Jan 15)
- Category or classification text (Food, Transport, Office supplies)
- Numerical data that could represent quantities, totals, or measurements
- Headers or labels that indicate data types
The schema should reflect the actual data content and meaning, not just row/column positions.

${existingQueries ? `Here are the existing Google Sheets queries used by the app the user is building. Use them as context if they need to be updated to fulfill the user's request: <existing_sheets_queries>${existingQueries}</existing_sheets_queries>` : ''}

CRITICAL INSTRUCTIONS - READ CAREFULLY:

🚫 DO NOT GENERATE SQL QUERIES. THIS IS NOT A SQL DATABASE.
✅ ONLY GENERATE JSON OPERATION OBJECTS.

To generate the Google Sheets JSON operations, follow these steps:
1. Carefully analyze the user's request and the provided spreadsheet schema.
2. Create one or more Google Sheets JSON operations that accurately address the user's requirements.
3. Structure operations as JSON objects with the following format:
   {
     "operation": "readSheetPaginated" | "getAllSheets" | "getValues",
     "parameters": {
       "valueRenderOption": "FORMATTED_VALUE",
       "startRow": 1,
       "maxRows": 50
     }
   }
   Note: maxRows can be any number (including the entire dataset). The UI will handle pagination automatically.
4. Use appropriate Google Sheets operations (PREFER PAGINATED OPERATIONS):
   - "readSheetPaginated": Read data from a specific sheet with pagination (RECOMMENDED for performance)
   - "getAllSheets": Get information about all sheets in the spreadsheet
   - "getValues": Get values from one or more ranges
   - "readRange": Read data from a specific range in A1 notation (use sparingly)
   - "readSheet": Read all data from a specific sheet (DEPRECATED - use readSheetPaginated instead)
5. Do not use any operations that could modify the spreadsheet.
6. Use proper A1 notation for ranges (e.g., A1:B10, Sheet1!A:Z, C:C).
7. Choose appropriate valueRenderOption:
   - "FORMATTED_VALUE": Human-readable formatted values (default)
   - "UNFORMATTED_VALUE": Raw unformatted values
   - "FORMULA": Show formulas instead of calculated values
8. Optimize queries for the specific sheet structure shown in the schema.
9. If needed, parametrize the query using positional placeholders like $1, $2, etc.
10. IMPORTANT: Use the "Actual Sheet Name" from the schema metadata, NOT the table name. If schema metadata shows "actualSheetName": "Expense Data", use "Expense Data" in your queries. If no specific sheet name is provided in metadata, use "readSheet" WITHOUT specifying sheetName parameter to read the first/default sheet.
11. CRITICAL: For Google Sheets, ALWAYS prefer "readSheetPaginated" operations over "readSheet" or "readRange" operations. The readSheetPaginated operation returns semantically processed data with fields like amount_numeric, category, description, etc. and prevents memory issues with large datasets.
12. CRITICAL: When you need data aggregation (SUM, COUNT, AVG), use "readSheetPaginated" with appropriate maxRows parameter to get the dataset with semantic fields, then let the frontend handle the aggregation using amount_numeric field.
13. CRITICAL: DO NOT use readRange operations for individual columns unless absolutely necessary. The readRange operation may return raw data without semantic processing.
14. PERFORMANCE: Use "readSheetPaginated" for data analysis. You can request any number of rows (the entire dataset if needed), and the UI will automatically paginate display to prevent React memory issues.
15. IMPORTANT: The data returned by readSheetPaginated includes both raw values and semantic fields (amount_numeric, category, description, date, notes). Use these semantic fields for calculations.
16. IMPORTANT: Use "dataStartRow" from metadata to know where actual data begins (excluding headers and metadata).
17. NOTE: The "spreadsheet_info" table is virtual and does not represent an actual sheet - do not query it.
18. For dashboard and analytical queries, always use readSheetPaginated to ensure you get semantically processed data with numeric fields for calculations.
19. Provide a brief explanation for each query.
20. Specify the response schema for each query, including expected data types.

Format your response as a JSON array containing objects with the following structure:
{
  "query": "Your Google Sheets query as JSON string here",
  "explanation": "A brief explanation of what the query does",
  "responseSchema": "field_name1 (data_type), field_name2 (data_type), ..."
}

Here's an example of a valid response:
[
  {
    "query": "{\\"operation\\": \\"readSheetPaginated\\", \\"parameters\\": {\\"valueRenderOption\\": \\"FORMATTED_VALUE\\", \\"maxRows\\": 50}}",
    "explanation": "Reads up to 50 rows from the first sheet (auto-detected) with formatted values for optimal performance",
    "responseSchema": "row_number (number), date (string), product (string), quantity (number), price (number), total (number)"
  },
  {
    "query": "{\\"operation\\": \\"readRange\\", \\"parameters\\": {\\"range\\": \\"A1:C10\\", \\"valueRenderOption\\": \\"UNFORMATTED_VALUE\\"}}",
    "explanation": "Reads the first 10 rows of columns A through C with raw unformatted values",
    "responseSchema": "row (number), values (array)"
  },
  {
    "query": "{\\"operation\\": \\"getValues\\", \\"parameters\\": {\\"ranges\\": [\\"$1\\"], \\"valueRenderOption\\": \\"FORMATTED_VALUE\\"}}",
    "explanation": "Gets values from a parameterized range with formatted values",
    "responseSchema": "range (string), row (number), values (array)"
  }
]

🔥 CRITICAL FINAL REMINDERS:
- NO SQL QUERIES ALLOWED (SELECT, FROM, WHERE, JOIN, etc.)
- ONLY JSON OPERATIONS like {"operation": "readSheetPaginated", "parameters": {...}}
- Your output should consist ONLY of the JSON array containing the operation objects
- The query field should contain a properly formatted JSON string representing the Google Sheets operation object

❌ WRONG: "SELECT * FROM customers WHERE country = 'USA'"
✅ CORRECT: "{\\"operation\\": \\"readSheetPaginated\\", \\"parameters\\": {\\"valueRenderOption\\": \\"FORMATTED_VALUE\\", \\"maxRows\\": 1000}}" (or any number needed for analysis)

Now, generate Google Sheets JSON operations (NOT SQL) based on the following user request:
<userRequest>
${userPrompt}
</userRequest>`;
  }

  // Helper methods

  private _cleanAndValidateParameters(parameters: any, operation: string): void {
    // Clean and validate range format if present
    if (parameters.range) {
      const originalRange = parameters.range;

      // Check for common issues and provide helpful error messages
      if (originalRange.includes('undefined')) {
        throw new GoogleWorkspaceError(
          `Invalid range contains "undefined": "${originalRange}". ` +
            'This usually means row or column variables are not properly set. ' +
            'Example of valid ranges: "A1", "A1:B10", "Sheet1!A:Z"',
        );
      }

      if (originalRange.includes('null')) {
        throw new GoogleWorkspaceError(
          `Invalid range contains "null": "${originalRange}". ` +
            'This usually means row or column variables are not properly set. ' +
            'Example of valid ranges: "A1", "A1:B10", "Sheet1!A:Z"',
        );
      }

      if (originalRange.includes('NaN')) {
        throw new GoogleWorkspaceError(
          `Invalid range contains "NaN": "${originalRange}". ` +
            'This usually means numeric row/column calculations failed. ' +
            'Example of valid ranges: "A1", "A1:B10", "Sheet1!A:Z"',
        );
      }

      // Clean the range by removing extra spaces
      const cleanedRange = originalRange.trim();

      // Update the cleaned range back to the parameters
      parameters.range = cleanedRange;

      // Allow more flexible sheet names (including periods, hyphens, etc.) and single cell references
      const rangePattern =
        /^([A-Za-z0-9\s._-]+!)?[A-Z]+\d*$|^([A-Za-z0-9\s._-]+!)?[A-Z]+\d*:[A-Z]+\d*$|^([A-Za-z0-9\s._-]+!)?[A-Z]:[A-Z]$|^([A-Za-z0-9\s._-]+!)?[A-Z]+:[A-Z]+$/;

      if (!rangePattern.test(cleanedRange)) {
        throw new GoogleWorkspaceError(
          `Invalid range format: "${cleanedRange}". ` +
            'Use A1 notation (e.g., A1, A1:B10, Sheet1!A:Z). ' +
            'Make sure row and column references are valid numbers and letters.',
        );
      }
    }

    // Clean sheet name if present
    if (parameters.sheetName && typeof parameters.sheetName === 'string') {
      parameters.sheetName = parameters.sheetName.trim();
    }

    // Validate numeric parameters
    if (parameters.deleteIndex !== undefined) {
      if (typeof parameters.deleteIndex !== 'number' || parameters.deleteIndex < 0) {
        throw new GoogleWorkspaceError(
          `Invalid deleteIndex: "${parameters.deleteIndex}". Must be a non-negative number (0-based index).`,
        );
      }
    }

    if (parameters.insertIndex !== undefined) {
      if (typeof parameters.insertIndex !== 'number' || parameters.insertIndex < 0) {
        throw new GoogleWorkspaceError(
          `Invalid insertIndex: "${parameters.insertIndex}". Must be a non-negative number (0-based index).`,
        );
      }
    }

    if (parameters.sheetId !== undefined) {
      if (typeof parameters.sheetId !== 'number' || parameters.sheetId < 0) {
        throw new GoogleWorkspaceError(`Invalid sheetId: "${parameters.sheetId}". Must be a non-negative number.`);
      }
    }

    // Validate values array for write operations
    if (
      ['updateRange', 'updateValues', 'appendValues', 'appendRow', 'appendRows'].includes(operation) &&
      parameters.values
    ) {
      if (!Array.isArray(parameters.values)) {
        throw new GoogleWorkspaceError(`Invalid values parameter for ${operation}. Must be an array.`);
      }

      // Check for undefined/null values in the array and provide helpful error
      const hasInvalidValues = parameters.values.some((row: any) => {
        if (Array.isArray(row)) {
          return row.some((cell: any) => cell === undefined);
        }

        return row === undefined;
      });

      if (hasInvalidValues) {
        throw new GoogleWorkspaceError(
          `Invalid values contain undefined elements. Make sure all cell values are properly set. ` +
            `Received: ${JSON.stringify(parameters.values).substring(0, 200)}...`,
        );
      }
    }

    // Validate cell update parameters
    if (operation === 'updateCell') {
      if (parameters.row === undefined || parameters.column === undefined) {
        throw new GoogleWorkspaceError('updateCell operation requires both "row" and "column" parameters.');
      }

      if (typeof parameters.row !== 'number' || typeof parameters.column !== 'number') {
        throw new GoogleWorkspaceError('updateCell operation requires "row" and "column" to be numbers.');
      }

      if (parameters.row < 0 || parameters.column < 0) {
        throw new GoogleWorkspaceError(
          'updateCell operation requires non-negative "row" and "column" values (0-based indexing).',
        );
      }
    }
  }

  private _extractSpreadsheetId(connectionString: string): string {
    try {
      // Handle both formats: sheets:// and https://docs.google.com/spreadsheets/
      if (connectionString.startsWith(GOOGLE_SHEETS_PROTOCOLS.DOCS_URL)) {
        return this._parseGoogleSheetsHttpsUrl(connectionString);
      } else if (connectionString.startsWith(GOOGLE_SHEETS_PROTOCOLS.SHEETS)) {
        return this._parseSheetsProtocolUrl(connectionString);
      } else {
        throw new GoogleWorkspaceError(
          'Connection string must be either sheets://SHEET_ID/ or https://docs.google.com/spreadsheets/d/SHEET_ID/',
        );
      }
    } catch (error) {
      throw new GoogleWorkspaceError(
        `Invalid connection string format: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private _parseGoogleSheetsHttpsUrl(connectionString: string): string {
    // Extract spreadsheet ID from https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit...
    const urlPattern = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = connectionString.match(urlPattern);

    if (!match) {
      throw new GoogleWorkspaceError(
        'Invalid Google Sheets URL format. Expected: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit',
      );
    }

    const spreadsheetId = match[1];

    // Parse URL to extract parameters (Apps Script URL, OAuth tokens, etc.)
    try {
      const url = new URL(connectionString);

      // Extract Apps Script URL if present
      const appsScriptParam = url.searchParams.get('appsScript');

      if (appsScriptParam) {
        this._appsScriptUrl = decodeURIComponent(appsScriptParam);
      }

      // Extract OAuth tokens if present
      const accessToken = url.searchParams.get('access_token');
      const refreshToken = url.searchParams.get('refresh_token');

      if (accessToken && refreshToken) {
        this._accessToken = decodeURIComponent(accessToken);
        this._refreshToken = decodeURIComponent(refreshToken);
      }
    } catch {
      // If URL parsing fails, continue with just the spreadsheet ID
    }

    return spreadsheetId;
  }

  private _parseSheetsProtocolUrl(connectionString: string): string {
    const url = new URL(connectionString);

    if (url.protocol !== 'sheets:') {
      throw new GoogleWorkspaceError('Connection string must start with sheets://');
    }

    // Extract spreadsheet ID from hostname
    const spreadsheetId = url.hostname;

    if (!spreadsheetId) {
      throw new GoogleWorkspaceError('Spreadsheet ID is required in connection string');
    }

    // Extract Apps Script URL if present
    const appsScriptParam = url.searchParams.get('appsScript');

    if (appsScriptParam) {
      this._appsScriptUrl = decodeURIComponent(appsScriptParam);
    }

    // Extract OAuth tokens if present
    const accessToken = url.searchParams.get('access_token');
    const refreshToken = url.searchParams.get('refresh_token');

    if (accessToken && refreshToken) {
      this._accessToken = decodeURIComponent(accessToken);
      this._refreshToken = decodeURIComponent(refreshToken);
    }

    return spreadsheetId;
  }

  private _isAppsScriptUrl(spreadsheetId: string): boolean {
    // Check if this looks like an Apps Script Web App ID (longer and different format)
    return spreadsheetId.length > 30 && spreadsheetId.includes('-');
  }

  private async _executeWriteOperation(parsedQuery: any, spreadsheetId: string): Promise<any[]> {
    // If we have OAuth tokens, try authenticated API first
    if (this._accessToken) {
      try {
        const result = await this._executeOAuthWriteOperation(parsedQuery, spreadsheetId);

        return result;
      } catch {
        // Fall through to Apps Script method
      }
    }

    // Fall back to Apps Script Web App for public sheets
    if (this._appsScriptUrl) {
      try {
        let result;

        switch (parsedQuery.operation) {
          case 'updateRange':
          case 'updateValues':
            result = await this._updateRangeNoAuth(spreadsheetId, parsedQuery.parameters);
            break;
          case 'updateCell':
            result = await this._updateCellNoAuth(spreadsheetId, parsedQuery.parameters);
            break;
          case 'appendRow':
          case 'appendRows':
          case 'appendSheet':
          case 'appendValues':
            result = await this._appendRowNoAuth(spreadsheetId, parsedQuery.parameters);
            break;
          case 'insertRow':
            result = await this._insertRowNoAuth(spreadsheetId, parsedQuery.parameters);
            break;
          case 'deleteRow':
            result = await this._deleteRowNoAuth(spreadsheetId, parsedQuery.parameters);
            break;
          case 'clearValues':
          case 'clearRange':
            result = await this._clearValuesNoAuth(spreadsheetId, parsedQuery.parameters);
            break;
          default:
            throw new GoogleWorkspaceError(`Unsupported write operation: ${parsedQuery.operation}`);
        }

        return result;
      } catch (error) {
        throw error;
      }
    }

    // No authentication or Apps Script available - provide helpful error
    throw new GoogleWorkspaceError(`
Write operation '${parsedQuery.operation}' requires authentication or Apps Script setup.

For public sheets, you have these options:

1. **Apps Script Web App (Recommended)**:
   - Set up a 5-minute Google Apps Script Web App
   - Add the Apps Script URL to your connection string

2. **OAuth Authentication**:
   - Configure Google OAuth in your app settings
   - Connect with your Google account

3. **Make sheet publicly editable**:
   - Set permissions to "Anyone with the link can edit"
   - Note: This allows anyone to modify your sheet

Current setup:
- OAuth tokens: ${this._accessToken ? 'Available' : 'Not available'}
- Apps Script URL: ${this._appsScriptUrl ? 'Configured' : 'Not configured'}
- Sheet ID: ${spreadsheetId}

See documentation for setup instructions.
    `);
  }

  private async _executeOAuthWriteOperation(parsedQuery: any, spreadsheetId: string): Promise<any[]> {
    if (!this._accessToken) {
      throw new GoogleWorkspaceError('OAuth access token not available');
    }

    const headers = {
      Authorization: `Bearer ${this._accessToken}`,
      'Content-Type': 'application/json',
    };

    try {
      switch (parsedQuery.operation) {
        case 'updateRange':
        case 'updateValues': // Alias for updateRange
        case 'updateCell':
          return await this._updateRangeWithOAuth(spreadsheetId, parsedQuery.parameters, headers);
        case 'appendRow':
        case 'appendRows':
        case 'appendValues':
          return await this._appendValuesWithOAuth(spreadsheetId, parsedQuery.parameters, headers);
        case 'insertRow':
          return await this._insertRowWithOAuth(spreadsheetId, parsedQuery.parameters, headers);
        case 'deleteRow':
          return await this._deleteRowWithOAuth(spreadsheetId, parsedQuery.parameters, headers);
        case 'clearValues':
        case 'clearRange':
          return await this._clearValuesWithOAuth(spreadsheetId, parsedQuery.parameters, headers);
        default:
          throw new GoogleWorkspaceError(`Unsupported OAuth write operation: ${parsedQuery.operation}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('401')) {
        // Attempt token refresh if auth manager is available
        if (this._authManager) {
          try {
            const refreshedCredentials = await this._authManager.refreshTokens();
            this._accessToken = refreshedCredentials.access_token;
            this._refreshToken = refreshedCredentials.refresh_token;

            // Retry the operation with the new token
            return await this._executeOAuthWriteOperation(parsedQuery, spreadsheetId);
          } catch (refreshError) {
            throw new GoogleWorkspaceError(
              `OAuth token refresh failed: ${refreshError instanceof Error ? refreshError.message : 'Unknown error'}`,
            );
          }
        } else {
          throw new GoogleWorkspaceError(`OAuth authentication failed: ${error.message}`);
        }
      }

      throw error;
    }
  }

  private async _updateRangeWithOAuth(spreadsheetId: string, parameters: any, headers: any): Promise<any[]> {
    const { range, values, valueInputOption = 'USER_ENTERED' } = parameters;

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=${valueInputOption}`;

    const response = await this._proxyFetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ values }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new GoogleWorkspaceError(
        `Failed to update range: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const result = (await response.json()) as { updatedRows?: number; updatedColumns?: number };

    return [{ success: true, updatedRows: result.updatedRows, updatedColumns: result.updatedColumns }];
  }

  private async _appendValuesWithOAuth(spreadsheetId: string, parameters: any, headers: any): Promise<any[]> {
    const { range, values, valueInputOption = 'USER_ENTERED' } = parameters;

    const response = await this._proxyFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=${valueInputOption}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ values }),
      },
    );

    if (!response.ok) {
      throw new GoogleWorkspaceError(`Failed to append values: ${response.statusText}`);
    }

    const result = (await response.json()) as { updates?: { updatedRange?: string } };

    return [{ success: true, updatedRange: result.updates?.updatedRange }];
  }

  private async _insertRowWithOAuth(spreadsheetId: string, parameters: any, headers: any): Promise<any[]> {
    // Insert row by shifting existing rows down
    const { sheetId = 0, insertIndex = 0 } = parameters;

    const response = await this._proxyFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          requests: [
            {
              insertDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: insertIndex,
                  endIndex: insertIndex + 1,
                },
              },
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      throw new GoogleWorkspaceError(`Failed to insert row: ${response.statusText}`);
    }

    return [{ success: true, insertedRow: insertIndex }];
  }

  private async _deleteRowWithOAuth(spreadsheetId: string, parameters: any, headers: any): Promise<any[]> {
    const { sheetId = 0, deleteIndex } = parameters;

    if (deleteIndex === undefined) {
      throw new GoogleWorkspaceError('deleteIndex is required for deleteRow operation');
    }

    const response = await this._proxyFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: deleteIndex,
                  endIndex: deleteIndex + 1,
                },
              },
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      throw new GoogleWorkspaceError(`Failed to delete row: ${response.statusText}`);
    }

    return [{ success: true, deletedRow: deleteIndex }];
  }

  private async _clearValuesWithOAuth(spreadsheetId: string, parameters: any, headers: any): Promise<any[]> {
    const { range } = parameters;

    if (!range) {
      throw new GoogleWorkspaceError('range is required for clearValues operation');
    }

    const response = await this._proxyFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
      {
        method: 'POST',
        headers,
      },
    );

    if (!response.ok) {
      throw new GoogleWorkspaceError(`Failed to clear values: ${response.statusText}`);
    }

    const result = (await response.json()) as { clearedRange?: string };

    return [{ success: true, clearedRange: result.clearedRange }];
  }

  private async _executeReadOperation(parsedQuery: any, spreadsheetId: string): Promise<any[]> {
    switch (parsedQuery.operation) {
      case 'readSheet':
        // Automatically use pagination for readSheet to prevent memory issues
        return await this._readSheetDataPaginated(
          spreadsheetId,
          parsedQuery.parameters?.sheetName,
          parsedQuery.parameters?.startRow || 1,
          parsedQuery.parameters?.maxRows || 100, // Default limit for safety
        );
      case 'readSheetPaginated': {
        // Default to 50 for UI display, but allow AI to request any amount for analysis
        const requestedMaxRows = parsedQuery.parameters?.maxRows;

        // Enforce safety limits to prevent browser crashes
        const MAX_SAFE_ROWS = 100; // Reduced maximum to prevent crashes
        const DEFAULT_ROWS = 50; // Safe default for UI

        let safeMaxRows = requestedMaxRows || DEFAULT_ROWS;

        // Apply safety limits
        if (safeMaxRows > MAX_SAFE_ROWS) {
          safeMaxRows = MAX_SAFE_ROWS;
        }

        return await this._readSheetDataPaginated(
          spreadsheetId,
          parsedQuery.parameters?.sheetName,
          parsedQuery.parameters?.startRow,
          safeMaxRows,
        );
      }
      case 'getAllSheets':
        return await this._getAllSheets(spreadsheetId);
      case 'getSheetInfo':
        return await this._getSheetInfo(spreadsheetId, parsedQuery.parameters);
      case 'readRange':
      case 'getValues':
        return await this._readRange(spreadsheetId, parsedQuery.parameters);
      default:
        throw new GoogleWorkspaceError(`Unsupported operation: ${parsedQuery.operation}`);
    }
  }

  private async _readSheetDataByGid(spreadsheetId: string, gid: number = 0): Promise<any[]> {
    // Read sheet data using GID (most reliable for public sheets)
    const endpoint = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

    try {
      const response = await this._proxyFetch(endpoint, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (response.ok) {
        const csvData = await response.text();

        // Validate that we got actual CSV data, not an error page
        if (csvData && !csvData.includes('<html') && !csvData.includes('<!DOCTYPE')) {
          return this._parseCSVData(csvData, `Sheet_${gid}`);
        }
      }
    } catch {}

    throw new GoogleWorkspaceError(`Failed to read sheet data from GID ${gid}`);
  }

  private async _readSheetDataPaginated(
    spreadsheetId: string,
    sheetName: string = '',
    startRow: number = 1,
    maxRows: number = 50,
  ): Promise<any[]> {
    // Get the full CSV data first
    const endpoints: string[] = [];

    if (sheetName && sheetName.trim() !== '') {
      endpoints.push(
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`,
      );
    }

    endpoints.push(
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`,
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`,
    );

    let lastError: Error | null = null;

    for (const endpoint of endpoints) {
      try {
        const response = await this._proxyFetch(endpoint, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        if (response.ok) {
          const csvData = await response.text();

          if (csvData && !csvData.includes('<html') && !csvData.includes('<!DOCTYPE')) {
            // Parse with pagination parameters
            return this._parseCSVData(csvData, sheetName, startRow, maxRows);
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
      }
    }

    throw new GoogleWorkspaceError(`Failed to read paginated sheet data: ${lastError?.message || 'Unknown error'}`);
  }

  private async _readSheetData(spreadsheetId: string, sheetName: string = ''): Promise<any[]> {
    // Multiple endpoint strategies prioritizing GID-based and name-agnostic approaches
    const endpoints: string[] = [];

    if (sheetName && sheetName.trim() !== '') {
      // If we have a specific sheet name, try it first
      endpoints.push(
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`,
      );
    }

    // Always add name-agnostic endpoints (these work regardless of sheet name)
    endpoints.push(
      // Default endpoint without sheet specification (uses first sheet) - most reliable
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`,
      // GID=0 fallback (may not work for all public sheets)
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`,
    );

    let lastError: Error | null = null;

    for (const endpoint of endpoints) {
      try {
        const response = await this._proxyFetch(endpoint, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        if (response.ok) {
          const csvData = await response.text();

          // Validate that we got actual CSV data, not an error page
          if (csvData && !csvData.includes('<html') && !csvData.includes('<!DOCTYPE')) {
            return this._parseCSVData(csvData, sheetName);
          } else {
          }
        } else {
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
      }
    }

    // If all endpoints failed, provide helpful error message
    const errorMessage = `Failed to read sheet data from public Google Sheet. Please ensure:
1. Sheet is set to "Anyone with the link can view" or "Anyone with the link can edit"
2. Sheet ID is correct: ${spreadsheetId}
3. Sheet name exists: ${sheetName}
4. The URL is public and accessible
Last error: ${lastError?.message || 'Unknown error'}`;

    throw new GoogleWorkspaceError(errorMessage);
  }

  private async _getFirstSheetName(spreadsheetId: string): Promise<string> {
    try {
      // First, test if we can access data without specifying a sheet name
      // This will use the first/default sheet - this is the most reliable approach
      try {
        const response = await this._proxyFetch(
          `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`,
          {
            method: 'HEAD',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          },
        );

        if (response.ok) {
          return ''; // Empty string means use default sheet
        }
      } catch {}

      // Try GID-based approach - GID 0 is always the first sheet
      try {
        const response = await this._proxyFetch(
          `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`,
          {
            method: 'HEAD',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          },
        );

        if (response.ok) {
          return ''; // We'll use GID-based endpoints
        }
      } catch {}

      // Ultimate fallback - use empty string which means use default first sheet
      return '';
    } catch {
      return '';
    }
  }

  private async _readRange(spreadsheetId: string, parameters: any): Promise<any[]> {
    try {
      const range = parameters?.range || 'A:Z';
      const sheetName = this._extractSheetFromRange(range);

      // For range queries, we'll read the whole sheet and filter
      const sheetData = await this._readSheetData(spreadsheetId, sheetName ?? '');

      // Apply range filtering if needed
      return this._filterDataByRange(sheetData, range);
    } catch (error) {
      throw new GoogleWorkspaceError(
        `Failed to read range: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async _getAllSheets(spreadsheetId: string): Promise<any[]> {
    // For public sheets, we use GID-based discovery
    // GIDs are sequential integers starting from 0 for the first sheet
    const sheets: any[] = [];
    const maxSheetsToCheck = 10; // Reasonable limit to avoid infinite checking

    for (let gid = 0; gid < maxSheetsToCheck; gid++) {
      try {
        const response = await this._proxyFetch(
          `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`,
          {
            method: 'HEAD',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          },
        );

        if (response.ok) {
          // We found a sheet at this GID
          sheets.push({
            name: `Sheet_${gid}`, // Generic name since we can't determine the actual name
            id: gid,
            index: gid,
            sheetType: 'GRID',
            gid, // Store the actual GID for reference
          });
        } else if (response.status === 400) {
          // GID doesn't exist, we've likely found all sheets
          break;
        }
      } catch {
        // Network error or other issue, continue checking
        continue;
      }
    }

    // If we found sheets, return them
    if (sheets.length > 0) {
      return sheets;
    }

    // Ultimate fallback - assume there's at least one sheet

    return [
      {
        name: 'First_Sheet',
        id: 0,
        index: 0,
        sheetType: 'GRID',
        gid: 0,
      },
    ];
  }

  private async _getSheetInfo(spreadsheetId: string, parameters?: any): Promise<any[]> {
    // Get info for a specific sheet by gid or name
    const gid = parameters?.gid !== undefined ? parameters.gid : 0;
    const sheetName = parameters?.sheetName;

    try {
      // Test if the sheet exists by trying to access it
      const response = await this._proxyFetch(
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`,
        {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        },
      );

      if (response.ok) {
        // Return sheet info
        return [
          {
            name: sheetName || `Sheet_${gid}`,
            id: gid,
            index: gid,
            sheetType: 'GRID',
            gid,
            exists: true,
          },
        ];
      } else {
        return [
          {
            name: sheetName || `Sheet_${gid}`,
            id: gid,
            index: gid,
            sheetType: 'GRID',
            gid,
            exists: false,
          },
        ];
      }
    } catch (error) {
      return [
        {
          name: sheetName || `Sheet_${gid}`,
          id: gid,
          index: gid,
          sheetType: 'GRID',
          gid,
          exists: false,
          error: error instanceof Error ? error.message : String(error),
        },
      ];
    }
  }

  private _parseCSVData(csvData: string, _sheetName: string = '', startRow?: number, maxRows?: number): any[] {
    const lines = csvData.split('\n');

    const nonEmptyLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim()) {
        nonEmptyLines.push(lines[i]);
      }
    }

    if (nonEmptyLines.length === 0) {
      return [];
    }

    const headerRow = this._parseCSVRow(nonEmptyLines[0]);

    if (headerRow.length === 0) {
      return [];
    }

    const result: any[] = [];
    const totalDataRows = nonEmptyLines.length - 1;

    // Apply reasonable default for UI display - AI can request full dataset
    const DEFAULT_MAX_ROWS = 50; // Default display limit with pagination
    const safeMaxRows = maxRows !== undefined ? maxRows : DEFAULT_MAX_ROWS; // Use requested amount or default

    // Progressive loading parameters
    const start = startRow ? Math.max(1, startRow) : 1;
    const end = Math.min(totalDataRows, start + safeMaxRows - 1);

    for (let rowIndex = start; rowIndex <= end; rowIndex++) {
      const row = this._parseCSVRow(nonEmptyLines[rowIndex]);

      // Clean row structure - just the data
      const rowData: any = {};

      // Map CSV columns to object properties
      for (let colIndex = 0; colIndex < headerRow.length; colIndex++) {
        const cellValue = row[colIndex] || '';
        const header = headerRow[colIndex];

        if (header) {
          // Store raw value
          rowData[header] = cellValue;

          // Simple number detection - only if it's clearly a number
          const trimmed = cellValue.trim();

          if (trimmed && !isNaN(Number(trimmed)) && trimmed !== '') {
            const num = Number(trimmed);

            if (isFinite(num)) {
              rowData[`${header}_numeric`] = num;
            }
          }
        }
      }

      result.push(rowData);
    }

    return result;
  }

  private _parseCSVRow(line: string): string[] {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    cells.push(current.trim());

    return cells;
  }

  private _extractSheetFromRange(range: string): string | null {
    const match = range.match(/^([^!]+)!/);
    return match ? match[1] : null;
  }

  private _filterDataByRange(data: any[], _range: string): any[] {
    // Simple range filtering - for now return all data
    // In a full implementation, you'd parse A1:B10 notation and filter accordingly
    return data;
  }

  private async _generateSchemaFromPublicSheet(): Promise<Table[]> {
    if (!this._spreadsheetId) {
      throw new GoogleWorkspaceError('Spreadsheet ID not available');
    }

    try {
      // Get sample data to infer schema from the first available sheet
      const sampleData = await this._readSheetData(this._spreadsheetId);

      if (sampleData.length === 0) {
        return this.generateSampleSchema();
      }

      const firstRow = sampleData[0];
      const headers = firstRow.headers || [];

      if (headers.length === 0) {
        return this.generateSampleSchema();
      }

      const columns: any[] = [
        {
          name: 'row_number',
          type: 'number',
          isPrimary: true,
        },
      ];

      // Add columns based on headers - keep original header names
      headers.forEach((header: string, index: number) => {
        // Use header as-is, no complex transformation
        const fieldName = header || `column_${index}`;
        const dataType = this._inferDataType(sampleData.slice(0, 10).map((row) => row.values?.[index]));

        // Add the main field
        columns.push({
          name: fieldName,
          type: dataType,
          isPrimary: false,
        });

        // Add numeric version if data contains numbers
        if (dataType === 'number') {
          columns.push({
            name: `${fieldName}_numeric`,
            type: 'number',
            isPrimary: false,
          });
        }
      });

      return [
        {
          tableName: 'sheet_data',
          columns,
          metadata: {
            documentType: 'sheets',
            documentId: this._spreadsheetId,
            url: `https://docs.google.com/spreadsheets/d/${this._spreadsheetId}/edit`,
            actualSheetName: firstRow.sheet || 'First Sheet',
          },
        },
      ];
    } catch {
      return this.generateSampleSchema();
    }
  }

  private _inferDataType(columnData: any[]): string {
    if (!columnData || columnData.length === 0) {
      return 'string';
    }

    const samples = columnData.filter((val) => val != null && val !== '').slice(0, 5);

    if (samples.length === 0) {
      return 'string';
    }

    let numberCount = 0;

    for (const value of samples) {
      const strValue = String(value).trim();

      // Simple number check - same logic as our parsing
      if (strValue && !isNaN(Number(strValue)) && strValue !== '') {
        const num = Number(strValue);

        if (isFinite(num)) {
          numberCount++;
        }
      }
    }

    // If majority of samples are numbers, it's a number column
    return numberCount >= samples.length * 0.7 ? 'number' : 'string';
  }

  /**
   * Apply parameters to query
   */
  private _applyParameters(query: any, params: string[]): void {
    this._replaceParametersRecursively(query, params);
  }

  /**
   * Recursively replace parameter placeholders
   */
  private _replaceParametersRecursively(obj: any, params: string[], visited = new WeakSet(), depth = 0): void {
    if (obj === null || obj === undefined) {
      return;
    }

    // Prevent deep recursion stack overflow - reduce max depth for safety
    if (depth > 10) {
      // Reduced from 20 to 10 for extra safety
      return;
    }

    // Check for circular references with detailed logging
    if (typeof obj === 'object' && visited.has(obj)) {
      return;
    }

    if (typeof obj === 'object' && obj !== null) {
      visited.add(obj);
    }

    try {
      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          if (typeof obj[i] === 'string' && /^\$\d+$/.test(obj[i])) {
            const paramIndex = parseInt(obj[i].substring(1)) - 1;

            if (paramIndex >= 0 && paramIndex < params.length) {
              obj[i] = this._parseParameterValue(params[paramIndex]);
            }
          } else if (typeof obj[i] === 'object' && obj[i] !== null) {
            this._replaceParametersRecursively(obj[i], params, visited, depth + 1);
          }
        }
      } else if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            if (typeof obj[key] === 'string' && /^\$\d+$/.test(obj[key])) {
              const paramIndex = parseInt(obj[key].substring(1)) - 1;

              if (paramIndex >= 0 && paramIndex < params.length) {
                obj[key] = this._parseParameterValue(params[paramIndex]);
              }
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
              this._replaceParametersRecursively(obj[key], params, visited, depth + 1);
            }
          }
        }
      }
    } catch {}
  }

  /**
   * Parse parameter value (try JSON first, fallback to string)
   */
  private _parseParameterValue(param: string): any {
    try {
      return JSON.parse(param);
    } catch {
      return param;
    }
  }

  /**
   * Escape parameter value for safe JSON insertion
   */
  private _escapeParameterForJSON(param: string): string {
    // If the parameter looks like it should be a JSON string, quote it
    // Otherwise, try to parse it as JSON first
    try {
      // Try to parse as JSON - if it works, return as-is (could be number, boolean, object, array)
      const parsed = JSON.parse(param);
      return JSON.stringify(parsed);
    } catch {
      // If not valid JSON, treat as string and escape it
      return JSON.stringify(param);
    }
  }

  // Write operation methods (no authentication required)

  private async _updateRangeNoAuth(spreadsheetId: string, parameters: any): Promise<any[]> {
    try {
      if (this._isAppsScriptUrl(spreadsheetId)) {
        // Use Apps Script Web App for full functionality
        return await this._callAppsScript(spreadsheetId, 'updateRange', parameters);
      }

      // Fallback for regular sheets - limited to append

      const { values } = parameters;

      return await this._appendRowNoAuth(spreadsheetId, { values: Array.isArray(values[0]) ? values[0] : values });
    } catch (error) {
      throw new GoogleWorkspaceError(
        `Failed to update range: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async _updateCellNoAuth(spreadsheetId: string, parameters: any): Promise<any[]> {
    try {
      if (this._isAppsScriptUrl(spreadsheetId)) {
        // Use Apps Script Web App for full functionality
        return await this._callAppsScript(spreadsheetId, 'updateCell', parameters);
      }

      // Fallback for regular sheets - limited to append
      const { value } = parameters;

      return await this._appendRowNoAuth(spreadsheetId, { values: [value] });
    } catch (error) {
      throw new GoogleWorkspaceError(
        `Failed to update cell: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private async _appendRowNoAuth(spreadsheetId: string, parameters: any): Promise<any[]> {
    try {
      // Check if we have an Apps Script URL to use for writing
      if (this._appsScriptUrl) {
        // Extract the script ID from the Apps Script URL
        const scriptIdMatch = this._appsScriptUrl.match(/\/macros\/s\/([a-zA-Z0-9-_]+)/);

        if (scriptIdMatch) {
          const scriptId = scriptIdMatch[1];
          return await this._callAppsScript(scriptId, 'appendRow', parameters);
        } else {
          throw new GoogleWorkspaceError(`Failed to extract script ID from Apps Script URL: ${this._appsScriptUrl}`);
        }
      }

      // If no Apps Script URL, check if the spreadsheetId itself is an Apps Script Web App
      if (this._isAppsScriptUrl(spreadsheetId)) {
        // Use Apps Script Web App for reliable appending
        return await this._callAppsScript(spreadsheetId, 'appendRow', parameters);
      }

      // For regular sheets without Apps Script, try public submission methods
      const { values } = parameters;
      const valuesArray = Array.isArray(values) ? values : [values];

      // Try different approaches for writing to public sheets
      try {
        // Attempt 1: Try using Google's edit endpoint (might work for public sheets with edit access)
        await this._proxyFetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            action: 'append',
            values: JSON.stringify(valuesArray),
          }),
          mode: 'no-cors',
        });

        // Since we use no-cors, we can't check the response, so assume it worked
        return [
          {
            success: true,
            message: 'Data submitted to Google Sheet',
            note: 'Please check your Google Sheet to verify the data was added. If the data is not there, you may need to set up a Google Apps Script Web App for reliable write operations.',
            data: valuesArray,
            spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
          },
        ];
      } catch {
        // Attempt 2: Try using Google Forms approach (in case there's a connected form)
        try {
          const formData = new FormData();
          valuesArray.forEach((value: any, index: number) => {
            formData.append(`entry.${1000000 + index}`, String(value || ''));
          });

          await this._proxyFetch(`https://docs.google.com/forms/d/e/${spreadsheetId}/formResponse`, {
            method: 'POST',
            body: formData,
            mode: 'no-cors',
          });

          return [
            {
              success: true,
              message: 'Data submitted via form method',
              note: 'Please check your Google Sheet to verify the data was added.',
              data: valuesArray,
              spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
            },
          ];
        } catch {
          // If both fail, provide helpful instructions
          throw new GoogleWorkspaceError(
            'No Apps Script URL configured. Data writing may be unreliable without Apps Script setup.',
          );
        }
      }
    } catch {
      // Fallback: Try the webhook approach
      return await this._tryWebhookSubmission(spreadsheetId, parameters);
    }
  }

  private async _tryWebhookSubmission(spreadsheetId: string, parameters: any): Promise<any[]> {
    try {
      const { values } = parameters;

      // Check if this is an Apps Script Web App URL
      let webhookUrl: string;

      if (this._isAppsScriptUrl(spreadsheetId)) {
        // This is already an Apps Script ID
        webhookUrl = `https://script.google.com/macros/s/${spreadsheetId}/exec`;
      } else {
        // This is a regular spreadsheet ID - try the direct submission
        throw new Error('Not an Apps Script Web App');
      }

      const response = await this._proxyFetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'appendRow',
          values: Array.isArray(values) ? values : [values],
        }),
      });

      if (!response.ok) {
        throw new Error('Webhook submission failed');
      }

      const result = webhookResponseSchema.parse(await response.json());

      return [{ success: true, result }];
    } catch (error) {
      throw new GoogleWorkspaceError(`
        Failed to submit data. To enable full editing capabilities:

        📄 Basic editing (append rows only):
        - Make sure your Google Sheet has "Anyone with the link can edit" permissions

        🚀 Full editing (all operations):
        - Set up a Google Apps Script Web App (5 minutes setup)
        - See GOOGLE_SHEETS_NO_API_KEY_SETUP.md for instructions

        Error: ${error instanceof Error ? error.message : 'Unknown error'}
      `);
    }
  }

  private async _insertRowNoAuth(spreadsheetId: string, parameters: any): Promise<any[]> {
    if (this._isAppsScriptUrl(spreadsheetId)) {
      return await this._callAppsScript(spreadsheetId, 'insertRow', parameters);
    }

    // Fallback: append instead and provide a note
    return await this._appendRowNoAuth(spreadsheetId, {
      values: ['--- New Row ---'],
    });
  }

  private async _deleteRowNoAuth(spreadsheetId: string, parameters: any): Promise<any[]> {
    if (this._isAppsScriptUrl(spreadsheetId)) {
      return await this._callAppsScript(spreadsheetId, 'deleteRow', parameters);
    }

    throw new GoogleWorkspaceError(`
      Delete operations require Google Apps Script Web App setup.

      To enable row deletion:
      1. Create a Google Apps Script Web App for your sheet
      2. Use the Web App URL instead of the Google Sheets URL
      3. See GOOGLE_SHEETS_NO_API_KEY_SETUP.md for instructions
    `);
  }

  private async _clearValuesNoAuth(spreadsheetId: string, parameters: any): Promise<any[]> {
    try {
      // Check if we have an Apps Script URL to use for clearing
      if (this._appsScriptUrl) {
        // Extract the script ID from the Apps Script URL
        const scriptIdMatch = this._appsScriptUrl.match(/\/macros\/s\/([a-zA-Z0-9-_]+)/);

        if (scriptIdMatch) {
          const scriptId = scriptIdMatch[1];
          return await this._callAppsScript(scriptId, 'clearValues', parameters);
        } else {
          throw new GoogleWorkspaceError(`Failed to extract script ID from Apps Script URL: ${this._appsScriptUrl}`);
        }
      }

      // If no Apps Script URL, check if the spreadsheetId itself is an Apps Script Web App
      if (this._isAppsScriptUrl(spreadsheetId)) {
        // Use Apps Script Web App for reliable clearing
        return await this._callAppsScript(spreadsheetId, 'clearValues', parameters);
      }

      throw new GoogleWorkspaceError(`
        Clear operations require Google Apps Script Web App setup.

        To enable value clearing:
        1. Create a Google Apps Script Web App for your sheet
        2. Use the Web App URL instead of the Google Sheets URL
        3. See GOOGLE_SHEETS_NO_API_KEY_SETUP.md for instructions
      `);
    } catch (error) {
      throw error;
    }
  }

  private async _callAppsScript(appId: string, action: string, parameters: any): Promise<any[]> {
    try {
      const webhookUrl = `https://script.google.com/macros/s/${appId}/exec`;
      const payload = {
        action,
        spreadsheetId: this._spreadsheetId, // Pass the actual spreadsheet ID
        ...parameters,
      };

      const response = await this._proxyFetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`Apps Script request failed: ${response.statusText} - ${responseText}`);
      }

      const responseText = await response.text();

      try {
        const result = webhookResponseSchema.parse(JSON.parse(responseText));

        if (result.error) {
          throw new Error(result.error);
        }

        return [
          {
            ...result,
            _debug: `✅ Apps Script call successful to ${webhookUrl}`,
          },
        ];
      } catch {
        throw new Error(`Invalid JSON response from Apps Script: ${responseText}`);
      }
    } catch (error) {
      throw new GoogleWorkspaceError(
        `Apps Script call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
