/**
 * Shared types for Google Workspace integration
 * Used by data source connection forms
 */

export type GoogleWorkspaceType = 'docs' | 'sheets';

export interface GoogleWorkspaceConnection {
  type: GoogleWorkspaceType;
  documentId: string;
  title: string;
  url: string;
  accessToken?: string;
  refreshToken?: string;
  appsScriptUrl?: string; // Optional Apps Script Web App URL for writing
}
