import { GoogleWorkspaceAPIClient } from './api-client';
import {
  type GoogleSheetsQuery,
  type GoogleSheetsContent,
  type GoogleWorkspaceTable,
  type GoogleWorkspaceColumn,
  GoogleWorkspaceError,
} from './types';

export class GoogleSheetsService {
  private _apiClient: GoogleWorkspaceAPIClient;
  private _spreadsheetId: string;
  private _cachedSpreadsheet: GoogleSheetsContent | null = null;
  private _cacheExpiry = 0;
  private readonly _cacheDuration = 5 * 60 * 1000; // 5 minutes

  constructor(apiClient: GoogleWorkspaceAPIClient, spreadsheetId: string) {
    this._apiClient = apiClient;
    this._spreadsheetId = spreadsheetId;
  }

  /**
   * Get spreadsheet with caching
   */
  private async _getSpreadsheet(forceRefresh = false, includeGridData = false): Promise<GoogleSheetsContent> {
    const now = Date.now();

    if (!forceRefresh && this._cachedSpreadsheet && now < this._cacheExpiry && !includeGridData) {
      return this._cachedSpreadsheet;
    }

    this._cachedSpreadsheet = await this._apiClient.getSpreadsheet(this._spreadsheetId, includeGridData);
    this._cacheExpiry = now + this._cacheDuration;

    return this._cachedSpreadsheet;
  }

  /**
   * Execute a Google Sheets query
   */
  async executeQuery(query: GoogleSheetsQuery, params?: string[]): Promise<any[]> {
    const parsedQuery = typeof query === 'string' ? JSON.parse(query) : query;

    // Apply parameters if provided
    if (params && params.length > 0) {
      this._applyParameters(parsedQuery, params);
    }

    switch (parsedQuery.operation) {
      case 'readRange':
        return this.readRange(parsedQuery.parameters);
      case 'readSheet':
        return this.readSheet(parsedQuery.parameters);
      case 'getAllSheets':
        return this.getAllSheets();
      case 'getValues':
        return this.getValues(parsedQuery.parameters);
      default:
        throw new GoogleWorkspaceError(`Unsupported operation: ${parsedQuery.operation}`);
    }
  }

  /**
   * Read data from a specific range with universal semantic support
   */
  async readRange(parameters?: any): Promise<any[]> {
    let range = parameters?.range || 'A:Z';
    const valueRenderOption = parameters?.valueRenderOption || 'FORMATTED_VALUE';

    // If range contains a sheet name, ensure it's properly quoted
    if (range.includes('!')) {
      const [sheetName, rangeSpec] = range.split('!');
      const quotedSheetName = this._quoteSheetName(sheetName);
      range = `${quotedSheetName}!${rangeSpec}`;
    }

    const values = await this._apiClient.getValues(this._spreadsheetId, range, valueRenderOption);

    // For single column queries, apply intelligent filtering to get only meaningful data
    if (this._isSingleColumnQuery(range)) {
      // Get all data first to run intelligent detection
      const fullRange = range.replace(/[A-Z]+:[A-Z]+/, 'A:Z');
      const fullValues = await this._apiClient.getValues(this._spreadsheetId, fullRange, valueRenderOption);
      const dataAnalysis = this._findMostSignificantDataRegion(fullValues);

      // Extract the column index from the range
      const columnMatch = range.match(/([A-Z]+):([A-Z]+)/);

      if (columnMatch) {
        const columnIndex = this._columnLetterToIndex(columnMatch[1]);

        // Return only data rows for this column
        const columnData = dataAnalysis.dataRows.map((row, dataIndex) => ({
          row: dataAnalysis.dataStartIndex + dataIndex + 1,
          values: [row[columnIndex] || ''],
          range,
        }));

        return columnData;
      }
    }

    // For other ranges, return as-is
    return values.map((row, rowIndex) => ({
      row: rowIndex + 1,
      values: row,
      range: `${this._getColumnLetter(0)}${rowIndex + 1}:${this._getColumnLetter(Math.max(0, row.length - 1))}${rowIndex + 1}`,
    }));
  }

  private _isSingleColumnQuery(range: string): boolean {
    return /[A-Z]+:[A-Z]+/.test(range) && range.split(':')[0].replace(/.*!/, '') === range.split(':')[1];
  }

  /**
   * Read entire sheet data
   */
  async readSheet(parameters?: any): Promise<any[]> {
    const sheetName = parameters?.sheetName;

    if (!sheetName) {
      throw new GoogleWorkspaceError('Sheet name is required for readSheet operation');
    }

    // Quote sheet name if it contains spaces or special characters
    const quotedSheetName = this._quoteSheetName(sheetName);
    const range = `${quotedSheetName}!A:Z`; // Read full range to ensure we get all data
    const valueRenderOption = parameters?.valueRenderOption || 'FORMATTED_VALUE';

    const values = await this._apiClient.getValues(this._spreadsheetId, range, valueRenderOption);

    // Use intelligent data detection to find meaningful data
    const dataAnalysis = this._findMostSignificantDataRegion(values);

    // Transform data to match expected dashboard format
    const processedRows = dataAnalysis.dataRows.map((row, dataIndex) => {
      // Create a normalized object with both formats for compatibility
      const normalizedRow: any = {
        sheet: sheetName,
        row: dataAnalysis.dataStartIndex + dataIndex + 1,
        values: row,
        range: `${quotedSheetName}!${this._getColumnLetter(0)}${dataAnalysis.dataStartIndex + dataIndex + 1}:${this._getColumnLetter(Math.max(0, (row?.length || 1) - 1))}${dataAnalysis.dataStartIndex + dataIndex + 1}`,
        headers: dataAnalysis.headers,
      };

      // Add direct field access - UNIVERSAL for ANY column names
      (dataAnalysis.headers || []).forEach((header, index) => {
        const cellValue = row[index] || '';

        // Always create field access using the exact header name (cleaned for JS)
        if (header && header.trim()) {
          const fieldName = header
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
          normalizedRow[fieldName] = cellValue;
        }

        // Create generic column accessors (works even without headers)
        normalizedRow[`col_${index}`] = cellValue;
        normalizedRow[`column_${this._getColumnLetter(index).toLowerCase()}`] = cellValue; // column_a, column_b, etc.
      });

      // UNIVERSAL DATA-BASED DETECTION (no keywords needed)
      // Analyze the actual DATA to determine semantic meaning
      const dataTypes = this._analyzeRowDataTypes(row);

      // Find the most likely semantic fields based on DATA PATTERNS, not keywords
      if (dataTypes.dateColumns.length > 0) {
        // First date-like column becomes the primary date
        normalizedRow.date = row[dataTypes.dateColumns[0]] || '';
        normalizedRow._semantic_date_column = dataTypes.dateColumns[0];
      }

      if (dataTypes.currencyColumns.length > 0) {
        // First currency-like column becomes the primary amount
        const amountCol = dataTypes.currencyColumns[0];
        normalizedRow.amount = row[amountCol] || '';
        normalizedRow._semantic_amount_column = amountCol;

        // Parse numeric value
        const numericAmount = parseFloat(String(row[amountCol] || '0').replace(/[^\d.-]/g, ''));
        normalizedRow.amount_numeric = isNaN(numericAmount) ? 0 : numericAmount;
      } else {
        // Ensure amount_numeric always exists for dashboard calculations
        normalizedRow.amount = '';
        normalizedRow.amount_numeric = 0;
      }

      if (dataTypes.textColumns.length > 0) {
        // Smart semantic mapping based on text content patterns across ALL data rows
        const textCols = dataTypes.textColumns;

        // Analyze patterns across all rows for better semantic detection
        const columnAnalysis = textCols
          .map((colIndex) => {
            const columnValues = dataAnalysis.dataRows
              .map((r) => String(r[colIndex] || '').trim())
              .filter((v) => v.length > 0);
            const avgLength = columnValues.reduce((sum, val) => sum + val.length, 0) / Math.max(columnValues.length, 1);
            const avgWords =
              columnValues.reduce((sum, val) => sum + val.split(/\s+/).length, 0) / Math.max(columnValues.length, 1);
            const uniqueValues = new Set(columnValues).size;
            const repeatRatio = columnValues.length > 0 ? uniqueValues / columnValues.length : 1;

            return {
              colIndex,
              avgLength,
              avgWords,
              repeatRatio, // Lower = more repeated values (good for categories)
              isCategorical: avgLength < 15 && avgWords <= 2 && repeatRatio < 0.8, // More categorical if shorter, fewer words, more repeats
              currentValue: String(row[colIndex] || '').trim(),
            };
          })
          .sort((a, b) => {
            // Prioritize columns that look more categorical
            if (a.isCategorical && !b.isCategorical) {
              return -1;
            }

            if (!a.isCategorical && b.isCategorical) {
              return 1;
            }

            // Then by repeat ratio (lower = more categorical)
            return a.repeatRatio - b.repeatRatio;
          });

        // Most categorical column becomes category
        const categoryCol = columnAnalysis.find((c) => c.isCategorical)?.colIndex || textCols[0];

        // Most descriptive (non-categorical) column becomes description
        const descriptionCol =
          columnAnalysis.find((c) => c.colIndex !== categoryCol && c.currentValue.length > 0)?.colIndex || textCols[1];

        // Any remaining column becomes notes
        const notesCol =
          textCols.find((colIndex) => colIndex !== categoryCol && colIndex !== descriptionCol) || textCols[2];

        if (categoryCol !== undefined) {
          normalizedRow.category = row[categoryCol] || '';
          normalizedRow._semantic_category_column = categoryCol;
        }

        if (descriptionCol !== undefined) {
          normalizedRow.description = row[descriptionCol] || '';
          normalizedRow._semantic_description_column = descriptionCol;
        }

        if (notesCol !== undefined) {
          normalizedRow.notes = row[notesCol] || '';
          normalizedRow._semantic_notes_column = notesCol;
        }
      }

      return normalizedRow;
    });

    return processedRows;
  }

  /**
   * Get all sheets information
   */
  async getAllSheets(): Promise<any[]> {
    const spreadsheet = await this._getSpreadsheet();

    return (
      spreadsheet.sheets?.map((sheet) => ({
        name: sheet.properties?.title || '',
        id: sheet.properties?.sheetId || 0,
        index: sheet.properties?.index || 0,
        rowCount: sheet.properties?.gridProperties?.rowCount || 0,
        columnCount: sheet.properties?.gridProperties?.columnCount || 0,
        sheetType: sheet.properties?.sheetType || 'GRID',
      })) || []
    );
  }

  /**
   * Get values from multiple ranges
   */
  async getValues(parameters?: any): Promise<any[]> {
    const ranges = parameters?.ranges || ['A:Z'];
    const valueRenderOption = parameters?.valueRenderOption || 'FORMATTED_VALUE';

    if (typeof ranges === 'string') {
      // Single range
      const values = await this._apiClient.getValues(this._spreadsheetId, ranges, valueRenderOption);
      return values.map((row, rowIndex) => ({
        range: ranges,
        row: rowIndex + 1,
        values: row,
      }));
    } else {
      // Multiple ranges
      const batchValues = await this._apiClient.batchGetValues(this._spreadsheetId, ranges, valueRenderOption);
      const results: any[] = [];

      Object.entries(batchValues).forEach(([range, values]) => {
        values.forEach((row, rowIndex) => {
          results.push({
            range,
            row: rowIndex + 1,
            values: row,
          });
        });
      });

      return results;
    }
  }

  /**
   * Generate schema for BaseAccessor compatibility
   */
  async generateSchema(): Promise<GoogleWorkspaceTable[]> {
    const spreadsheet = await this._getSpreadsheet();
    const tables: GoogleWorkspaceTable[] = [];

    // Main spreadsheet info table
    const spreadsheetTable: GoogleWorkspaceTable = {
      tableName: 'spreadsheet_info',
      columns: [
        {
          name: 'property',
          type: 'string',
          isPrimary: true,
          description: 'Property name',
        },
        {
          name: 'value',
          type: 'string',
          isPrimary: false,
          description: 'Property value',
        },
      ],
      metadata: {
        documentType: 'sheets',
        documentId: this._spreadsheetId,
        url: `https://docs.google.com/spreadsheets/d/${this._spreadsheetId}/edit`,
      },
    };

    tables.push(spreadsheetTable);

    // Create a table for each sheet
    if (spreadsheet.sheets) {
      for (const sheet of spreadsheet.sheets) {
        const sheetName = sheet.properties?.title || 'untitled';
        const columnCount = sheet.properties?.gridProperties?.columnCount || 0;

        // Analyze sheet data structure for better schema generation
        const dataAnalysis = await this._analyzeSheetData(sheetName, columnCount);

        const columns: GoogleWorkspaceColumn[] = [
          {
            name: 'row_number',
            type: 'number',
            isPrimary: true,
            description: 'Row number in the sheet',
          },
        ];

        // Add defensive programming for data analysis results
        if (!dataAnalysis || !dataAnalysis.columns || !Array.isArray(dataAnalysis.columns)) {
          // Fallback to basic column structure
          for (let i = 0; i < Math.min(columnCount, 8); i++) {
            columns.push({
              name: `column_${this._getColumnLetter(i).toLowerCase()}`,
              type: 'string',
              isPrimary: false,
              description: `Data from column ${this._getColumnLetter(i)}`,
            });
          }

          tables.push({
            tableName: this._sanitizeTableName(sheetName),
            columns,
            metadata: {
              documentType: 'sheets' as const,
              documentId: this._spreadsheetId,
              lastModified: spreadsheet.properties?.title,
              url: `https://docs.google.com/spreadsheets/d/${this._spreadsheetId}/edit#gid=${sheet.properties?.sheetId}`,
              actualSheetName: sheetName,
              columnMapping: [],
              semanticFieldMapping: {},
              physicalRange: `A:${this._getColumnLetter(Math.min(columnCount - 1, 7))}`,
              dataStartRow: 1,
              dataPreview: [],
              totalRows: 0,
            },
          });

          continue; // Skip to next sheet
        }

        // Add columns based on data analysis
        dataAnalysis.columns.forEach((colInfo, i) => {
          const physicalColumnLetter = this._getColumnLetter(i);
          columns.push({
            name: this._sanitizeColumnName(colInfo.header),
            type: colInfo.dataType,
            isPrimary: false,
            description: `${colInfo.description}. Physical column: ${physicalColumnLetter}. Example values: ${colInfo.examples.slice(0, 2).join(', ')}`,
          });
        });

        // Create universal address mapping for semantic fields first
        const semanticFieldMapping = this._createSemanticFieldMapping(dataAnalysis);

        // Add explicit semantic field columns so AI knows they exist
        if (semanticFieldMapping.amount_numeric) {
          columns.push({
            name: 'amount_numeric',
            type: 'number',
            isPrimary: false,
            description: `Numeric amount value for calculations and aggregations. Parsed from ${semanticFieldMapping.amount.columnLetter} column. Use this field for SUM, AVG, and other numeric operations.`,
          });
        }

        if (semanticFieldMapping.date) {
          columns.push({
            name: 'date',
            type: 'string',
            isPrimary: false,
            description: `Date field from ${semanticFieldMapping.date.columnLetter} column. Contains date values like '3/30', '3/31', etc.`,
          });
        }

        if (semanticFieldMapping.category) {
          columns.push({
            name: 'category',
            type: 'string',
            isPrimary: false,
            description: `Category field from ${semanticFieldMapping.category.columnLetter} column. Contains categorical values like 'Uber', 'Food', etc.`,
          });
        }

        if (semanticFieldMapping.description) {
          columns.push({
            name: 'description',
            type: 'string',
            isPrimary: false,
            description: `Description field from ${semanticFieldMapping.description.columnLetter} column. Contains descriptive text like 'Home - Airport', 'Lunch', etc.`,
          });
        }

        if (semanticFieldMapping.notes) {
          columns.push({
            name: 'notes',
            type: 'string',
            isPrimary: false,
            description: `Notes field from ${semanticFieldMapping.notes.columnLetter} column. Contains additional notes and references.`,
          });
        }

        // Create column mapping for AI query generation (with safe fallback)
        const headers = (dataAnalysis as any).headers || [];
        const columnMapping = headers.map((header: string, index: number) => ({
          semantic: this._sanitizeColumnName(header || `column_${index}`),
          physical: this._getColumnLetter(index),
          header: header || `Column ${this._getColumnLetter(index)}`,
          index,
        }));

        const tableSchema = {
          tableName: this._sanitizeTableName(sheetName),
          columns,
          metadata: {
            documentType: 'sheets' as const,
            documentId: this._spreadsheetId,
            lastModified: spreadsheet.properties?.title,
            url: `https://docs.google.com/spreadsheets/d/${this._spreadsheetId}/edit#gid=${sheet.properties?.sheetId}`,
            actualSheetName: sheetName, // Store the real sheet name for queries
            columnMapping, // Physical to semantic column mapping
            semanticFieldMapping, // Universal semantic field addresses
            physicalRange: `A:${this._getColumnLetter(Math.max(0, ((dataAnalysis as any).headers?.length || 1) - 1))}`, // Actual data range
            dataStartRow: (dataAnalysis as any).dataStartIndex + 1, // First row with actual data
            dataPreview: dataAnalysis.preview,
            totalRows: dataAnalysis.totalRows,
          },
        };

        tables.push(tableSchema);
      }
    }

    return tables;
  }

  /**
   * Test connection to the specific spreadsheet
   */
  async testConnection(): Promise<boolean> {
    try {
      await this._getSpreadsheet();
      return true;
    } catch (error) {
      console.error('Google Sheets connection test failed:', error);
      return false;
    }
  }

  // Helper methods

  /**
   * Quote sheet name if it contains spaces or special characters
   */
  private _quoteSheetName(sheetName: string): string {
    // Quote sheet name if it contains spaces, single quotes, or other special characters
    if (/[\s'"]/.test(sheetName)) {
      return `'${sheetName.replace(/'/g, "''")}'`;
    }

    return sheetName;
  }

  /**
   * Analyze sheet data structure for better schema generation
   */
  private async _analyzeSheetData(
    sheetName: string,
    columnCount: number,
  ): Promise<{
    columns: Array<{
      header: string;
      dataType: string;
      description: string;
      examples: string[];
    }>;
    preview: any[];
    totalRows: number;
  }> {
    try {
      const quotedSheetName = this._quoteSheetName(sheetName);
      // Read more rows to find actual data (many sheets have headers/metadata at the top)
      const range = `${quotedSheetName}!A1:${this._getColumnLetter(Math.min(columnCount - 1, 25))}50`;
      const values = await this._apiClient.getValues(this._spreadsheetId, range, 'FORMATTED_VALUE');

      if (!values || values.length === 0) {
        return {
          columns: [],
          preview: [],
          totalRows: 0,
        };
      }

      // Find the most data-rich area in the sheet by analyzing all rows
      const dataAnalysis = this._findMostSignificantDataRegion(values);

      // Guard against invalid dataAnalysis result
      if (!dataAnalysis || !(dataAnalysis as any).headers || !Array.isArray((dataAnalysis as any).headers)) {
        throw new Error('Invalid data analysis result');
      }

      // Generate columns based on the significant data region
      const columns = (dataAnalysis as any).headers.map((header: string, colIndex: number) => {
        const columnData = (dataAnalysis as any).dataRows
          .map((row: any) => row[colIndex])
          .filter((cell: any) => cell !== undefined && cell !== null && cell !== '');

        const dataType = this._inferDataType(columnData);
        const examples = columnData.slice(0, 3).map((cell: any) => String(cell));

        return {
          header: header || `column_${this._getColumnLetter(colIndex)}`,
          dataType,
          description: this._generateColumnDescription(header, dataType, examples),
          examples,
        };
      });

      return {
        columns,
        preview: values.slice(0, 5), // First 5 rows as preview
        totalRows: values.length,
      };
    } catch (error) {
      console.warn(`Could not analyze sheet data for ${sheetName}:`, error);
      return {
        columns: Array.from({ length: Math.min(columnCount, 8) }, (_, i) => ({
          header: `column_${this._getColumnLetter(i)}`,
          dataType: 'string',
          description: `Data from column ${this._getColumnLetter(i)}`,
          examples: [],
        })),
        preview: [],
        totalRows: 0,
      };
    }
  }

  /**
   * Get sheet headers and analyze data structure (first few rows for better context)
   */
  private async _getSheetHeaders(sheetName: string): Promise<string[]> {
    try {
      const quotedSheetName = this._quoteSheetName(sheetName);
      // Read first 5 rows to better understand data structure
      const range = `${quotedSheetName}!1:5`;
      const values = await this._apiClient.getValues(this._spreadsheetId, range, 'FORMATTED_VALUE');

      if (!values || values.length === 0) {
        return [];
      }

      // Return first row as headers, but the additional rows help with data analysis
      return values[0] || [];
    } catch (error) {
      console.warn(`Could not get headers for sheet ${sheetName}:`, error);
      return [];
    }
  }

  /**
   * Convert column index to letter (A, B, C, ..., AA, AB, etc.)
   */
  private _getColumnLetter(columnIndex: number): string {
    let result = '';
    let index = columnIndex;

    while (index >= 0) {
      result = String.fromCharCode(65 + (index % 26)) + result;
      index = Math.floor(index / 26) - 1;
    }

    return result;
  }

  /**
   * Sanitize column name for database compatibility
   */
  private _sanitizeColumnName(name: string): string {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/_+/g, '_')
        .substring(0, 63) || // PostgreSQL column name limit
      'column'
    );
  }

  /**
   * Sanitize table name for database compatibility
   */
  private _sanitizeTableName(name: string): string {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/_+/g, '_')
        .substring(0, 63) || // PostgreSQL table name limit
      'sheet'
    );
  }

  /**
   * Get range information from A1 notation
   */
  private _parseRange(range: string): {
    sheetName?: string;
    startColumn: number;
    endColumn: number;
    startRow: number;
    endRow: number;
  } {
    const sheetMatch = range.match(/^([^!]+)!/);
    const sheetName = sheetMatch ? sheetMatch[1] : undefined;
    const rangeWithoutSheet = sheetName ? range.substring(sheetName.length + 1) : range;

    // Simple range parsing - can be enhanced
    const match = rangeWithoutSheet.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);

    if (match) {
      return {
        sheetName,
        startColumn: this._columnLetterToIndex(match[1]),
        startRow: parseInt(match[2]),
        endColumn: this._columnLetterToIndex(match[3]),
        endRow: parseInt(match[4]),
      };
    }

    // Default to full sheet
    return {
      sheetName,
      startColumn: 0,
      endColumn: 25, // Column Z
      startRow: 1,
      endRow: 1000,
    };
  }

  /**
   * Convert column letter to index (A=0, B=1, etc.)
   */
  private _columnLetterToIndex(letter: string): number {
    let result = 0;

    for (let i = 0; i < letter.length; i++) {
      result = result * 26 + (letter.charCodeAt(i) - 64);
    }

    return result - 1;
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
   * Get spreadsheet info for debugging
   */
  async getSpreadsheetInfo(): Promise<{
    title: string;
    id: string;
    url: string;
    sheets: Array<{ name: string; id: number; rowCount: number; columnCount: number }>;
  }> {
    const spreadsheet = await this._getSpreadsheet();

    return {
      title: spreadsheet.properties?.title || 'Untitled Spreadsheet',
      id: this._spreadsheetId,
      url: spreadsheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${this._spreadsheetId}/edit`,
      sheets:
        spreadsheet.sheets?.map((sheet) => ({
          name: sheet.properties?.title || '',
          id: sheet.properties?.sheetId || 0,
          rowCount: sheet.properties?.gridProperties?.rowCount || 0,
          columnCount: sheet.properties?.gridProperties?.columnCount || 0,
        })) || [],
    };
  }

  /**
   * Infer data type from column data
   */
  private _inferDataType(columnData: any[]): string {
    if (columnData.length === 0) {
      return 'string';
    }

    const samples = columnData.slice(0, 10); // Analyze more samples for better accuracy
    let currencyCount = 0;
    let numberCount = 0;
    let dateCount = 0;
    let booleanCount = 0;

    for (const value of samples) {
      const strValue = String(value).trim();

      // Check if it's currency (highest priority)
      if (this._isLikelyCurrency(strValue)) {
        currencyCount++;
        continue;
      }

      // Check if it's a number
      if (!isNaN(Number(strValue)) && strValue !== '') {
        numberCount++;
      }

      // Check if it's a date
      if (this._isLikelyDate(strValue)) {
        dateCount++;
      }

      // Check if it's boolean
      if (['true', 'false', 'yes', 'no', '1', '0'].includes(strValue.toLowerCase())) {
        booleanCount++;
      }
    }

    const total = samples.length;

    // Currency takes priority
    if (currencyCount >= total * 0.5) {
      return 'currency';
    }

    if (numberCount === total) {
      return 'number';
    }

    if (dateCount >= total * 0.7) {
      return 'date';
    }

    if (booleanCount === total) {
      return 'boolean';
    }

    if (numberCount >= total * 0.7) {
      return 'number';
    }

    return 'string';
  }

  /**
   * Check if a string looks like currency
   */
  private _isLikelyCurrency(value: string): boolean {
    const currencyPatterns = [
      /^\$[\d,]+\.?\d*$/, // $31.51, $1,000, $100
      /^[\d,]+\.?\d*\$$/, // 31.51$, 1,000$
      /^€[\d,]+\.?\d*$/, // €100.50
      /^£[\d,]+\.?\d*$/, // £250.00
      /^¥[\d,]+\.?\d*$/, // ¥1000
      /^\(?\$[\d,]+\.?\d*\)?$/, // ($31.51) for negative amounts
    ];

    return currencyPatterns.some((pattern) => pattern.test(value.replace(/\s/g, '')));
  }

  /**
   * Check if a string looks like a date
   */
  private _isLikelyDate(value: string): boolean {
    const datePatterns = [
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // MM/dd/yyyy
      /^\d{4}-\d{2}-\d{2}$/, // yyyy-MM-dd
      /^\d{1,2}-\d{1,2}-\d{4}$/, // MM-dd-yyyy
      /^\d{2}\/\d{2}\/\d{2}$/, // MM/dd/yy
      /^\d{1,2}\/\d{1,2}$/, // M/d, MM/dd
    ];

    return datePatterns.some((pattern) => pattern.test(value)) || !isNaN(Date.parse(value));
  }

  /**
   * Generate column description based on header and data
   */
  private _generateColumnDescription(header: string, dataType: string, _examples: string[]): string {
    const lowerHeader = header.toLowerCase();

    // Common column patterns
    if (lowerHeader.includes('date') || lowerHeader.includes('time')) {
      return `Date/time information from column "${header}"`;
    }

    if (
      lowerHeader.includes('amount') ||
      lowerHeader.includes('price') ||
      lowerHeader.includes('cost') ||
      lowerHeader.includes('total')
    ) {
      return `Monetary amount from column "${header}"`;
    }

    if (lowerHeader.includes('name') || lowerHeader.includes('title')) {
      return `Name or title from column "${header}"`;
    }

    if (lowerHeader.includes('description') || lowerHeader.includes('desc')) {
      return `Description text from column "${header}"`;
    }

    if (lowerHeader.includes('category') || lowerHeader.includes('type')) {
      return `Category or type classification from column "${header}"`;
    }

    if (lowerHeader.includes('id') || lowerHeader.includes('number')) {
      return `Identifier or number from column "${header}"`;
    }

    // Default description
    return `Data from column "${header}" (${dataType})`;
  }

  /**
   * Find the most significant data region in the sheet
   * This intelligently detects where the actual tabular data is located
   */
  private _findMostSignificantDataRegion(values: any[][]): {
    headers: string[];
    dataRows: any[][];
    headerRowIndex: number;
    dataStartIndex: number;
  } {
    // Guard against invalid input
    if (!values || !Array.isArray(values) || values.length === 0) {
      return {
        headers: [],
        dataRows: [],
        headerRowIndex: 0,
        dataStartIndex: 1,
      };
    }

    let bestScore = 0;
    let bestRegion: {
      headers: string[];
      dataRows: any[][];
      headerRowIndex: number;
      dataStartIndex: number;
    } = {
      headers: [],
      dataRows: [],
      headerRowIndex: 0,
      dataStartIndex: 1,
    };

    // Analyze each row to find the best candidate for headers
    for (let rowIndex = 0; rowIndex < Math.min(values.length, 30); rowIndex++) {
      const row = values[rowIndex] || [];

      // Skip completely empty rows
      if (row.every((cell) => !cell || String(cell).trim() === '')) {
        continue;
      }

      // Score this row as a potential header row
      const score = this._scoreRowAsHeaders(row, values, rowIndex);

      if (score > bestScore) {
        bestScore = score;

        const dataStartIndex = rowIndex + 1;
        const dataRows = values.slice(dataStartIndex, Math.min(values.length, dataStartIndex + 20));

        bestRegion = {
          headers: row.map((cell: any) => String(cell || '').trim()),
          dataRows: dataRows.filter(
            (dataRow: any) => dataRow && dataRow.some((cell: any) => cell && String(cell).trim() !== ''),
          ),
          headerRowIndex: rowIndex,
          dataStartIndex,
        };
      }
    }

    // If no good header row found, use first non-empty row
    if (bestScore === 0) {
      for (let i = 0; i < values.length; i++) {
        const row = values[i] || [];

        if (row.some((cell) => cell && String(cell).trim() !== '')) {
          return {
            headers: row.map((_, index) => `column_${this._getColumnLetter(index)}`),
            dataRows: values
              .slice(i)
              .filter((dataRow) => dataRow && dataRow.some((cell) => cell && String(cell).trim() !== '')),
            headerRowIndex: i,
            dataStartIndex: i,
          };
        }
      }
    }

    return bestRegion;
  }

  /**
   * Score a row's likelihood of being a header row
   */
  private _scoreRowAsHeaders(row: any[], allValues: any[][], rowIndex: number): number {
    let score = 0;
    const rowString = row.map((cell) => String(cell || '').toLowerCase()).join(' ');

    // Positive indicators for headers
    const headerKeywords = [
      'date',
      'time',
      'name',
      'description',
      'category',
      'type',
      'amount',
      'price',
      'cost',
      'total',
      'quantity',
      'item',
      'product',
      'service',
      'notes',
      'comment',
      'status',
      'id',
      'number',
      'code',
      'email',
      'phone',
      'address',
      'location',
      'department',
    ];

    // Count header-like words
    headerKeywords.forEach((keyword) => {
      if (rowString.includes(keyword)) {
        score += 10;
      }
    });

    // Check if following rows contain data that matches this header pattern
    const nextFewRows = allValues.slice(rowIndex + 1, rowIndex + 6);
    let dataPatternScore = 0;

    row.forEach((header, colIndex) => {
      const headerStr = String(header || '').toLowerCase();
      const columnData = nextFewRows.map((r) => r?.[colIndex]).filter((cell) => cell && String(cell).trim() !== '');

      if (columnData.length > 0) {
        // Check for data type consistency
        if (headerStr.includes('amount') || headerStr.includes('price') || headerStr.includes('cost')) {
          const currencyCount = columnData.filter((cell) => this._isLikelyCurrency(String(cell))).length;
          dataPatternScore += (currencyCount / columnData.length) * 15;
        }

        if (headerStr.includes('date') || headerStr.includes('time')) {
          const dateCount = columnData.filter((cell) => this._isLikelyDate(String(cell))).length;
          dataPatternScore += (dateCount / columnData.length) * 10;
        }

        // General data consistency bonus
        dataPatternScore += columnData.length * 2;
      }
    });

    score += dataPatternScore;

    // Penalty for being too early (often metadata)
    if (rowIndex < 3) {
      score -= 5;
    }

    // Bonus for having consistent number of non-empty cells
    const nonEmptyCells = row.filter((cell) => cell && String(cell).trim() !== '').length;

    if (nonEmptyCells >= 3) {
      score += nonEmptyCells * 3;
    }

    return score;
  }

  /**
   * UNIVERSAL data type analysis - works with ANY data, no keywords needed
   */
  private _analyzeRowDataTypes(row: any[]): {
    dateColumns: number[];
    currencyColumns: number[];
    numberColumns: number[];
    textColumns: number[];
    emptyColumns: number[];
  } {
    const result = {
      dateColumns: [] as number[],
      currencyColumns: [] as number[],
      numberColumns: [] as number[],
      textColumns: [] as number[],
      emptyColumns: [] as number[],
    };

    // Guard against null/undefined row
    if (!row || !Array.isArray(row)) {
      return result;
    }

    row.forEach((cellValue, index) => {
      const cellStr = String(cellValue || '').trim();

      if (!cellStr) {
        result.emptyColumns.push(index);
      } else if (this._isLikelyCurrency(cellStr)) {
        result.currencyColumns.push(index);
      } else if (this._isLikelyDate(cellStr)) {
        result.dateColumns.push(index);
      } else if (!isNaN(Number(cellStr)) && cellStr !== '') {
        result.numberColumns.push(index);
      } else if (cellStr.length > 0) {
        result.textColumns.push(index);
      }
    });

    return result;
  }

  /**
   * Create semantic field mapping for universal document support
   */
  private _createSemanticFieldMapping(dataAnalysis: any): any {
    const mapping: any = {};

    // Guard against invalid data analysis
    if (
      !dataAnalysis ||
      !dataAnalysis.dataRows ||
      !Array.isArray(dataAnalysis.dataRows) ||
      dataAnalysis.dataRows.length === 0
    ) {
      return mapping;
    }

    // Analyze data patterns to find semantic fields universally
    if (dataAnalysis.dataRows && dataAnalysis.dataRows.length > 0) {
      // Use the same logic as readSheet to ensure consistency
      const sampleRow = dataAnalysis.dataRows[0] || [];
      const dataTypes = this._analyzeRowDataTypes(sampleRow);

      // Analyze patterns across all rows for better semantic detection
      const textCols = dataTypes.textColumns;
      const columnAnalysis = textCols
        .map((colIndex) => {
          const columnValues = dataAnalysis.dataRows
            .map((r: any[]) => String(r[colIndex] || '').trim())
            .filter((v: string) => v.length > 0);
          const avgLength =
            columnValues.reduce((sum: number, val: string) => sum + val.length, 0) / Math.max(columnValues.length, 1);
          const avgWords =
            columnValues.reduce((sum: number, val: string) => sum + val.split(/\s+/).length, 0) /
            Math.max(columnValues.length, 1);
          const uniqueValues = new Set(columnValues).size;
          const repeatRatio = columnValues.length > 0 ? uniqueValues / columnValues.length : 1;

          return {
            colIndex,
            avgLength,
            avgWords,
            repeatRatio,
            isCategorical: avgLength < 15 && avgWords <= 2 && repeatRatio < 0.8,
          };
        })
        .sort((a, b) => {
          if (a.isCategorical && !b.isCategorical) {
            return -1;
          }

          if (!a.isCategorical && b.isCategorical) {
            return 1;
          }

          return a.repeatRatio - b.repeatRatio;
        });

      // Map semantic fields to physical addresses
      if (dataTypes.dateColumns.length > 0) {
        const dateCol = dataTypes.dateColumns[0];
        mapping.date = {
          columnIndex: dateCol,
          columnLetter: this._getColumnLetter(dateCol),
          range: `${this._getColumnLetter(dateCol)}:${this._getColumnLetter(dateCol)}`,
          dataType: 'date',
        };
      }

      if (dataTypes.currencyColumns.length > 0) {
        const amountCol = dataTypes.currencyColumns[0];
        mapping.amount = {
          columnIndex: amountCol,
          columnLetter: this._getColumnLetter(amountCol),
          range: `${this._getColumnLetter(amountCol)}:${this._getColumnLetter(amountCol)}`,
          dataType: 'currency',
        };
        mapping.amount_numeric = mapping.amount; // Same physical location
      }

      if (columnAnalysis.length > 0) {
        // Most categorical column becomes category
        const categoryAnalysis = columnAnalysis.find((c) => c.isCategorical);

        if (categoryAnalysis) {
          mapping.category = {
            columnIndex: categoryAnalysis.colIndex,
            columnLetter: this._getColumnLetter(categoryAnalysis.colIndex),
            range: `${this._getColumnLetter(categoryAnalysis.colIndex)}:${this._getColumnLetter(categoryAnalysis.colIndex)}`,
            dataType: 'text',
          };
        }

        // Most descriptive column becomes description
        const descriptionAnalysis = columnAnalysis.find((c) => c.colIndex !== categoryAnalysis?.colIndex);

        if (descriptionAnalysis) {
          mapping.description = {
            columnIndex: descriptionAnalysis.colIndex,
            columnLetter: this._getColumnLetter(descriptionAnalysis.colIndex),
            range: `${this._getColumnLetter(descriptionAnalysis.colIndex)}:${this._getColumnLetter(descriptionAnalysis.colIndex)}`,
            dataType: 'text',
          };
        }

        // Additional text column becomes notes
        const notesAnalysis = columnAnalysis.find(
          (c) => c.colIndex !== categoryAnalysis?.colIndex && c.colIndex !== descriptionAnalysis?.colIndex,
        );

        if (notesAnalysis) {
          mapping.notes = {
            columnIndex: notesAnalysis.colIndex,
            columnLetter: this._getColumnLetter(notesAnalysis.colIndex),
            range: `${this._getColumnLetter(notesAnalysis.colIndex)}:${this._getColumnLetter(notesAnalysis.colIndex)}`,
            dataType: 'text',
          };
        }
      }
    }

    return mapping;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this._cachedSpreadsheet = null;
    this._cacheExpiry = 0;
  }

  /**
   * Get data preview for a sheet
   */
  async getDataPreview(sheetName?: string, maxRows = 10): Promise<any[]> {
    const range = sheetName ? `${sheetName}!A1:Z${maxRows}` : `A1:Z${maxRows}`;
    const values = await this._apiClient.getValues(this._spreadsheetId, range, 'FORMATTED_VALUE');

    return values.map((row, rowIndex) => ({
      row: rowIndex + 1,
      values: row,
    }));
  }
}
