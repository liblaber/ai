import { google, docs_v1, sheets_v4 } from 'googleapis';
import { GoogleWorkspaceAuthManager } from './auth-manager';
import { GoogleWorkspaceError, RATE_LIMITS, type GoogleDocsContent, type GoogleSheetsContent } from './types';

export class GoogleWorkspaceAPIClient {
  private _authManager: GoogleWorkspaceAuthManager;
  private _docsClient: docs_v1.Docs | null = null;
  private _sheetsClient: sheets_v4.Sheets | null = null;
  private _requestQueue: Array<() => Promise<any>> = [];
  private _isProcessingQueue = false;
  private _lastRequestTime = 0;
  private _requestCount = 0;
  private _dailyRequestCount = 0;
  private _dailyResetTime = 0;

  constructor(authManager: GoogleWorkspaceAuthManager) {
    this._authManager = authManager;
    this._resetDailyCountIfNeeded();
  }

  /**
   * Initialize API clients with authentication
   */
  async initialize(): Promise<void> {
    const authClient = await this._authManager.getAuthenticatedClient();

    this._docsClient = google.docs({ version: 'v1', auth: authClient });
    this._sheetsClient = google.sheets({ version: 'v4', auth: authClient });
  }

  /**
   * Get Google Docs API client
   */
  private async _getDocsClient(): Promise<docs_v1.Docs> {
    if (!this._docsClient) {
      await this.initialize();
    }

    if (!this._docsClient) {
      throw new GoogleWorkspaceError('Failed to initialize Google Docs client');
    }

    return this._docsClient;
  }

  /**
   * Get Google Sheets API client
   */
  private async _getSheetsClient(): Promise<sheets_v4.Sheets> {
    if (!this._sheetsClient) {
      await this.initialize();
    }

    if (!this._sheetsClient) {
      throw new GoogleWorkspaceError('Failed to initialize Google Sheets client');
    }

    return this._sheetsClient;
  }

  /**
   * Execute API request with rate limiting and error handling
   */
  private async _executeRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this._requestQueue.push(async () => {
        try {
          const result = await this._executeWithRetry(requestFn);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this._processQueue();
    });
  }

  /**
   * Process request queue with rate limiting
   */
  private async _processQueue(): Promise<void> {
    if (this._isProcessingQueue || this._requestQueue.length === 0) {
      return;
    }

    this._isProcessingQueue = true;

    while (this._requestQueue.length > 0) {
      // Check daily rate limit
      this._resetDailyCountIfNeeded();

      if (this._dailyRequestCount >= RATE_LIMITS.REQUESTS_PER_DAY) {
        throw new GoogleWorkspaceError('Daily API request limit exceeded', 'DAILY_RATE_LIMIT_EXCEEDED', 429);
      }

      // Check per-minute rate limit
      const now = Date.now();

      if (this._requestCount >= RATE_LIMITS.REQUESTS_PER_MINUTE) {
        const waitTime = 60000 - (now - this._lastRequestTime);

        if (waitTime > 0) {
          await this._sleep(waitTime);
          this._requestCount = 0;
          this._lastRequestTime = Date.now();
        }
      }

      // Execute next request
      const request = this._requestQueue.shift()!;
      await request();

      this._requestCount++;
      this._dailyRequestCount++;
      this._lastRequestTime = now;

      // Small delay between requests
      await this._sleep(100);
    }

    this._isProcessingQueue = false;
  }

  /**
   * Execute request with exponential backoff retry
   */
  private async _executeWithRetry<T>(requestFn: () => Promise<T>, retryCount = 0): Promise<T> {
    try {
      return await requestFn();
    } catch (error: any) {
      // Check if error is retryable
      if (this._isRetryableError(error) && retryCount < RATE_LIMITS.MAX_RETRIES) {
        const delay = Math.min(
          RATE_LIMITS.BACKOFF_INITIAL_DELAY * Math.pow(2, retryCount),
          RATE_LIMITS.BACKOFF_MAX_DELAY,
        );

        console.warn(`Request failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${RATE_LIMITS.MAX_RETRIES})`);
        await this._sleep(delay);

        return this._executeWithRetry(requestFn, retryCount + 1);
      }

      // Transform error to our custom error type
      throw this._transformError(error);
    }
  }

  /**
   * Check if error is retryable
   */
  private _isRetryableError(error: any): boolean {
    const retryableStatusCodes = [429, 500, 502, 503, 504];
    return retryableStatusCodes.includes(error.status || error.code);
  }

  /**
   * Transform API errors to our custom error type
   */
  private _transformError(error: any): GoogleWorkspaceError {
    const message = error.message || 'Unknown API error';
    const code = error.code || error.status || 'UNKNOWN_ERROR';
    const status = error.status || error.code || 500;

    return new GoogleWorkspaceError(message, code, status, error.details);
  }

  /**
   * Reset daily request count if needed
   */
  private _resetDailyCountIfNeeded(): void {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (now - this._dailyResetTime >= oneDayMs) {
      this._dailyRequestCount = 0;
      this._dailyResetTime = now;
    }
  }

  /**
   * Sleep utility function
   */
  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Google Docs API methods

  /**
   * Get document content
   */
  async getDocument(documentId: string): Promise<GoogleDocsContent> {
    const docsClient = await this._getDocsClient();

    return this._executeRequest(async () => {
      const response = await docsClient.documents.get({ documentId });
      return response.data as GoogleDocsContent;
    });
  }

  /**
   * Search text in document
   */
  async searchText(documentId: string, searchTerm: string): Promise<any[]> {
    const document = await this.getDocument(documentId);
    const results: any[] = [];

    // Simple text search implementation
    // In production, you might want to use more sophisticated search
    const searchInContent = (content: any[], term: string) => {
      content.forEach((element, index) => {
        if (element.paragraph?.elements) {
          element.paragraph.elements.forEach((elem: any) => {
            if (elem.textRun?.content?.toLowerCase().includes(term.toLowerCase())) {
              results.push({
                elementIndex: index,
                content: elem.textRun.content,
                type: 'paragraph',
              });
            }
          });
        }
      });
    };

    if (document.body?.content) {
      searchInContent(document.body.content, searchTerm);
    }

    return results;
  }

  // Google Sheets API methods

  /**
   * Get spreadsheet metadata
   */
  async getSpreadsheet(spreadsheetId: string, includeGridData = false): Promise<GoogleSheetsContent> {
    const sheetsClient = await this._getSheetsClient();

    return this._executeRequest(async () => {
      const response = await sheetsClient.spreadsheets.get({
        spreadsheetId,
        includeGridData,
      });
      return response.data as GoogleSheetsContent;
    });
  }

  /**
   * Get values from a range
   */
  async getValues(
    spreadsheetId: string,
    range: string,
    valueRenderOption: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA' = 'FORMATTED_VALUE',
  ): Promise<any[][]> {
    const sheetsClient = await this._getSheetsClient();

    return this._executeRequest(async () => {
      console.log(`Google Sheets API: Getting values for range: ${range}`);

      const response = await sheetsClient.spreadsheets.values.get({
        spreadsheetId,
        range,
        valueRenderOption,
      });

      console.log(`Google Sheets API: Raw response:`, {
        range: response.data.range,
        majorDimension: response.data.majorDimension,
        values: response.data.values ? `${response.data.values.length} rows` : 'no values',
        firstRow: response.data.values?.[0],
        sampleRows: response.data.values?.slice(0, 5),
        rowsAroundExpectedData: response.data.values?.slice(15, 25), // Check rows 16-25 where expense data should be
        fullDataSample: response.data.values?.map((row, i) => `Row ${i + 1}: [${row.join(', ')}]`).slice(0, 35),
      });

      return response.data.values || [];
    });
  }

  /**
   * Get multiple ranges at once
   */
  async batchGetValues(
    spreadsheetId: string,
    ranges: string[],
    valueRenderOption: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA' = 'FORMATTED_VALUE',
  ): Promise<{ [range: string]: any[][] }> {
    const sheetsClient = await this._getSheetsClient();

    return this._executeRequest(async () => {
      const response = await sheetsClient.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges,
        valueRenderOption,
      });

      const result: { [range: string]: any[][] } = {};
      response.data.valueRanges?.forEach((valueRange: any, index: number) => {
        const range = ranges[index];
        result[range] = valueRange.values || [];
      });

      return result;
    });
  }

  /**
   * Get sheet names and properties
   */
  async getSheetInfo(spreadsheetId: string): Promise<Array<{ name: string; id: number; index: number }>> {
    const spreadsheet = await this.getSpreadsheet(spreadsheetId);

    return (
      spreadsheet.sheets?.map((sheet) => ({
        name: sheet.properties?.title || '',
        id: sheet.properties?.sheetId || 0,
        index: sheet.properties?.index || 0,
      })) || []
    );
  }

  // Utility methods

  /**
   * Test API connectivity
   */
  async testConnection(serviceType: 'docs' | 'sheets', documentId: string): Promise<boolean> {
    try {
      if (serviceType === 'docs') {
        await this.getDocument(documentId);
      } else {
        await this.getSpreadsheet(documentId);
      }

      return true;
    } catch (error) {
      console.error(`Connection test failed for ${serviceType}:`, error);
      return false;
    }
  }

  /**
   * Get request statistics
   */
  getRequestStats(): {
    requestCount: number;
    dailyRequestCount: number;
    queueLength: number;
    dailyLimitRemaining: number;
  } {
    return {
      requestCount: this._requestCount,
      dailyRequestCount: this._dailyRequestCount,
      queueLength: this._requestQueue.length,
      dailyLimitRemaining: RATE_LIMITS.REQUESTS_PER_DAY - this._dailyRequestCount,
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    // Wait for pending requests to complete
    while (this._requestQueue.length > 0 || this._isProcessingQueue) {
      await this._sleep(100);
    }

    this._docsClient = null;
    this._sheetsClient = null;
    this._requestQueue = [];
  }
}
