'use client';

import { useState, useEffect } from 'react';
import { Button } from '~/components/ui/Button';
import { Label } from '~/components/ui/Label';
import { Input } from '~/components/ui/Input';
import { CheckCircle, ExternalLink, FileText, Table } from 'lucide-react';
import { GoogleDocumentPicker } from './GoogleDocumentPicker';
import { GoogleSpreadsheetPicker } from './GoogleSpreadsheetPicker';

export type GoogleWorkspaceType = 'docs' | 'sheets';

export interface GoogleWorkspaceConnection {
  type: GoogleWorkspaceType;
  documentId: string;
  title: string;
  url: string;
  accessToken: string;
  refreshToken: string;
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

  // Check if user is already authenticated
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/google-workspace/status');
      const data = (await response.json()) as {
        authenticated?: boolean;
        tokens?: { access_token: string; refresh_token: string };
      };

      if (data.authenticated && data.tokens) {
        setIsAuthenticated(true);
        setAuthTokens(data.tokens);
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      // Start OAuth flow
      const response = await fetch('/api/auth/google-workspace/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          scopes:
            type === 'docs'
              ? ['https://www.googleapis.com/auth/documents.readonly']
              : ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        }),
      });

      const data = (await response.json()) as { authUrl?: string };

      if (data.authUrl) {
        // Open OAuth popup
        const popup = window.open(data.authUrl, 'google-auth', 'width=500,height=600,scrollbars=yes,resizable=yes');

        // Listen for auth completion
        const pollTimer = setInterval(() => {
          try {
            if (popup?.closed) {
              clearInterval(pollTimer);
              checkAuthStatus();
            }
          } catch {
            // Cross-origin error when popup is on different domain
          }
        }, 1000);

        // Listen for message from popup
        const messageHandler = (event: MessageEvent) => {
          if (event.origin !== window.location.origin) {
            return;
          }

          if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
            setIsAuthenticated(true);
            setAuthTokens(event.data.tokens);
            popup?.close();
            clearInterval(pollTimer);
            window.removeEventListener('message', messageHandler);
          } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
            onError(event.data.error);
            popup?.close();
            clearInterval(pollTimer);
            window.removeEventListener('message', messageHandler);
          }
        };

        window.addEventListener('message', messageHandler);
      } else {
        onError('Failed to initialize Google authentication');
      }
    } catch {
      onError('Failed to start Google authentication');
    }
  };

  const handleDocumentSelect = (document: { id: string; title: string; url: string }) => {
    setSelectedDocument(document);

    if (!connectionName) {
      setConnectionName(document.title);
    }
  };

  const handleConnect = async () => {
    if (!selectedDocument || !authTokens || !connectionName) {
      onError('Please select a document and provide a connection name');
      return;
    }

    const connection: GoogleWorkspaceConnection = {
      type,
      documentId: selectedDocument.id,
      title: selectedDocument.title,
      url: selectedDocument.url,
      accessToken: authTokens.access_token,
      refreshToken: authTokens.refresh_token,
    };

    await onConnection(connection);
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Authenticate with Google */}
      <div>
        <Label className="mb-3 block text-gray-300">
          Step 1: Connect to Google {type === 'docs' ? 'Docs' : 'Sheets'}
        </Label>

        {!isAuthenticated ? (
          <Button
            onClick={handleGoogleAuth}
            className="flex items-center gap-2 bg-white text-gray-900 hover:bg-gray-100"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Connect with Google
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span>Connected to Google</span>
            </div>
            <Button
              onClick={() => {
                setIsAuthenticated(false);
                setAuthTokens(null);
                setSelectedDocument(null);
                setConnectionName('');
                // Clear any stored tokens
                void fetch('/api/auth/google-workspace/logout', { method: 'POST' });
              }}
              variant="outline"
              size="sm"
            >
              Re-authorize
            </Button>
          </div>
        )}

        <p className="text-sm text-gray-400 mt-2">
          {!isAuthenticated
            ? `You'll be redirected to Google to authorize access to your ${type === 'docs' ? 'documents' : 'spreadsheets'}.`
            : 'Click Re-authorize if you encounter permission errors.'}
        </p>
      </div>

      {/* Step 2: Document Selection */}
      {isAuthenticated && authTokens && (
        <div>
          <Label className="mb-3 block text-gray-300">
            Step 2: Select {type === 'docs' ? 'Document' : 'Spreadsheet'}
          </Label>

          {type === 'docs' ? (
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
          )}
        </div>
      )}

      {/* Step 3: Connection Details */}
      {selectedDocument && (
        <div>
          <Label className="mb-3 block text-gray-300">Connection Name</Label>
          <Input
            value={connectionName}
            onChange={(e) => setConnectionName(e.target.value)}
            placeholder={`e.g. ${selectedDocument.title}`}
            className="mb-3"
          />

          <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              {type === 'docs' ? (
                <FileText className="w-5 h-5 text-blue-400 mt-0.5" />
              ) : (
                <Table className="w-5 h-5 text-green-400 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-white truncate">{selectedDocument.title}</h3>
                <p className="text-sm text-gray-400">{type === 'docs' ? 'Google Document' : 'Google Spreadsheet'}</p>
                <a
                  href={selectedDocument.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 mt-1"
                >
                  Open in Google {type === 'docs' ? 'Docs' : 'Sheets'}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          <Button
            onClick={handleConnect}
            disabled={!connectionName.trim() || isConnecting || isSuccess}
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
