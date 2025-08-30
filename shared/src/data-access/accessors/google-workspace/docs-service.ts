import { GoogleWorkspaceAPIClient } from './api-client';
import { type GoogleDocsQuery, type GoogleDocsContent, type GoogleWorkspaceTable, GoogleWorkspaceError } from './types';

export class GoogleDocsService {
  private _apiClient: GoogleWorkspaceAPIClient;
  private _documentId: string;
  private _cachedDocument: GoogleDocsContent | null = null;
  private _cacheExpiry = 0;
  private readonly _cacheDuration = 5 * 60 * 1000; // 5 minutes

  constructor(apiClient: GoogleWorkspaceAPIClient, documentId: string) {
    this._apiClient = apiClient;
    this._documentId = documentId;
  }

  /**
   * Get document with caching
   */
  private async _getDocument(forceRefresh = false): Promise<GoogleDocsContent> {
    const now = Date.now();

    if (!forceRefresh && this._cachedDocument && now < this._cacheExpiry) {
      return this._cachedDocument;
    }

    this._cachedDocument = await this._apiClient.getDocument(this._documentId);
    this._cacheExpiry = now + this._cacheDuration;

    return this._cachedDocument;
  }

  /**
   * Execute a Google Docs query
   */
  async executeQuery(query: GoogleDocsQuery, params?: string[]): Promise<any[]> {
    const parsedQuery = typeof query === 'string' ? JSON.parse(query) : query;

    // Apply parameters if provided
    if (params && params.length > 0) {
      this._applyParameters(parsedQuery, params);
    }

    switch (parsedQuery.operation) {
      case 'readDocument':
        return this.readDocument(parsedQuery.parameters);
      case 'searchText':
        return this.searchText(parsedQuery.parameters?.searchTerm || '');
      case 'getDocumentStructure':
        return this.getDocumentStructure(parsedQuery.parameters);
      default:
        throw new GoogleWorkspaceError(`Unsupported operation: ${parsedQuery.operation}`);
    }
  }

  /**
   * Read entire document content
   */
  async readDocument(_parameters?: any): Promise<any[]> {
    const document = await this._getDocument();
    const results: any[] = [];

    if (!document.body?.content) {
      return results;
    }

    document.body.content.forEach((element, index) => {
      if (element.paragraph) {
        const paragraphText = this._extractTextFromParagraph(element.paragraph);

        if (paragraphText.trim()) {
          results.push({
            type: 'paragraph',
            index,
            content: paragraphText,
            style: element.paragraph.paragraphStyle || {},
          });
        }
      } else if (element.table) {
        const tableData = this._extractTableData(element.table);
        results.push({
          type: 'table',
          index,
          content: tableData,
          rows: element.table.tableRows?.length || 0,
          columns: element.table.columns || 0,
        });
      } else if (element.sectionBreak) {
        results.push({
          type: 'section_break',
          index,
          content: 'Section Break',
        });
      }
    });

    return results;
  }

  /**
   * Search for text in document
   */
  async searchText(searchTerm: string): Promise<any[]> {
    if (!searchTerm) {
      throw new GoogleWorkspaceError('Search term is required');
    }

    const results = await this._apiClient.searchText(this._documentId, searchTerm);

    return results.map((result, index) => ({
      matchIndex: index,
      type: result.type,
      content: result.content,
      elementIndex: result.elementIndex,
      excerpt: this._createExcerpt(result.content, searchTerm),
    }));
  }

  /**
   * Get document structure (headings, outline)
   */
  async getDocumentStructure(_parameters?: any): Promise<any[]> {
    const document = await this._getDocument();
    const structure: any[] = [];

    if (!document.body?.content) {
      return structure;
    }

    document.body.content.forEach((element, index) => {
      if (element.paragraph) {
        const style = element.paragraph.paragraphStyle?.namedStyleType;

        if (style && (style.includes('HEADING') || style.includes('TITLE'))) {
          const text = this._extractTextFromParagraph(element.paragraph);

          if (text.trim()) {
            structure.push({
              type: 'heading',
              level: this._getHeadingLevel(style),
              text: text.trim(),
              index,
              style,
            });
          }
        }
      }
    });

    return structure;
  }

  /**
   * Generate schema for BaseAccessor compatibility
   */
  async generateSchema(): Promise<GoogleWorkspaceTable[]> {
    const document = await this._getDocument();

    const documentTable: GoogleWorkspaceTable = {
      tableName: 'document',
      columns: [
        {
          name: 'element_index',
          type: 'number',
          isPrimary: true,
          description: 'Index of the element in the document',
        },
        {
          name: 'type',
          type: 'string',
          isPrimary: false,
          description: 'Type of document element',
          enumValues: ['paragraph', 'table', 'section_break', 'heading'],
        },
        {
          name: 'content',
          type: 'string',
          isPrimary: false,
          description: 'Text content of the element',
        },
        {
          name: 'style',
          type: 'object',
          isPrimary: false,
          description: 'Style information for the element',
        },
      ],
      metadata: {
        documentType: 'docs',
        documentId: this._documentId,
        lastModified: document.revisionId,
        url: `https://docs.google.com/document/d/${this._documentId}/edit`,
      },
    };

    // Check if document has tables and add table schema
    const tables: GoogleWorkspaceTable[] = [documentTable];

    const hasTable = await this._hasTablesInDocument();

    if (hasTable) {
      tables.push({
        tableName: 'tables',
        columns: [
          {
            name: 'table_index',
            type: 'number',
            isPrimary: true,
            description: 'Index of the table in the document',
          },
          {
            name: 'row_index',
            type: 'number',
            isPrimary: false,
            description: 'Row index within the table',
          },
          {
            name: 'column_index',
            type: 'number',
            isPrimary: false,
            description: 'Column index within the table',
          },
          {
            name: 'cell_content',
            type: 'string',
            isPrimary: false,
            description: 'Content of the table cell',
          },
        ],
        metadata: {
          documentType: 'docs',
          documentId: this._documentId,
          lastModified: document.revisionId,
          url: `https://docs.google.com/document/d/${this._documentId}/edit`,
        },
      });
    }

    return tables;
  }

  /**
   * Test connection to the specific document
   */
  async testConnection(): Promise<boolean> {
    try {
      await this._getDocument();
      return true;
    } catch (error) {
      console.error('Google Docs connection test failed:', error);
      return false;
    }
  }

  // Helper methods

  /**
   * Extract text from a paragraph element
   */
  private _extractTextFromParagraph(paragraph: any): string {
    if (!paragraph.elements) {
      return '';
    }

    return paragraph.elements.map((element: any) => element.textRun?.content || '').join('');
  }

  /**
   * Extract data from a table element
   */
  private _extractTableData(table: any): any[][] {
    if (!table.tableRows) {
      return [];
    }

    return table.tableRows.map((row: any) => {
      if (!row.tableCells) {
        return [];
      }

      return row.tableCells.map((cell: any) => {
        if (!cell.content) {
          return '';
        }

        return cell.content
          .map((element: any) => {
            if (element.paragraph) {
              return this._extractTextFromParagraph(element.paragraph);
            }

            return '';
          })
          .join('');
      });
    });
  }

  /**
   * Create an excerpt around the search term
   */
  private _createExcerpt(content: string, searchTerm: string, contextLength = 50): string {
    const index = content.toLowerCase().indexOf(searchTerm.toLowerCase());

    if (index === -1) {
      return content.substring(0, contextLength * 2) + '...';
    }

    const start = Math.max(0, index - contextLength);
    const end = Math.min(content.length, index + searchTerm.length + contextLength);

    let excerpt = content.substring(start, end);

    if (start > 0) {
      excerpt = '...' + excerpt;
    }

    if (end < content.length) {
      excerpt = excerpt + '...';
    }

    return excerpt;
  }

  /**
   * Get heading level from style type
   */
  private _getHeadingLevel(styleType: string): number {
    if (styleType.includes('HEADING_1')) {
      return 1;
    }

    if (styleType.includes('HEADING_2')) {
      return 2;
    }

    if (styleType.includes('HEADING_3')) {
      return 3;
    }

    if (styleType.includes('HEADING_4')) {
      return 4;
    }

    if (styleType.includes('HEADING_5')) {
      return 5;
    }

    if (styleType.includes('HEADING_6')) {
      return 6;
    }

    if (styleType.includes('TITLE')) {
      return 0;
    }

    return 1;
  }

  /**
   * Check if document has tables
   */
  private async _hasTablesInDocument(): Promise<boolean> {
    const document = await this._getDocument();

    if (!document.body?.content) {
      return false;
    }

    return document.body.content.some((element) => element.table);
  }

  /**
   * Apply parameters to query (similar to MongoDB implementation)
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
        if (typeof obj[i] === 'string' && this._isValidParameterPlaceholder(obj[i])) {
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
          if (typeof obj[key] === 'string' && this._isValidParameterPlaceholder(obj[key])) {
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
   * Check if value is a valid parameter placeholder
   */
  private _isValidParameterPlaceholder(value: string): boolean {
    return /^\$\d+$/.test(value);
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
   * Get document info for debugging
   */
  async getDocumentInfo(): Promise<{ title: string; id: string; revisionId: string; url: string }> {
    const document = await this._getDocument();

    return {
      title: document.title || 'Untitled Document',
      id: this._documentId,
      revisionId: document.revisionId || '',
      url: `https://docs.google.com/document/d/${this._documentId}/edit`,
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this._cachedDocument = null;
    this._cacheExpiry = 0;
  }
}
