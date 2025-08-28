import type { BaseAccessor } from '../baseAccessor';
import type { Table } from '../../types';
import { GoogleWorkspaceError } from './google-workspace/types';
import { GoogleWorkspaceAuthManager } from './google-workspace/auth-manager';

export class GoogleSheetsAccessor implements BaseAccessor {
  static pluginId = 'google-sheets';
  readonly label = 'Google Sheets';
  readonly preparedStatementPlaceholderExample = '{ range: $1, sheetName: $2, valueRenderOption: $3 }';
  readonly connectionStringFormat =
    'sheets://SPREADSHEET_ID/ or https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit';

  private _spreadsheetId: string | null = null;
  private _appsScriptUrl: string | null = null;
  private _accessToken: string | null = null;
  private _refreshToken: string | null = null;
  private _authManager: GoogleWorkspaceAuthManager | null = null;

  static isAccessor(databaseUrl: string): boolean {
    return databaseUrl.startsWith('sheets://') || databaseUrl.startsWith('https://docs.google.com/spreadsheets/');
  }

  async testConnection(connectionString: string): Promise<boolean> {
    try {
      const spreadsheetId = this._extractSpreadsheetId(connectionString);

      // Check if this is an Apps Script Web App URL
      if (this._isAppsScriptUrl(spreadsheetId)) {
        // For Apps Script URLs, test the doGet endpoint
        try {
          const response = await fetch(`https://script.google.com/macros/s/${spreadsheetId}/exec`, {
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
          const response = await fetch(endpoint, { method: 'HEAD' });

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
      // Enhanced error logging for debugging JSON parsing issues
      console.error('GoogleSheets JSON parsing failed:', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        queryType: typeof processedQuery,
        queryLength: processedQuery.length,
        query: processedQuery,
        queryBytes: [...processedQuery].map((char) => char.charCodeAt(0)),
        firstChar: processedQuery.charAt(0),
        firstCharCode: processedQuery.charCodeAt(0),
      });

      // Try to fix common JSON issues - double-encoded JSON strings
      let fixedQuery = processedQuery;

      if (processedQuery.startsWith('"{') && processedQuery.endsWith('}"')) {
        console.log('GoogleSheets: Attempting to fix double-encoded JSON');

        try {
          // Remove outer quotes and unescape
          fixedQuery = processedQuery.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
          parsedQuery = JSON.parse(fixedQuery);
          console.log('GoogleSheets: Successfully fixed double-encoded JSON:', parsedQuery);
        } catch (secondParseError) {
          console.error('GoogleSheets: Failed to fix double-encoded JSON:', secondParseError);
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
        case 'getAllSheets':
        case 'getValues':
          return await this._executeReadOperation(parsedQuery, spreadsheetId);
        case 'updateRange':
        case 'updateValues': // Alias for updateRange
        case 'updateCell':
        case 'appendRow':
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
        `Google Sheets queries must be in JSON format, not SQL. ` +
          `Received what appears to be a SQL query: "${trimmedQuery.substring(0, 50)}..." ` +
          `\n\nFor Google Sheets, use JSON format like: ` +
          `{"operation": "readSheet", "parameters": {"valueRenderOption": "FORMATTED_VALUE"}} ` +
          `\n\nSupported operations: readRange, readSheet, getAllSheets, getValues, updateRange, updateValues, updateCell, appendValues, appendRow, appendSheet, clearValues, clearRange, insertRow, deleteRow. Note: Sheet names are dynamic - use getAllSheets to discover available sheets first.`,
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

      if (
        ![
          'readRange',
          'readSheet',
          'getAllSheets',
          'getValues',
          'updateRange',
          'updateValues',
          'updateCell',
          'appendValues',
          'appendRow',
          'appendSheet',
          'clearValues',
          'clearRange',
          'insertRow',
          'deleteRow',
        ].includes(parsedQuery.operation)
      ) {
        throw new GoogleWorkspaceError(
          'Google Sheets query must specify a valid operation (readRange, readSheet, getAllSheets, getValues, updateRange, updateValues, updateCell, appendValues, appendRow, appendSheet, clearValues, clearRange, insertRow, deleteRow)',
        );
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

  validate(connectionString: string): void {
    try {
      const spreadsheetId = this._extractSpreadsheetId(connectionString);

      // Validate spreadsheet ID format
      const spreadsheetIdPattern = /^[a-zA-Z0-9-_]{20,}$/;

      if (!spreadsheetIdPattern.test(spreadsheetId)) {
        throw new GoogleWorkspaceError(`Invalid Google Sheets spreadsheet ID format: ${spreadsheetId}`);
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
    // Extract spreadsheet ID from connection string
    this._spreadsheetId = this._extractSpreadsheetId(connectionString);

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
      } catch (error) {
        console.warn('Failed to initialize Google OAuth auth manager:', error);
        // Continue without auth manager - fallback to existing behavior
      }
    }

    // Test the connection to ensure the spreadsheet is accessible
    const isAccessible = await this.testConnection(connectionString);

    if (!isAccessible) {
      throw new GoogleWorkspaceError(`
Failed to access Google Spreadsheet. Please check:

1. The spreadsheet URL is correct
2. The spreadsheet is set to "Anyone with the link can view" or "Anyone with the link can edit"
3. The spreadsheet exists and is not deleted

Current spreadsheet ID: ${this._spreadsheetId}

To fix this:
- Open your Google Sheet
- Click "Share" → Change to "Anyone with the link can view/edit"
- Make sure the link is not restricted to specific people
      `);
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
10. IMPORTANT: Use the "Actual Sheet Name" from the schema metadata, NOT the table name. If schema metadata shows "actualSheetName": "Expense Data", use "Expense Data" in your queries. If no specific sheet name is provided in metadata, use "readSheet" WITHOUT specifying sheetName parameter to read the first/default sheet.
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
    "query": "{\\"operation\\": \\"readSheet\\", \\"parameters\\": {\\"valueRenderOption\\": \\"FORMATTED_VALUE\\"}}",
    "explanation": "Reads all data from the first sheet (auto-detected) with formatted values",
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
    if (['updateRange', 'updateValues', 'appendValues', 'appendRow'].includes(operation) && parameters.values) {
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
      if (connectionString.startsWith('https://docs.google.com/spreadsheets/')) {
        return this._parseGoogleSheetsHttpsUrl(connectionString);
      } else if (connectionString.startsWith('sheets://')) {
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
    console.log(`[GoogleSheets] 📋 Extracted spreadsheet ID from HTTPS URL: ${spreadsheetId}`);

    // For HTTPS URLs, we assume public access (no Apps Script or OAuth tokens in URL)
    console.log(`[GoogleSheets] 📖 HTTPS URL format detected - assuming public read-only access`);

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
      console.log(`[GoogleSheets] 🔗 Found Apps Script URL in connection string: ${this._appsScriptUrl}`);
    } else {
      console.log(`[GoogleSheets] 📖 No Apps Script URL - assuming public read-only access: ${connectionString}`);
    }

    // Extract OAuth tokens if present
    const accessToken = url.searchParams.get('access_token');
    const refreshToken = url.searchParams.get('refresh_token');

    if (accessToken && refreshToken) {
      this._accessToken = decodeURIComponent(accessToken);
      this._refreshToken = decodeURIComponent(refreshToken);
      console.log(`[GoogleSheets] 🔐 Found OAuth tokens in connection string`);
    } else {
      console.log(`[GoogleSheets] 📖 No OAuth tokens - using public access for reading`);
    }

    return spreadsheetId;
  }

  private _isAppsScriptUrl(spreadsheetId: string): boolean {
    // Check if this looks like an Apps Script Web App ID (longer and different format)
    return spreadsheetId.length > 30 && spreadsheetId.includes('-');
  }

  private async _executeWriteOperation(parsedQuery: any, spreadsheetId: string): Promise<any[]> {
    console.log(`[GoogleSheets] 🔧 WRITE OPERATION DEBUG START`);
    console.log(`[GoogleSheets] - Operation: ${parsedQuery.operation}`);
    console.log(`[GoogleSheets] - SpreadsheetId: ${spreadsheetId}`);
    console.log(`[GoogleSheets] - Parameters: ${JSON.stringify(parsedQuery.parameters, null, 2)}`);
    console.log(`[GoogleSheets] - Has OAuth tokens: ${!!this._accessToken}`);
    console.log(`[GoogleSheets] - Apps Script URL: ${this._appsScriptUrl}`);

    // If we have OAuth tokens, try authenticated API first
    if (this._accessToken) {
      console.log(`[GoogleSheets] 🔐 Attempting OAuth API for write operation: ${parsedQuery.operation}`);

      try {
        const result = await this._executeOAuthWriteOperation(parsedQuery, spreadsheetId);
        console.log(`[GoogleSheets] ✅ OAuth write SUCCESS:`, JSON.stringify(result, null, 2));

        return result;
      } catch (error) {
        console.error(`[GoogleSheets] ❌ OAuth write FAILED:`, error);
        console.error(`[GoogleSheets] - Error type: ${error?.constructor?.name}`);
        console.error(`[GoogleSheets] - Error message: ${error instanceof Error ? error.message : error}`);
        console.warn(`[GoogleSheets] ⚠️  Falling back to Apps Script/public method...`);
        // Fall through to Apps Script method
      }
    }

    // Fall back to Apps Script Web App for public sheets
    if (this._appsScriptUrl) {
      console.log(`[GoogleSheets] 📝 Attempting Apps Script method for write operation: ${parsedQuery.operation}`);

      try {
        let result;

        switch (parsedQuery.operation) {
          case 'updateRange':
          case 'updateValues': // Alias for updateRange
            console.log(`[GoogleSheets] 📝 Calling _updateRangeNoAuth...`);
            result = await this._updateRangeNoAuth(spreadsheetId, parsedQuery.parameters);
            break;
          case 'updateCell':
            console.log(`[GoogleSheets] 📝 Calling _updateCellNoAuth...`);
            result = await this._updateCellNoAuth(spreadsheetId, parsedQuery.parameters);
            break;
          case 'appendRow':
          case 'appendSheet':
          case 'appendValues':
            console.log(`[GoogleSheets] 📝 Calling _appendRowNoAuth...`);
            result = await this._appendRowNoAuth(spreadsheetId, parsedQuery.parameters);
            break;
          case 'insertRow':
            console.log(`[GoogleSheets] 📝 Calling _insertRowNoAuth...`);
            result = await this._insertRowNoAuth(spreadsheetId, parsedQuery.parameters);
            break;
          case 'deleteRow':
            console.log(`[GoogleSheets] 📝 Calling _deleteRowNoAuth...`);
            result = await this._deleteRowNoAuth(spreadsheetId, parsedQuery.parameters);
            break;
          case 'clearValues':
          case 'clearRange':
            console.log(`[GoogleSheets] 📝 Calling _clearValuesNoAuth...`);
            result = await this._clearValuesNoAuth(spreadsheetId, parsedQuery.parameters);
            break;
          default:
            throw new GoogleWorkspaceError(`Unsupported write operation: ${parsedQuery.operation}`);
        }

        console.log(`[GoogleSheets] ✅ Apps Script method SUCCESS:`, JSON.stringify(result, null, 2));

        return result;
      } catch (error) {
        console.error(`[GoogleSheets] ❌ Apps Script method FAILED:`, error);
        console.error(`[GoogleSheets] - Error type: ${error?.constructor?.name}`);
        console.error(`[GoogleSheets] - Error message: ${error instanceof Error ? error.message : error}`);
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
            console.error('OAuth token refresh failed:', refreshError);
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

    console.log(`[GoogleSheets] - SpreadsheetId: ${spreadsheetId}`);
    console.log(`[GoogleSheets] - Range: ${range}`);
    console.log(`[GoogleSheets] - Values: ${JSON.stringify(values)}`);
    console.log(`[GoogleSheets] - ValueInputOption: ${valueInputOption}`);

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=${valueInputOption}`;
    console.log(`[GoogleSheets] - URL: ${url}`);
    console.log(`[GoogleSheets] - Headers: ${JSON.stringify(headers, null, 2)}`);

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ values }),
    });

    console.log(`[GoogleSheets] - Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GoogleSheets] - Error response body: ${errorText}`);
      throw new GoogleWorkspaceError(
        `Failed to update range: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const result = (await response.json()) as { updatedRows?: number; updatedColumns?: number };
    console.log(`[GoogleSheets] - Success response: ${JSON.stringify(result, null, 2)}`);

    return [{ success: true, updatedRows: result.updatedRows, updatedColumns: result.updatedColumns }];
  }

  private async _appendValuesWithOAuth(spreadsheetId: string, parameters: any, headers: any): Promise<any[]> {
    const { range, values, valueInputOption = 'USER_ENTERED' } = parameters;

    const response = await fetch(
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

    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
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
    });

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

    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
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
    });

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

    const response = await fetch(
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
        return await this._readSheetData(spreadsheetId, parsedQuery.parameters?.sheetName);
      case 'getAllSheets':
        return await this._getAllSheets(spreadsheetId);
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
      console.log(`[GoogleSheets] 🔄 Reading sheet data from GID ${gid}: ${endpoint}`);

      const response = await fetch(endpoint, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (response.ok) {
        const csvData = await response.text();

        // Validate that we got actual CSV data, not an error page
        if (csvData && !csvData.includes('<html') && !csvData.includes('<!DOCTYPE')) {
          console.log(`[GoogleSheets] ✅ Successfully fetched data from GID ${gid}`);
          return this._parseCSVData(csvData, `Sheet_${gid}`);
        } else {
          console.log(`[GoogleSheets] ⚠️ Invalid CSV data from GID ${gid}`);
        }
      } else {
        console.log(`[GoogleSheets] ❌ HTTP ${response.status} from GID ${gid}`);
      }
    } catch (error) {
      console.log(`[GoogleSheets] ❌ Error reading GID ${gid}: ${error}`);
    }

    throw new GoogleWorkspaceError(`Failed to read sheet data from GID ${gid}`);
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
        console.log(`[GoogleSheets] 🔄 Trying endpoint: ${endpoint}`);

        const response = await fetch(endpoint, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        if (response.ok) {
          const csvData = await response.text();

          // Validate that we got actual CSV data, not an error page
          if (csvData && !csvData.includes('<html') && !csvData.includes('<!DOCTYPE')) {
            console.log(`[GoogleSheets] ✅ Successfully fetched data from: ${endpoint}`);
            return this._parseCSVData(csvData, sheetName);
          } else {
            console.log(`[GoogleSheets] ⚠️  Invalid CSV data from: ${endpoint}`);
          }
        } else {
          console.log(`[GoogleSheets] ❌ HTTP ${response.status} from: ${endpoint}`);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.log(`[GoogleSheets] ❌ Error with ${endpoint}: ${lastError.message}`);
      }
    }

    // If all endpoints failed, provide helpful error message
    const errorMessage = `Failed to read sheet data from public Google Sheet. Please ensure:
1. Sheet is set to "Anyone with the link can view"
2. Sheet ID is correct: ${spreadsheetId}
3. Sheet name exists: ${sheetName}
Last error: ${lastError?.message || 'Unknown error'}`;

    throw new GoogleWorkspaceError(errorMessage);
  }

  private async _getFirstSheetName(spreadsheetId: string): Promise<string> {
    try {
      // First, test if we can access data without specifying a sheet name
      // This will use the first/default sheet - this is the most reliable approach
      try {
        const response = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        if (response.ok) {
          console.log(`[GoogleSheets] ✅ Default sheet is accessible, using first sheet`);
          return ''; // Empty string means use default sheet
        }
      } catch (error) {
        console.log(`[GoogleSheets] ⚠️ Default sheet test failed: ${error}`);
      }

      // Try GID-based approach - GID 0 is always the first sheet
      try {
        const response = await fetch(
          `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`,
          {
            method: 'HEAD',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          },
        );

        if (response.ok) {
          console.log(`[GoogleSheets] ✅ First sheet accessible via GID=0`);
          return ''; // We'll use GID-based endpoints
        }
      } catch (error) {
        console.log(`[GoogleSheets] ⚠️ GID-based access failed: ${error}`);
      }

      // Ultimate fallback - use empty string which means use default first sheet
      console.log(`[GoogleSheets] 📋 Using default first sheet (no specific name needed)`);

      return '';
    } catch (error) {
      console.log(`[GoogleSheets] ⚠️ Could not detect sheet access, using default: ${error}`);
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

    console.log(`[GoogleSheets] 🔍 Discovering sheets dynamically using GID-based approach`);

    for (let gid = 0; gid < maxSheetsToCheck; gid++) {
      try {
        const response = await fetch(
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
          console.log(`[GoogleSheets] ✅ Found sheet at GID ${gid}`);
        } else if (response.status === 400) {
          // GID doesn't exist, we've likely found all sheets
          console.log(`[GoogleSheets] 📋 No sheet at GID ${gid}, stopping discovery`);
          break;
        }
      } catch (error) {
        // Network error or other issue, continue checking
        console.log(`[GoogleSheets] ⚠️ Error checking GID ${gid}: ${error}`);
        continue;
      }
    }

    // If we found sheets, return them
    if (sheets.length > 0) {
      console.log(`[GoogleSheets] ✅ Discovered ${sheets.length} sheet(s) dynamically`);
      return sheets;
    }

    // Ultimate fallback - assume there's at least one sheet
    console.log(`[GoogleSheets] 📋 No sheets discovered, assuming first sheet exists`);

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

  private _parseCSVData(csvData: string, sheetName: string = ''): any[] {
    const lines = csvData.split('\n').filter((line) => line.trim());

    if (lines.length === 0) {
      return [];
    }

    // Parse CSV (simple implementation)
    const rows = lines.map((line) => {
      const cells: string[] = [];
      let currentCell = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cells.push(currentCell);
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
      cells.push(currentCell);

      return cells;
    });

    if (rows.length === 0) {
      return [];
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    return dataRows.map((row, index) => {
      const rowData: any = {
        sheet: sheetName,
        row: index + 2, // +2 because we skip header and arrays are 0-indexed
        values: row,
        headers,
      };

      // Add field access using headers
      headers.forEach((header, colIndex) => {
        const fieldName = header
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');

        if (fieldName) {
          rowData[fieldName] = row[colIndex] || '';
        }

        rowData[`col_${colIndex}`] = row[colIndex] || '';
      });

      // Add semantic fields for common patterns
      this._addSemanticFields(rowData, row);

      return rowData;
    });
  }

  private _addSemanticFields(rowData: any, row: string[]): void {
    // Simple pattern matching for common data types
    for (let i = 0; i < row.length; i++) {
      const cellValue = row[i] || '';

      // Currency detection
      if (this._isLikelyCurrency(cellValue)) {
        rowData.amount = cellValue;
        rowData.amount_numeric = parseFloat(cellValue.replace(/[^\d.-]/g, '')) || 0;
        rowData._semantic_amount_column = i;
      }

      // Date detection
      if (this._isLikelyDate(cellValue)) {
        rowData.date = cellValue;
        rowData._semantic_date_column = i;
      }

      // Text categorization (simple heuristic)
      if (
        cellValue.length > 0 &&
        cellValue.length < 50 &&
        !this._isLikelyCurrency(cellValue) &&
        !this._isLikelyDate(cellValue)
      ) {
        if (!rowData.category) {
          rowData.category = cellValue;
          rowData._semantic_category_column = i;
        } else if (!rowData.description) {
          rowData.description = cellValue;
          rowData._semantic_description_column = i;
        }
      }
    }
  }

  private _isLikelyCurrency(value: string): boolean {
    return /^\$?[\d,]+\.?\d*$/.test(value.trim()) || /^[\d,]+\.?\d*\$$/.test(value.trim());
  }

  private _isLikelyDate(value: string): boolean {
    return (
      /^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(value) || /^\d{4}-\d{2}-\d{2}$/.test(value) || !isNaN(Date.parse(value))
    );
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
      console.log(`[GoogleSheets] 🔍 Generating schema from public sheet: ${this._spreadsheetId}`);

      // Get sample data to infer schema from the first available sheet
      const sampleData = await this._readSheetData(this._spreadsheetId);

      if (sampleData.length === 0) {
        console.log(`[GoogleSheets] ⚠️  No data found, returning sample schema`);
        return this.generateSampleSchema();
      }

      console.log(`[GoogleSheets] ✅ Found ${sampleData.length} rows of data`);

      const firstRow = sampleData[0];
      const headers = firstRow.headers || [];

      if (headers.length === 0) {
        console.log(`[GoogleSheets] ⚠️  No headers found, returning sample schema`);
        return this.generateSampleSchema();
      }

      console.log(`[GoogleSheets] 📋 Headers: ${headers.join(', ')}`);

      const columns: any[] = [
        {
          name: 'row_number',
          type: 'number',
          isPrimary: true,
        },
      ];

      // Add columns based on headers
      headers.forEach((header: string, index: number) => {
        const fieldName =
          header
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '') || `column_${index}`;

        const dataType = this._inferDataType(sampleData.slice(0, 10).map((row) => row.values?.[index]));

        columns.push({
          name: fieldName,
          type: dataType,
          isPrimary: false,
        });

        console.log(`[GoogleSheets] 📊 Column: ${fieldName} (${dataType})`);
      });

      // Add semantic fields for common patterns
      columns.push(
        { name: 'amount_numeric', type: 'number', isPrimary: false },
        { name: 'date', type: 'string', isPrimary: false },
        { name: 'category', type: 'string', isPrimary: false },
        { name: 'description', type: 'string', isPrimary: false },
      );

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
    } catch (error) {
      console.warn('Failed to generate schema from public sheet:', error);
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

    let currencyCount = 0;
    let numberCount = 0;
    let dateCount = 0;

    for (const value of samples) {
      const strValue = String(value).trim();

      if (this._isLikelyCurrency(strValue)) {
        currencyCount++;
      } else if (!isNaN(Number(strValue)) && strValue !== '') {
        numberCount++;
      } else if (this._isLikelyDate(strValue)) {
        dateCount++;
      }
    }

    if (currencyCount >= samples.length * 0.5) {
      return 'currency';
    }

    if (numberCount >= samples.length * 0.7) {
      return 'number';
    }

    if (dateCount >= samples.length * 0.7) {
      return 'date';
    }

    return 'string';
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
  private _replaceParametersRecursively(obj: any, params: string[], visited = new WeakSet()): void {
    if (obj === null || obj === undefined) {
      return;
    }

    if (typeof obj === 'object' && visited.has(obj)) {
      return;
    }

    if (typeof obj === 'object') {
      visited.add(obj);
    }

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (typeof obj[i] === 'string' && /^\$\d+$/.test(obj[i])) {
          const paramIndex = parseInt(obj[i].substring(1)) - 1;

          if (paramIndex >= 0 && paramIndex < params.length) {
            obj[i] = this._parseParameterValue(params[paramIndex]);
          }
        } else if (typeof obj[i] === 'object') {
          this._replaceParametersRecursively(obj[i], params, visited);
        }
      }
    } else if (typeof obj === 'object') {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (typeof obj[key] === 'string' && /^\$\d+$/.test(obj[key])) {
            const paramIndex = parseInt(obj[key].substring(1)) - 1;

            if (paramIndex >= 0 && paramIndex < params.length) {
              obj[key] = this._parseParameterValue(params[paramIndex]);
            }
          } else if (typeof obj[key] === 'object') {
            this._replaceParametersRecursively(obj[key], params, visited);
          }
        }
      }
    }
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
    console.log(`[GoogleSheets] - SpreadsheetId: ${spreadsheetId}`);
    console.log(`[GoogleSheets] - Parameters: ${JSON.stringify(parameters, null, 2)}`);
    console.log(`[GoogleSheets] - Is Apps Script URL: ${this._isAppsScriptUrl(spreadsheetId)}`);

    try {
      if (this._isAppsScriptUrl(spreadsheetId)) {
        // Use Apps Script Web App for full functionality
        console.log(`[GoogleSheets] 📝 Using Apps Script Web App for updateRange`);
        return await this._callAppsScript(spreadsheetId, 'updateRange', parameters);
      }

      // Fallback for regular sheets - limited to append
      console.log(`[GoogleSheets] 📝 Regular sheet - converting update to append (LIMITED FUNCTIONALITY)`);
      console.log(
        `[GoogleSheets] ⚠️  WARNING: Update operations on public sheets without Apps Script are very limited!`,
      );

      const { values } = parameters;

      return await this._appendRowNoAuth(spreadsheetId, { values: Array.isArray(values[0]) ? values[0] : values });
    } catch (error) {
      console.error(`[GoogleSheets] ❌ _updateRangeNoAuth failed:`, error);
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
        await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`, {
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

          await fetch(`https://docs.google.com/forms/d/e/${spreadsheetId}/formResponse`, {
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

      const response = await fetch(webhookUrl, {
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

      const result = (await response.json()) as any;

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
      console.error(`[GoogleSheets] ❌ _clearValuesNoAuth failed:`, error);
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

      console.log(`[GoogleSheets] 🚀 Calling Apps Script:`);
      console.log(`[GoogleSheets] 📋 URL: ${webhookUrl}`);
      console.log(`[GoogleSheets] 📦 Payload:`, JSON.stringify(payload, null, 2));

      const startTime = Date.now();
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const duration = Date.now() - startTime;
      console.log(`[GoogleSheets] ⏱️  Request took ${duration}ms`);
      console.log(`[GoogleSheets] 📊 Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        console.error(`[GoogleSheets] ❌ Apps Script request failed: ${response.status} ${response.statusText}`);

        const responseText = await response.text();
        console.error(`[GoogleSheets] ❌ Response body:`, responseText);
        throw new Error(`Apps Script request failed: ${response.statusText} - ${responseText}`);
      }

      const responseText = await response.text();
      console.log(`[GoogleSheets] 📄 Raw response:`, responseText);

      try {
        const result = JSON.parse(responseText) as any;
        console.log(`[GoogleSheets] ✅ Parsed response:`, result);

        if (result.error) {
          console.error(`[GoogleSheets] ❌ Apps Script returned error:`, result.error);
          throw new Error(result.error);
        }

        return [
          {
            ...result,
            _debug: `✅ Apps Script call successful to ${webhookUrl}`,
          },
        ];
      } catch (parseError) {
        console.error(`[GoogleSheets] ❌ Failed to parse response as JSON:`, parseError);
        console.error(`[GoogleSheets] 📄 Response was:`, responseText);
        throw new Error(`Invalid JSON response from Apps Script: ${responseText}`);
      }

      return [{ success: true, result: 'Apps Script executed successfully' }];
    } catch (error) {
      throw new GoogleWorkspaceError(
        `Apps Script call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
