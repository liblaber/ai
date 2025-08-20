import type { BaseAccessor } from '../baseAccessor';
import type { Table } from '../../types';
import { GoogleWorkspaceAuthManager } from './google-workspace/auth-manager';
import { GoogleWorkspaceAPIClient } from './google-workspace/api-client';
import { GoogleSheetsService } from './google-workspace/sheets-service';
import { type GoogleWorkspaceConfig, type GoogleConnectionInfo, GoogleWorkspaceError } from './google-workspace/types';

export class GoogleSheetsAccessor implements BaseAccessor {
  static pluginId = 'google-sheets';
  readonly label = 'Google Sheets';
  readonly preparedStatementPlaceholderExample = '{ range: $1, sheetName: $2, valueRenderOption: $3 }';
  readonly connectionStringFormat = 'sheets://SPREADSHEET_ID/?auth=oauth2&client_id=xxx&scope=spreadsheets.readonly';

  private _authManager: GoogleWorkspaceAuthManager | null = null;
  private _apiClient: GoogleWorkspaceAPIClient | null = null;
  private _sheetsService: GoogleSheetsService | null = null;
  private _spreadsheetId: string | null = null;
  private _connectionInfo: GoogleConnectionInfo | null = null;

  static isAccessor(databaseUrl: string): boolean {
    return databaseUrl.startsWith('sheets://');
  }

  async testConnection(connectionString: string): Promise<boolean> {
    try {
      // Parse connection string to extract spreadsheet ID and auth info
      const connectionInfo = this._parseConnectionString(connectionString);

      // Initialize auth manager with minimal config for testing
      const authManager = new GoogleWorkspaceAuthManager();
      const config: GoogleWorkspaceConfig = {
        type: connectionInfo.auth.type,
        clientId: connectionInfo.auth.clientId,
        scopes: GoogleWorkspaceAuthManager.getRecommendedScopes('sheets', true),
      };

      await authManager.initialize(config);

      // Create API client and test spreadsheet access
      const apiClient = new GoogleWorkspaceAPIClient(authManager);
      const success = await apiClient.testConnection('sheets', connectionInfo.documentId);

      // Cleanup
      await apiClient.cleanup();
      await authManager.cleanup();

      return success;
    } catch {
      return false;
    }
  }

  async executeQuery(query: string, params?: string[]): Promise<any[]> {
    if (!this._sheetsService) {
      throw new GoogleWorkspaceError('Google Sheets service not initialized. Please call initialize() first.');
    }

    let parsedQuery: any;

    try {
      parsedQuery = JSON.parse(query);
    } catch (parseError) {
      throw new GoogleWorkspaceError(
        `Invalid JSON format for Google Sheets query: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`,
      );
    }

    try {
      if (!parsedQuery.operation) {
        throw new GoogleWorkspaceError('Google Sheets query must specify an operation');
      }

      if (!parsedQuery.spreadsheetId && !this._spreadsheetId) {
        throw new GoogleWorkspaceError('Spreadsheet ID not found in query or connection');
      }

      // Use spreadsheet ID from query or fallback to connection
      const spreadsheetId = parsedQuery.spreadsheetId || this._spreadsheetId;

      // Ensure the query has the correct spreadsheet ID
      parsedQuery.spreadsheetId = spreadsheetId;

      const result = await this._sheetsService.executeQuery(parsedQuery, params);

      return result;
    } catch (error) {
      throw new GoogleWorkspaceError((error as Error)?.message);
    }
  }

  guardAgainstMaliciousQuery(query: string): void {
    if (!query) {
      throw new GoogleWorkspaceError('No Google Sheets query provided. Please provide a valid query to execute.');
    }

    let parsedQuery: any;

    try {
      parsedQuery = JSON.parse(query);
    } catch (parseError) {
      throw new GoogleWorkspaceError(
        `Invalid JSON format for Google Sheets query: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
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

      if (!['readRange', 'readSheet', 'getAllSheets', 'getValues'].includes(parsedQuery.operation)) {
        throw new GoogleWorkspaceError(
          'Google Sheets query must specify a valid operation (readRange, readSheet, getAllSheets, getValues)',
        );
      }

      // Check for potentially dangerous parameters
      const forbiddenKeys = ['eval', 'function', 'script', 'exec', 'formula'];
      const queryString = JSON.stringify(parsedQuery).toLowerCase();

      if (forbiddenKeys.some((key) => queryString.includes(key))) {
        throw new GoogleWorkspaceError('Query contains forbidden operations');
      }

      // Validate spreadsheet ID format if present
      if (parsedQuery.spreadsheetId) {
        const spreadsheetIdPattern = /^[a-zA-Z0-9-_]{20,}$/;

        if (!spreadsheetIdPattern.test(parsedQuery.spreadsheetId)) {
          throw new GoogleWorkspaceError(`Invalid spreadsheet ID format: ${parsedQuery.spreadsheetId}`);
        }
      }

      // Validate range format if present
      if (parsedQuery.parameters?.range) {
        const rangePattern =
          /^([A-Za-z0-9\s_]+!)?[A-Z]+\d*:[A-Z]+\d*$|^([A-Za-z0-9\s_]+!)?[A-Z]:[A-Z]$|^([A-Za-z0-9\s_]+!)?[A-Z]+:[A-Z]+$/;

        if (!rangePattern.test(parsedQuery.parameters.range)) {
          throw new GoogleWorkspaceError('Invalid range format. Use A1 notation (e.g., A1:B10, Sheet1!A:Z)');
        }
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

  validate(connectionString: string): void {
    try {
      const connectionInfo = this._parseConnectionString(connectionString);

      // Validate spreadsheet ID format
      const spreadsheetIdPattern = /^[a-zA-Z0-9-_]{20,}$/;

      if (!spreadsheetIdPattern.test(connectionInfo.documentId)) {
        throw new GoogleWorkspaceError(`Invalid Google Sheets spreadsheet ID format: ${connectionInfo.documentId}`);
      }

      // Validate auth type
      if (!['oauth2', 'service-account', 'api-key'].includes(connectionInfo.auth.type)) {
        throw new GoogleWorkspaceError('Invalid authentication type. Must be oauth2, service-account, or api-key');
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
    if (!this._sheetsService) {
      throw new GoogleWorkspaceError('Google Sheets service not initialized. Please call initialize() first.');
    }

    try {
      const workspaceTables = await this._sheetsService.generateSchema();

      // Convert GoogleWorkspaceTable to BaseAccessor Table format
      return workspaceTables.map((wsTable) => ({
        tableName: wsTable.tableName,
        columns: wsTable.columns.map((wsCol) => ({
          name: wsCol.name,
          type: wsCol.type,
          isPrimary: wsCol.isPrimary,
          enumValues: wsCol.enumValues,
        })),
        metadata: wsTable.metadata,
      }));
    } catch (error) {
      throw new GoogleWorkspaceError((error as Error)?.message);
    }
  }

  async initialize(connectionString: string): Promise<void> {
    if (this._authManager) {
      await this.close();
    }

    // Parse connection string
    this._connectionInfo = this._parseConnectionString(connectionString);
    this._spreadsheetId = this._connectionInfo.documentId;

    // Initialize authentication
    this._authManager = new GoogleWorkspaceAuthManager(process.env.GOOGLE_AUTH_ENCRYPTION_KEY);

    const config: GoogleWorkspaceConfig = {
      type: this._connectionInfo.auth.type,
      clientId: this._connectionInfo.auth.clientId || process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
      serviceAccountPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
      apiKey: process.env.GOOGLE_API_KEY,
      scopes: GoogleWorkspaceAuthManager.getRecommendedScopes('sheets', true),
      credentials:
        this._connectionInfo.auth.accessToken && this._connectionInfo.auth.refreshToken
          ? {
              access_token: this._connectionInfo.auth.accessToken,
              refresh_token: this._connectionInfo.auth.refreshToken,
              expiry_date: Date.now() + 60 * 60 * 1000, // 1 hour from now
            }
          : undefined,
    };

    await this._authManager.initialize(config);

    // Initialize API client
    this._apiClient = new GoogleWorkspaceAPIClient(this._authManager);
    await this._apiClient.initialize();

    // Initialize Sheets service
    this._sheetsService = new GoogleSheetsService(this._apiClient, this._spreadsheetId);

    // Test the connection
    try {
      await this._sheetsService.getSpreadsheetInfo();
    } catch {
      throw new GoogleWorkspaceError('Failed to access Google Spreadsheet. Check your spreadsheet ID and permissions.');
    }
  }

  async close(): Promise<void> {
    if (this._apiClient) {
      await this._apiClient.cleanup();
      this._apiClient = null;
    }

    if (this._authManager) {
      await this._authManager.cleanup();
      this._authManager = null;
    }

    this._sheetsService = null;
    this._spreadsheetId = null;
    this._connectionInfo = null;
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
    return `You are a Google Sheets API expert tasked with generating Google Sheets queries based on a given spreadsheet schema and user requirements.
Your goal is to create accurate, optimized queries that address the user's request while adhering to specific guidelines and output format.

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

To generate the Google Sheets queries, follow these steps:
1. Carefully analyze the user's request and the provided spreadsheet schema.
2. Create one or more Google Sheets queries that accurately address the user's requirements.
3. Structure queries as JSON objects with the following format:
   {
     "operation": "readRange" | "readSheet" | "getAllSheets" | "getValues",
     "spreadsheetId": "spreadsheet-id-if-needed",
     "parameters": {
       "range": "A1:Z100",
       "sheetName": "Sheet1",
       "valueRenderOption": "FORMATTED_VALUE",
       "ranges": ["A1:B10", "D1:E10"]
     }
   }
4. Use appropriate Google Sheets operations:
   - "readRange": Read data from a specific range in A1 notation
   - "readSheet": Read all data from a specific sheet
   - "getAllSheets": Get information about all sheets in the spreadsheet
   - "getValues": Get values from one or more ranges
5. Do not use any operations that could modify the spreadsheet.
6. Use proper A1 notation for ranges (e.g., A1:B10, Sheet1!A:Z, C:C).
7. Choose appropriate valueRenderOption:
   - "FORMATTED_VALUE": Human-readable formatted values (default)
   - "UNFORMATTED_VALUE": Raw unformatted values
   - "FORMULA": Show formulas instead of calculated values
8. Optimize queries for the specific sheet structure shown in the schema.
9. If needed, parametrize the query using positional placeholders like $1, $2, etc.
10. IMPORTANT: Use the "Actual Sheet Name" from the schema, NOT the table name. If a table shows "Table: expense_report" and "Actual Sheet Name: Expense report", use "Expense report" in your queries.
11. CRITICAL: For Google Sheets, ALWAYS prefer "readSheet" operations over "readRange" operations. The readSheet operation returns semantically processed data with fields like amount_numeric, category, description, etc.
12. CRITICAL: When you need data aggregation (SUM, COUNT, AVG), use "readSheet" to get the full dataset with semantic fields, then let the frontend handle the aggregation using amount_numeric field.
13. CRITICAL: DO NOT use readRange operations for individual columns unless absolutely necessary. The readRange operation may return raw data without semantic processing.
14. IMPORTANT: The data returned by readSheet includes both raw values and semantic fields (amount_numeric, category, description, date, notes). Use these semantic fields for calculations.
15. IMPORTANT: Use "dataStartRow" from metadata to know where actual data begins (excluding headers and metadata).
16. NOTE: The "spreadsheet_info" table is virtual and does not represent an actual sheet - do not query it.
17. For dashboard and analytical queries, always use readSheet to ensure you get semantically processed data with numeric fields for calculations.
18. Provide a brief explanation for each query.
19. Specify the response schema for each query, including expected data types.

Format your response as a JSON array containing objects with the following structure:
{
  "query": "Your Google Sheets query as JSON string here",
  "explanation": "A brief explanation of what the query does",
  "responseSchema": "field_name1 (data_type), field_name2 (data_type), ..."
}

Here's an example of a valid response:
[
  {
    "query": "{\\"operation\\": \\"readSheet\\", \\"parameters\\": {\\"sheetName\\": \\"sales_data\\", \\"valueRenderOption\\": \\"FORMATTED_VALUE\\"}}",
    "explanation": "Reads all data from the sales_data sheet with formatted values",
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

IMPORTANT: Your output should consist ONLY of the JSON array containing the query objects. Do not include any additional text or explanations outside of this JSON structure.
IMPORTANT: The query field should contain a properly formatted JSON string representing the Google Sheets query object. Use standard JSON escaping (not double-escaped).

Now, generate Google Sheets queries based on the following user request:
<userRequest>
${userPrompt}
</userRequest>`;
  }

  // Helper methods

  private _parseConnectionString(connectionString: string): GoogleConnectionInfo {
    try {
      const url = new URL(connectionString);

      if (url.protocol !== 'sheets:') {
        throw new GoogleWorkspaceError('Connection string must start with sheets://');
      }

      // Extract spreadsheet ID from hostname
      const spreadsheetId = url.hostname;

      if (!spreadsheetId) {
        throw new GoogleWorkspaceError('Spreadsheet ID is required in connection string');
      }

      // Extract auth parameters
      const params = new URLSearchParams(url.search);
      const authType = (params.get('auth') as 'oauth2' | 'service-account' | 'api-key') || 'oauth2';
      const clientId = params.get('client_id') || undefined;
      const scope = params.get('scope') || undefined;
      const accessToken = params.get('access_token') || undefined;
      const refreshToken = params.get('refresh_token') || undefined;

      return {
        type: 'sheets',
        documentId: spreadsheetId,
        auth: {
          type: authType,
          clientId,
          scope,
          accessToken,
          refreshToken,
        },
      };
    } catch (error) {
      throw new GoogleWorkspaceError(
        `Invalid connection string format: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private _safeStringify(obj: any, maxDepth = 3): string {
    const seen = new WeakSet();

    const replacer = (key: string, value: any, depth = 0): any => {
      if (depth > maxDepth) {
        return '[Max Depth Reached]';
      }

      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }

        seen.add(value);

        if (Array.isArray(value)) {
          return value.map((item, index) => replacer(String(index), item, depth + 1));
        } else {
          const result: any = {};

          for (const [k, v] of Object.entries(value)) {
            result[k] = replacer(k, v, depth + 1);
          }

          return result;
        }
      }

      return value;
    };

    try {
      return JSON.stringify(replacer('', obj), null, 2);
    } catch (error) {
      return '[Serialization Error: ' + (error as Error).message + ']';
    }
  }
}
