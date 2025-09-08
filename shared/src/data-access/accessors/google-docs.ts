import type { Table } from '../../types';
import { GoogleWorkspaceAuthManager } from './google-workspace/auth-manager';
import { GoogleWorkspaceAPIClient } from './google-workspace/api-client';
import { GoogleDocsService } from './google-workspace/docs-service';
import { type GoogleConnectionInfo, type GoogleWorkspaceConfig, GoogleWorkspaceError } from './google-workspace/types';
import { type DataAccessPluginId, type DataSourceProperty, DataSourceType } from '@liblab/data-access/utils/types';
import { BaseDatabaseAccessor } from '@liblab/data-access/baseDatabaseAccessor';

// TODO: https://linear.app/liblab/issue/ENG-966/adapt-google-sheets-docs-to-a-new-accessor-context-provider-style
export class GoogleDocsAccessor extends BaseDatabaseAccessor {
  readonly pluginId: DataAccessPluginId = 'google-docs';
  readonly label = 'Google Docs';
  readonly dataSourceType: DataSourceType = DataSourceType.GOOGLE_DOCS;

  readonly preparedStatementPlaceholderExample = '{ searchTerm: $1, includeHeaders: $2 }';
  readonly connectionStringFormat = 'docs://DOCUMENT_ID/?auth=oauth2&client_id=xxx&scope=documents.readonly';

  private _authManager: GoogleWorkspaceAuthManager | null = null;
  private _apiClient: GoogleWorkspaceAPIClient | null = null;
  private _docsService: GoogleDocsService | null = null;
  private _documentId: string | null = null;
  private _connectionInfo: GoogleConnectionInfo | null = null;

  static isAccessor(databaseUrl: string): boolean {
    return databaseUrl.startsWith('docs://');
  }

  async testConnection(dataSourceProperties: DataSourceProperty[]): Promise<boolean> {
    try {
      const connectionString = this.getConnectionStringFromProperties(dataSourceProperties);
      // Parse connection string to extract document ID and auth info
      const connectionInfo = this._parseConnectionString(connectionString);

      // Initialize auth manager with minimal config for testing
      const authManager = new GoogleWorkspaceAuthManager();
      const config: GoogleWorkspaceConfig = {
        type: connectionInfo.auth.type,
        clientId: connectionInfo.auth.clientId,
        scopes: GoogleWorkspaceAuthManager.getRecommendedScopes('docs', true),
      };

      await authManager.initialize(config);

      // Create API client and test document access
      const apiClient = new GoogleWorkspaceAPIClient(authManager);
      const success = await apiClient.testConnection('docs', connectionInfo.documentId);

      // Cleanup
      await apiClient.cleanup();
      await authManager.cleanup();

      return success;
    } catch (error) {
      console.error('Google Docs connection test failed:', error);
      return false;
    }
  }

  async executeQuery(query: string, params?: string[]): Promise<any[]> {
    if (!this._docsService) {
      throw new GoogleWorkspaceError('Google Docs service not initialized. Please call initialize() first.');
    }

    let parsedQuery: any;

    try {
      parsedQuery = JSON.parse(query);
    } catch (parseError) {
      console.error('Failed to parse Google Docs query:', {
        original: query,
        error: parseError,
      });
      throw new GoogleWorkspaceError(
        `Invalid JSON format for Google Docs query: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`,
      );
    }

    try {
      console.log('Google Docs: Executing query:', JSON.stringify(parsedQuery, null, 2));

      if (!parsedQuery.operation) {
        throw new GoogleWorkspaceError('Google Docs query must specify an operation');
      }

      if (!parsedQuery.documentId && !this._documentId) {
        throw new GoogleWorkspaceError('Document ID not found in query or connection');
      }

      // Use document ID from query or fallback to connection
      const documentId = parsedQuery.documentId || this._documentId;

      // Ensure the query has the correct document ID
      parsedQuery.documentId = documentId;

      const result = await this._docsService.executeQuery(parsedQuery, params);

      console.log(`Google Docs: Query returned ${result.length} items`);

      if (result.length > 0) {
        console.log('Google Docs: Sample result:', this._safeStringify(result[0]));
      }

      return result;
    } catch (error) {
      console.error('Error executing Google Docs query:', error);
      throw new GoogleWorkspaceError((error as Error)?.message);
    }
  }

  guardAgainstMaliciousQuery(query: string): void {
    if (!query) {
      throw new GoogleWorkspaceError('No Google Docs query provided. Please provide a valid query to execute.');
    }

    let parsedQuery: any;

    try {
      parsedQuery = JSON.parse(query);
    } catch (parseError) {
      console.error('Google Docs JSON parsing error:', parseError);
      throw new GoogleWorkspaceError(
        `Invalid JSON format for Google Docs query: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      );
    }

    try {
      // Validate that we have a proper Google Docs query structure
      if (!parsedQuery || typeof parsedQuery !== 'object') {
        throw new GoogleWorkspaceError('Google Docs query must be a valid JSON object');
      }

      if (!parsedQuery.operation) {
        throw new GoogleWorkspaceError('Google Docs query must specify an operation');
      }

      if (!['readDocument', 'searchText', 'getDocumentStructure'].includes(parsedQuery.operation)) {
        throw new GoogleWorkspaceError(
          'Google Docs query must specify a valid operation (readDocument, searchText, getDocumentStructure)',
        );
      }

      // Check for potentially dangerous parameters
      const forbiddenKeys = ['eval', 'function', 'script', 'exec'];
      const queryString = JSON.stringify(parsedQuery).toLowerCase();

      if (forbiddenKeys.some((key) => queryString.includes(key))) {
        throw new GoogleWorkspaceError('Query contains forbidden operations');
      }

      // Validate document ID format if present
      if (parsedQuery.documentId) {
        const documentIdPattern = /^[a-zA-Z0-9-_]{20,}$/;

        if (!documentIdPattern.test(parsedQuery.documentId)) {
          console.error(
            'Invalid document ID in query:',
            parsedQuery.documentId,
            'Length:',
            parsedQuery.documentId.length,
          );
          throw new GoogleWorkspaceError(`Invalid document ID format: ${parsedQuery.documentId}`);
        }
      }
    } catch (error) {
      if (error instanceof GoogleWorkspaceError && error.message.startsWith('Google Docs query')) {
        throw error;
      }

      throw new GoogleWorkspaceError(
        `Query validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  validateProperties(dataSourceProperties: DataSourceProperty[]): void {
    try {
      const connectionString = this.getConnectionStringFromProperties(dataSourceProperties);
      const connectionInfo = this._parseConnectionString(connectionString);

      // Validate document ID format
      const documentIdPattern = /^[a-zA-Z0-9-_]{20,}$/;

      if (!documentIdPattern.test(connectionInfo.documentId)) {
        console.error(
          'Invalid Google Docs document ID:',
          connectionInfo.documentId,
          'Length:',
          connectionInfo.documentId.length,
        );
        throw new GoogleWorkspaceError(`Invalid Google Docs document ID format: ${connectionInfo.documentId}`);
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
        `Invalid Google Docs connection string: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getSchema(): Promise<Table[]> {
    if (!this._docsService) {
      throw new GoogleWorkspaceError('Google Docs service not initialized. Please call initialize() first.');
    }

    try {
      const workspaceTables = await this._docsService.generateSchema();

      // Convert GoogleWorkspaceTable to BaseAccessor Table format
      return workspaceTables.map((wsTable) => ({
        tableName: wsTable.tableName,
        columns: wsTable.columns.map((wsCol) => ({
          name: wsCol.name,
          type: wsCol.type,
          isPrimary: wsCol.isPrimary,
          enumValues: wsCol.enumValues,
        })),
      }));
    } catch (error) {
      console.error('Error fetching Google Docs schema:', error);
      throw new GoogleWorkspaceError((error as Error)?.message);
    }
  }

  async initialize(connectionString: string): Promise<void> {
    if (this._authManager) {
      await this.close();
    }

    console.log('Google Docs: Initializing connection with:', connectionString);

    // Parse connection string
    this._connectionInfo = this._parseConnectionString(connectionString);
    this._documentId = this._connectionInfo.documentId;

    console.log('Google Docs: Using document ID:', this._documentId);

    // Initialize authentication
    this._authManager = new GoogleWorkspaceAuthManager(process.env.GOOGLE_AUTH_ENCRYPTION_KEY);

    const config: GoogleWorkspaceConfig = {
      type: this._connectionInfo.auth.type,
      clientId: this._connectionInfo.auth.clientId || process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
      serviceAccountPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
      apiKey: process.env.GOOGLE_API_KEY,
      scopes: GoogleWorkspaceAuthManager.getRecommendedScopes('docs', true),
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

    // Initialize Docs service
    this._docsService = new GoogleDocsService(this._apiClient, this._documentId);

    // Test the connection
    try {
      const documentInfo = await this._docsService.getDocumentInfo();
      console.log('Google Docs: Connected to document:', documentInfo);

      if (!documentInfo.title || documentInfo.title === 'Untitled Document') {
        console.log('⚠️  WARNING: Document appears to be untitled or empty');
        console.log('⚠️  Check if your document ID is correct and document has content');
        console.log('⚠️  Document ID:', this._documentId);
        console.log('⚠️  Document URL:', documentInfo.url);
      }
    } catch (error) {
      console.log('Google Docs: Could not get document info:', (error as Error).message);
      throw new GoogleWorkspaceError('Failed to access Google Document. Check your document ID and permissions.');
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

    this._docsService = null;
    this._documentId = null;
    this._connectionInfo = null;
  }

  generateSampleSchema(): Table[] {
    return [
      {
        tableName: 'document',
        columns: [
          { name: 'element_index', type: 'number', isPrimary: true },
          {
            name: 'type',
            type: 'string',
            isPrimary: false,
            enumValues: ['paragraph', 'table', 'section_break', 'heading'],
          },
          { name: 'content', type: 'string', isPrimary: false },
          { name: 'style', type: 'object', isPrimary: false },
        ],
      },
      {
        tableName: 'document_structure',
        columns: [
          { name: 'heading_index', type: 'number', isPrimary: true },
          { name: 'level', type: 'number', isPrimary: false },
          { name: 'text', type: 'string', isPrimary: false },
          { name: 'style', type: 'string', isPrimary: false },
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
    return `You are a Google Docs API expert tasked with generating Google Docs queries based on a given document schema and user requirements.
Your goal is to create accurate, optimized queries that address the user's request while adhering to specific guidelines and output format.

You will be working with the following document type:
<documentType>
${databaseType}
</documentType>

Here is the document schema you should use (document structure and content types):
<documentSchema>
${dbSchema}
</documentSchema>

${existingQueries ? `Here are the existing Google Docs queries used by the app the user is building. Use them as context if they need to be updated to fulfill the user's request: <existing_docs_queries>${existingQueries}</existing_docs_queries>` : ''}

To generate the Google Docs queries, follow these steps:
1. Carefully analyze the user's request and the provided document schema.
2. Create one or more Google Docs queries that accurately address the user's requirements.
3. Structure queries as JSON objects with the following format:
   {
     "operation": "readDocument" | "searchText" | "getDocumentStructure",
     "documentId": "document-id-if-needed",
     "parameters": {
       "searchTerm": "text to search for",
       "includeHeaders": true,
       "includeTables": true,
       "maxResults": 100
     }
   }
4. Use appropriate Google Docs operations:
   - "readDocument": Read entire document content including paragraphs, tables, and formatting
   - "searchText": Search for specific text within the document
   - "getDocumentStructure": Get document outline with headings and structure
5. Do not use any operations that could modify the document.
6. Use appropriate parameters for each operation type.
7. Optimize queries for the specific document structure shown in the schema.
8. If needed, parametrize the query using positional placeholders like $1, $2, etc.
9. Use exact field names and structure as shown in the schema.
10. For text search queries, consider document structure and content organization.
11. Provide a brief explanation for each query.
12. Specify the response schema for each query, including expected content types.

Format your response as a JSON array containing objects with the following structure:
{
  "query": "Your Google Docs query as JSON string here",
  "explanation": "A brief explanation of what the query does",
  "responseSchema": "field_name1 (data_type), field_name2 (data_type), ..."
}

Here's an example of a valid response:
[
  {
    "query": "{\\"operation\\": \\"readDocument\\", \\"parameters\\": {\\"includeHeaders\\": true, \\"includeTables\\": true}}",
    "explanation": "Reads the entire document content including all paragraphs, headings, and tables",
    "responseSchema": "element_index (number), type (string), content (string), style (object)"
  },
  {
    "query": "{\\"operation\\": \\"searchText\\", \\"parameters\\": {\\"searchTerm\\": \\"$1\\", \\"maxResults\\": 10}}",
    "explanation": "Searches for specific text within the document and returns matching excerpts",
    "responseSchema": "matchIndex (number), type (string), content (string), excerpt (string)"
  },
  {
    "query": "{\\"operation\\": \\"getDocumentStructure\\", \\"parameters\\": {\\"includeHeaders\\": true}}",
    "explanation": "Retrieves the document outline with all headings and their hierarchy",
    "responseSchema": "type (string), level (number), text (string), index (number), style (string)"
  }
]

IMPORTANT: Your output should consist ONLY of the JSON array containing the query objects. Do not include any additional text or explanations outside of this JSON structure.
IMPORTANT: The query field should contain a properly formatted JSON string representing the Google Docs query object. Use standard JSON escaping (not double-escaped).

Now, generate Google Docs queries based on the following user request:
<userRequest>
${userPrompt}
</userRequest>`;
  }

  // Helper methods

  private _parseConnectionString(connectionString: string): GoogleConnectionInfo {
    try {
      const url = new URL(connectionString);

      if (url.protocol !== 'docs:') {
        throw new GoogleWorkspaceError('Connection string must start with docs://');
      }

      // Extract document ID from hostname
      const documentId = url.hostname;

      if (!documentId) {
        throw new GoogleWorkspaceError('Document ID is required in connection string');
      }

      // Extract auth parameters
      const params = new URLSearchParams(url.search);
      const authType = (params.get('auth') as 'oauth2' | 'service-account' | 'api-key') || 'oauth2';
      const clientId = params.get('client_id') || undefined;
      const scope = params.get('scope') || undefined;
      const accessToken = params.get('access_token') || undefined;
      const refreshToken = params.get('refresh_token') || undefined;

      return {
        type: 'docs',
        documentId,
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
