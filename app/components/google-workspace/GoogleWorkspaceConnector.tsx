'use client';

import { useState, useEffect } from 'react';
import { Button } from '~/components/ui/Button';
import { Label } from '~/components/ui/Label';
import { Input } from '~/components/ui/Input';
import { CheckCircle, ExternalLink, FileText, Table, AlertCircle } from 'lucide-react';
import { GoogleDocumentPicker } from './GoogleDocumentPicker';
import { GoogleSpreadsheetPicker } from './GoogleSpreadsheetPicker';

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

interface GoogleWorkspaceConnectorProps {
  type: GoogleWorkspaceType;
  onConnection: (connection: GoogleWorkspaceConnection) => Promise<void>;
  onError: (error: string) => void;
  isConnecting?: boolean;
  isSuccess?: boolean;
}

export function GoogleWorkspaceConnector({
  type,
  onConnection,
  onError,
  isConnecting = false,
  isSuccess = false,
}: GoogleWorkspaceConnectorProps) {
  const [connectionName, setConnectionName] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [appsScriptUrl, setAppsScriptUrl] = useState('');
  const [connectionMethod, setConnectionMethod] = useState<'oauth' | 'public'>('public');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authTokens, setAuthTokens] = useState<{
    access_token: string;
    refresh_token: string;
  } | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<{
    id: string;
    title: string;
    url: string;
  } | null>(null);
  const [parsedDocument, setParsedDocument] = useState<{
    id: string;
    title: string;
    url: string;
  } | null>(null);
  const [parsedAppsScript, setParsedAppsScript] = useState<{
    id: string;
    title: string;
    url: string;
  } | null>(null);
  const [hasOAuthConfig, setHasOAuthConfig] = useState(false);
  const [pendingAuthCheck, setPendingAuthCheck] = useState(false);

  // Check if OAuth is configured
  useEffect(() => {
    checkOAuthConfig();
    checkAuthStatus();
  }, []);

  // Add focus listener for post-OAuth auth checking
  useEffect(() => {
    const handleWindowFocus = () => {
      if (pendingAuthCheck) {
        setPendingAuthCheck(false);
        setTimeout(() => {
          checkAuthStatus();
        }, 500);
      }
    };

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [pendingAuthCheck]);

  const checkOAuthConfig = async () => {
    try {
      // Check if OAuth environment variables are available by calling the API
      const response = await fetch('/api/auth/google-workspace/config', {
        method: 'GET',
      });

      if (response.ok) {
        const data = (await response.json()) as { configured: boolean };
        setHasOAuthConfig(data.configured);

        // If OAuth is configured, default to oauth method, otherwise stay with public
        if (data.configured) {
          setConnectionMethod('oauth');
        }
      } else {
        setHasOAuthConfig(false);
        setConnectionMethod('public');
      }
    } catch {
      setHasOAuthConfig(false);
      setConnectionMethod('public');
    }
  };

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/google-workspace/status', {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const data = (await response.json()) as {
        authenticated?: boolean;
        tokens?: { access_token: string; refresh_token: string };
      };

      if (data.authenticated && data.tokens) {
        setIsAuthenticated(true);
        setAuthTokens(data.tokens);
        setConnectionMethod('oauth');
      } else {
        setIsAuthenticated(false);
        setAuthTokens(null);
      }
    } catch {
      setIsAuthenticated(false);
      setAuthTokens(null);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const response = await fetch('/api/auth/google-workspace/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          scopes:
            type === 'docs'
              ? ['https://www.googleapis.com/auth/documents']
              : ['https://www.googleapis.com/auth/spreadsheets'],
        }),
      });

      const data = (await response.json()) as { authUrl?: string; success?: boolean; error?: string };

      if (data.authUrl) {
        // Set up message handler and cleanup BEFORE opening popup
        const cleanup = () => {
          if (pollTimer) {
            clearInterval(pollTimer);
          }

          window.removeEventListener('message', messageHandler);
        };

        const messageHandler = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) {
            return;
          }

          if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
            setIsAuthenticated(true);
            setAuthTokens(event.data.tokens);
            setPendingAuthCheck(false);
            popup?.close();
            cleanup();
          } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
            onError(event.data.error);
            popup?.close();
            cleanup();
          }
        };

        // Add message listener BEFORE opening popup
        window.addEventListener('message', messageHandler);

        const popup = window.open(data.authUrl, 'google-auth', 'width=500,height=600,scrollbars=yes,resizable=yes');

        if (!popup) {
          onError('Popup was blocked. Please allow popups for this site.');
          cleanup();

          return;
        }

        const pollTimer = setInterval(() => {
          try {
            if (popup?.closed) {
              clearInterval(pollTimer);
              setPendingAuthCheck(true);
            }
          } catch {
            // Cross-origin error when popup is on different domain
          }
        }, 1000);

        // Cleanup on timeout (in case something goes wrong)
        setTimeout(
          () => {
            if (!popup?.closed) {
              popup?.close();
            }

            cleanup();
          },
          5 * 60 * 1000,
        ); // 5 minutes timeout
      }
    } catch {
      onError('Failed to start Google authentication');
    }
  };

  const extractAppsScriptInfo = (url: string) => {
    try {
      const pattern = /\/macros\/s\/([a-zA-Z0-9-_]+)/;
      const match = url.match(pattern);

      if (match) {
        const scriptId = match[1];
        return {
          id: scriptId,
          title: `Apps Script Web App (${scriptId.substring(0, 8)}...)`,
          url: url.split('?')[0], // Clean URL
        };
      }

      throw new Error('Invalid Google Apps Script Web App URL format');
    } catch (_error) {
      throw new Error(_error instanceof Error ? _error.message : 'Invalid Apps Script URL format');
    }
  };

  const extractDocumentInfo = (url: string) => {
    try {
      // Handle different Google Sheets URL formats:
      // - https://docs.google.com/spreadsheets/d/SHEET_ID/edit...
      // - https://docs.google.com/spreadsheets/d/SHEET_ID/
      // - https://docs.google.com/document/d/DOC_ID/edit...

      const patterns = [
        // Google Sheets patterns
        /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
        // Google Docs patterns
        /\/document\/d\/([a-zA-Z0-9-_]+)/,
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);

        if (match) {
          const documentId = match[1];

          // Validate document type matches expected type
          const isSheetUrl = url.includes('/spreadsheets/');
          const isDocUrl = url.includes('/document/');

          if ((type === 'sheets' && !isSheetUrl) || (type === 'docs' && !isDocUrl)) {
            throw new Error(`URL must be a Google ${type === 'sheets' ? 'Sheets' : 'Docs'} URL`);
          }

          // Extract title from URL if possible, or generate a default
          let title = '';

          // Generate a default title
          title = `${type === 'sheets' ? 'Spreadsheet' : 'Document'} (${documentId.substring(0, 8)}...)`;

          return {
            id: documentId,
            title,
            url: url.split('?')[0] + (url.includes('?') ? '' : ''), // Clean URL
          };
        }
      }

      throw new Error('Invalid Google Sheets/Docs URL format');
    } catch (_error) {
      throw new Error(_error instanceof Error ? _error.message : 'Invalid URL format');
    }
  };

  const handleUrlChange = (value: string) => {
    setDocumentUrl(value);
    setParsedDocument(null);

    if (value.trim()) {
      try {
        const docInfo = extractDocumentInfo(value.trim());
        setParsedDocument(docInfo);

        // Auto-fill connection name if empty
        if (!connectionName) {
          setConnectionName(docInfo.title);
        }
      } catch {
        // Don't show error immediately while typing
      }
    }
  };

  const handleAppsScriptUrlChange = (value: string) => {
    setAppsScriptUrl(value);
    setParsedAppsScript(null);

    if (value.trim()) {
      try {
        const scriptInfo = extractAppsScriptInfo(value.trim());
        setParsedAppsScript(scriptInfo);
      } catch {
        // Don't show error immediately while typing
      }
    }
  };

  const validateAndParseUrl = () => {
    if (!documentUrl.trim()) {
      onError('Please enter a Google Sheets URL');
      return false;
    }

    try {
      const docInfo = extractDocumentInfo(documentUrl.trim());
      setParsedDocument(docInfo);

      return true;
    } catch (_error) {
      onError(_error instanceof Error ? _error.message : 'Invalid URL format');
      return false;
    }
  };

  const handleConnect = async () => {
    if (hasOAuthConfig && connectionMethod === 'oauth') {
      // OAuth flow - use selected document from picker
      if (!selectedDocument) {
        onError('Please select a document from your Google account');
        return;
      }

      if (!connectionName.trim()) {
        onError('Please provide a connection name');
        return;
      }

      if (!authTokens) {
        onError('Authentication tokens not available');
        return;
      }

      const connection: GoogleWorkspaceConnection = {
        type,
        documentId: selectedDocument.id,
        title: connectionName.trim(),
        url: selectedDocument.url,
        accessToken: authTokens.access_token,
        refreshToken: authTokens.refresh_token,
      };

      await onConnection(connection);
    } else {
      // Sharable URL flow
      if (!validateAndParseUrl() || !parsedDocument) {
        return;
      }

      if (!connectionName.trim()) {
        onError('Please provide a connection name');
        return;
      }

      const connection: GoogleWorkspaceConnection = {
        type,
        documentId: parsedDocument.id,
        title: connectionName.trim(),
        url: parsedDocument.url,
        appsScriptUrl: parsedAppsScript?.url,
        // If we have OAuth tokens, include them for fallback editing
        ...(authTokens && {
          accessToken: authTokens.access_token,
          refreshToken: authTokens.refresh_token,
        }),
      };

      await onConnection(connection);
    }
  };

  const handleDocumentSelect = (document: { id: string; title: string; url: string }) => {
    setSelectedDocument(document);

    if (!connectionName) {
      setConnectionName(document.title);
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Method Selection - Only show if OAuth is available */}
      {hasOAuthConfig && (
        <div>
          <Label className="mb-3 block text-gray-300">Connection Method</Label>
          <div className="flex gap-4 mb-4">
            <button
              type="button"
              onClick={() => setConnectionMethod('oauth')}
              className={`flex-1 p-3 rounded-lg border transition-colors ${
                connectionMethod === 'oauth'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                  : 'border-gray-600 hover:border-gray-500 text-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-lg font-medium mb-1">🔐 Google OAuth</div>
                <div className="text-sm opacity-80">Connect with your Google account</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setConnectionMethod('public')}
              className={`flex-1 p-3 rounded-lg border transition-colors ${
                connectionMethod === 'public'
                  ? 'border-green-500 bg-green-500/10 text-green-400'
                  : 'border-gray-600 hover:border-gray-500 text-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-lg font-medium mb-1">🌐 Sharable URL</div>
                <div className="text-sm opacity-80">Use sharable accessible document</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* OAuth Flow - Only show if OAuth is configured */}
      {hasOAuthConfig && connectionMethod === 'oauth' && (
        <div>
          {!isAuthenticated ? (
            <div>
              <Label className="mb-3 block text-gray-300">Step 1: Authenticate with Google</Label>

              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="text-blue-400 text-2xl">🔐</div>
                  <div>
                    <h3 className="font-medium text-blue-400 mb-2">OAuth Authentication</h3>
                    <p className="text-sm text-blue-300 mb-3">
                      Connect with your Google account to access your {type === 'docs' ? 'documents' : 'spreadsheets'}{' '}
                      directly. This provides the most reliable access for both reading and writing.
                    </p>
                    <Button
                      onClick={handleGoogleAuth}
                      variant="outline"
                      className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Sign in with Google
                      </div>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <Label className="mb-3 block text-gray-300">
                Step 2: Select {type === 'docs' ? 'Document' : 'Spreadsheet'}
              </Label>

              <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">✅ Authenticated with Google</span>
                </div>
              </div>

              {authTokens &&
                (type === 'docs' ? (
                  <GoogleDocumentPicker
                    accessToken={authTokens.access_token}
                    onSelect={handleDocumentSelect}
                    onError={onError}
                  />
                ) : (
                  <GoogleSpreadsheetPicker
                    accessToken={authTokens.access_token}
                    onSelect={handleDocumentSelect}
                    onError={onError}
                  />
                ))}
            </div>
          )}
        </div>
      )}

      {/* Sharable URL Flow - Always available, but only when OAuth is not configured OR when public method is selected */}
      {(!hasOAuthConfig || connectionMethod === 'public') && (
        <div>
          <Label className="mb-3 block text-gray-300">
            {hasOAuthConfig ? 'Step 1: ' : ''}Enter Google {type === 'docs' ? 'Docs' : 'Sheets'} URL (for reading data)
          </Label>

          <Input
            value={documentUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder={`https://docs.google.com/${type === 'docs' ? 'document' : 'spreadsheets'}/d/YOUR_${type.toUpperCase()}_ID/edit`}
            className="mb-3"
          />

          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-300">
                <p className="font-medium mb-1">Document Permissions</p>
                <p>
                  For <strong>reading only</strong>: Set to "Anyone with the link can view"
                  <br />
                  For <strong>editing</strong>: Set to "Anyone with the link can edit"
                </p>
                {type === 'sheets' && (
                  <p className="mt-2 text-xs">
                    💡 <strong>Tip:</strong> For full editing capabilities, consider setting up a Google Apps Script Web
                    App (see documentation)
                  </p>
                )}
              </div>
            </div>
          </div>

          {parsedDocument && (
            <div className="mt-3 bg-green-900/20 border border-green-700/50 rounded-lg p-3">
              <div className="flex items-start gap-3">
                {type === 'docs' ? (
                  <FileText className="w-5 h-5 text-green-400 mt-0.5" />
                ) : (
                  <Table className="w-5 h-5 text-green-400 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-green-400">{parsedDocument.title}</h3>
                  <p className="text-sm text-green-300 mt-1">Document ID: {parsedDocument.id}</p>
                  <a
                    href={parsedDocument.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-green-400 hover:text-green-300 mt-2"
                  >
                    Open in Google {type === 'docs' ? 'Docs' : 'Sheets'}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Apps Script URL (only for sheets and only if document is parsed) */}
          {type === 'sheets' && parsedDocument && (
            <div>
              <Label className="mb-3 block text-gray-300">
                Step 2: Apps Script Web App URL (for reliable data writing) - Optional
              </Label>

              <Input
                value={appsScriptUrl}
                onChange={(e) => handleAppsScriptUrlChange(e.target.value)}
                placeholder="https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
                className="mb-3"
              />

              <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-300">
                    <p className="font-medium mb-1">For Reliable Writing</p>
                    <p>
                      Add your Apps Script Web App URL for guaranteed data writing. Without this, we'll try to use OAuth
                      tokens{authTokens ? ' (available)' : ' (not available)'} for editing.
                    </p>
                    <p className="mt-2 text-xs">
                      📋 <strong>Setup Guide:</strong> See documentation for 5-minute Google Apps Script setup
                    </p>
                  </div>
                </div>
              </div>

              {parsedAppsScript && (
                <div className="mt-3 bg-purple-900/20 border border-purple-700/50 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0">⚡</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-purple-400">{parsedAppsScript.title}</h3>
                      <p className="text-sm text-purple-300 mt-1">Script ID: {parsedAppsScript.id}</p>
                      <a
                        href={parsedAppsScript.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 mt-2"
                      >
                        Test Apps Script
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Connection Details */}
      {((hasOAuthConfig && connectionMethod === 'oauth' && selectedDocument) ||
        ((!hasOAuthConfig || connectionMethod === 'public') && parsedDocument)) && (
        <div>
          <Label className="mb-3 block text-gray-300">Step 3: Connection Name</Label>
          <Input
            value={connectionName}
            onChange={(e) => setConnectionName(e.target.value)}
            placeholder={`e.g. ${parsedDocument?.title || selectedDocument?.title || 'My Connection'}`}
            className="mb-4"
          />

          <Button
            onClick={handleConnect}
            disabled={
              !connectionName.trim() ||
              isConnecting ||
              isSuccess ||
              (hasOAuthConfig && connectionMethod === 'oauth' && !selectedDocument) ||
              ((!hasOAuthConfig || connectionMethod === 'public') && !parsedDocument)
            }
            variant="primary"
            className={`w-full transition-all duration-300 ${isSuccess ? 'bg-green-500 hover:bg-green-500 !disabled:opacity-100' : ''}`}
          >
            {isSuccess ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Data Source Connected
              </div>
            ) : isConnecting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Connecting...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Connect {type === 'docs' ? 'Document' : 'Spreadsheet'}
              </div>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
