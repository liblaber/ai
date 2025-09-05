// Authentication configuration types
export interface GoogleWorkspaceConfig {
  type: 'oauth2' | 'service-account' | 'api-key';
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  serviceAccountPath?: string;
  apiKey?: string;
  scopes: string[];
  credentials?: GoogleCredentials;
}

export interface GoogleCredentials {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  token_type?: string;
  scope?: string;
}

// Connection string parsing types
export interface GoogleConnectionInfo {
  type: 'docs' | 'sheets';
  documentId: string;
  auth: {
    type: 'oauth2' | 'service-account' | 'api-key';
    clientId?: string;
    scope?: string;
    accessToken?: string;
    refreshToken?: string;
  };
}

// Google API response types
export interface GoogleDocsContent {
  documentId: string;
  title: string;
  body: {
    content: any[];
  };
  revisionId: string;
  documentStyle?: any;
  namedStyles?: any;
  lists?: any;
  footnotes?: any;
  headers?: any;
  footers?: any;
  inlineObjects?: any;
  suggestedDocumentStyleChanges?: any;
  suggestedNamedStylesChanges?: any;
}

export interface GoogleSheetsContent {
  spreadsheetId: string;
  properties: {
    title: string;
    locale: string;
    autoRecalc: string;
    timeZone: string;
    defaultFormat: any;
  };
  sheets: GoogleSheetTab[];
  namedRanges?: any[];
  spreadsheetUrl: string;
  developerMetadata?: any[];
}

export interface GoogleSheetTab {
  properties: {
    sheetId: number;
    title: string;
    index: number;
    sheetType: string;
    gridProperties: {
      rowCount: number;
      columnCount: number;
    };
  };
  data?: GoogleSheetData[];
}

export interface GoogleSheetData {
  startRow?: number;
  startColumn?: number;
  rowData?: GoogleSheetRow[];
}

export interface GoogleSheetRow {
  values?: GoogleSheetCell[];
}

export interface GoogleSheetCell {
  userEnteredValue?: {
    stringValue?: string;
    numberValue?: number;
    boolValue?: boolean;
    formulaValue?: string;
  };
  effectiveValue?: {
    stringValue?: string;
    numberValue?: number;
    boolValue?: boolean;
  };
  formattedValue?: string;
  userEnteredFormat?: any;
  effectiveFormat?: any;
}

// Query operation types
export interface GoogleDocsQuery {
  operation:
    | GoogleWorkspaceOperation.READ_DOCUMENT
    | GoogleWorkspaceOperation.SEARCH_TEXT
    | GoogleWorkspaceOperation.GET_DOCUMENT_STRUCTURE;
  documentId: string;
  parameters?: {
    searchTerm?: string;
    includeHeaders?: boolean;
    includeTables?: boolean;
    maxResults?: number;
  };
}

export interface GoogleSheetsQuery {
  operation:
    | GoogleWorkspaceOperation.READ_RANGE
    | GoogleWorkspaceOperation.READ_SHEET
    | GoogleWorkspaceOperation.GET_ALL_SHEETS
    | GoogleWorkspaceOperation.GET_VALUES;
  spreadsheetId: string;
  parameters?: {
    range?: string;
    sheetName?: string;
    majorDimension?: 'ROWS' | 'COLUMNS';
    valueRenderOption?: ValueRenderOption;
    dateTimeRenderOption?: 'SERIAL_NUMBER' | 'FORMATTED_STRING';
  };
}

// Schema generation types for BaseAccessor compatibility
export interface GoogleWorkspaceTable {
  tableName: string;
  columns: GoogleWorkspaceColumn[];
  metadata?: {
    documentType: 'docs' | 'sheets';
    documentId: string;
    lastModified?: string;
    owner?: string;
    url?: string;
    actualSheetName?: string;
    columnMapping?: unknown[];
    semanticFieldMapping?: unknown;
    physicalRange?: string;
    dataStartRow?: number;
    dataPreview?: unknown[];
    totalRows?: number;
  };
}

export interface GoogleWorkspaceColumn {
  name: string;
  type: string;
  isPrimary: boolean;
  description?: string;
  enumValues?: string[];
}

// Error types
export class GoogleWorkspaceError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
    public details?: any,
  ) {
    super(message);
    this.name = 'GoogleWorkspaceError';
  }
}

export class GoogleAuthError extends Error {
  constructor(
    message: string,
    public code?: string,
    public authUrl?: string,
  ) {
    super(message);
    this.name = 'GoogleAuthError';
  }
}

// Constants
export const GOOGLE_WORKSPACE_SCOPES = {
  DOCS: {
    READONLY: 'https://www.googleapis.com/auth/documents.readonly',
    FULL: 'https://www.googleapis.com/auth/documents',
  },
  SHEETS: {
    READONLY: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    FULL: 'https://www.googleapis.com/auth/spreadsheets',
  },
} as const;

// Enums for better type safety
export enum ValueRenderOption {
  FORMATTED_VALUE = 'FORMATTED_VALUE',
  UNFORMATTED_VALUE = 'UNFORMATTED_VALUE',
  FORMULA = 'FORMULA',
}

export enum GoogleWorkspaceOperation {
  READ_DOCUMENT = 'readDocument',
  SEARCH_TEXT = 'searchText',
  GET_DOCUMENT_STRUCTURE = 'getDocumentStructure',
  READ_RANGE = 'readRange',
  READ_SHEET = 'readSheet',
  GET_ALL_SHEETS = 'getAllSheets',
  GET_VALUES = 'getValues',
}

export const GOOGLE_API_ENDPOINTS = {
  DOCS: 'https://docs.googleapis.com/v1',
  SHEETS: 'https://sheets.googleapis.com/v4',
} as const;

// Rate limiting configuration
export const RATE_LIMITS = {
  REQUESTS_PER_MINUTE: 100,
  REQUESTS_PER_DAY: 10000,
  BACKOFF_INITIAL_DELAY: 1000,
  BACKOFF_MAX_DELAY: 32000,
  MAX_RETRIES: 3,
} as const;
