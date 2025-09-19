'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { classNames } from '~/utils/classNames';
import { Input } from '~/components/ui/Input';
import { BaseSelect } from '~/components/ui/Select';
import { toast } from 'sonner';
import {
  StepIndicator,
  DocumentPreview,
  ConnectionMethodSelector,
  OauthSection,
  DocumentList,
  NavigationButtons,
} from '~/components/google-workspace';

interface EnvironmentOption {
  label: string;
  value: string;
  description?: string;
}

interface Environment {
  id: string;
  name: string;
  description?: string;
}

interface EnvironmentsResponse {
  success: boolean;
  environments: Environment[];
  error?: string;
}

interface DataSourceResponse {
  success: boolean;
  message?: string;
  error?: string;
  dataSource?: {
    id: string;
  };
}

interface GoogleSheetsSetupProps {
  onSuccess: () => void;
  onBack?: () => void;
  availableDataSourceOptions?: any[];
  environmentId?: string;
}

type FlowStep = 'setup' | 'url-input' | 'apps-script' | 'oauth-login' | 'oauth-documents';
type ConnectionMethod = 'oauth' | 'sharable-url';

interface ConnectionMethodOption {
  id: 'oauth' | 'sharable-url';
  title: string;
  subtitle: string;
  icon: string;
}

interface PreviewData {
  title?: string;
  documentId?: string;
  modified?: string;
  owner?: string;
  url?: string;
}

interface AppsScriptPreviewData {
  scriptId?: string;
  url?: string;
}

interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
}

// Zod schemas for type-safe API responses
const GoogleUserSchema = z.object({
  email: z.string(),
  name: z.string(),
  picture: z.string().optional(),
});

const GoogleSheetDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  modified: z.string(),
  owner: z.string(),
  url: z.string(),
});

const oAuthStatusResponseSchema = z.object({
  success: z.boolean(),
  user: GoogleUserSchema.optional(),
  authenticated: z.boolean().optional(),
  error: z.string().optional(),
});

const DocumentsResponseSchema = z.object({
  success: z.boolean(),
  documents: z.array(GoogleSheetDocumentSchema).optional(),
  error: z.string().optional(),
});

interface ParsedDocument {
  id: string;
  title: string;
  url: string;
}

interface ParsedAppsScript {
  id: string;
  title: string;
  url: string;
}

interface GoogleSheetDocument {
  id: string;
  name: string;
  modified: string;
  owner: string;
  url: string;
}

export default function GoogleSheetsSetup({ onSuccess, environmentId }: GoogleSheetsSetupProps) {
  const [currentStep, setCurrentStep] = useState<FlowStep>('setup');
  const [dataSourceName, setDataSourceName] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<ConnectionMethod | null>(null);
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  const [appsScriptUrl, setAppsScriptUrl] = useState('');
  const [selectedEnvironment, setSelectedEnvironment] = useState<EnvironmentOption | null>(null);
  const [environmentOptions, setEnvironmentOptions] = useState<EnvironmentOption[]>([]);
  const [isLoadingEnvironments, setIsLoadingEnvironments] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview data state
  const [sheetsPreviewData, setSheetsPreviewData] = useState<PreviewData | null>(null);
  const [appsScriptPreviewData, setAppsScriptPreviewData] = useState<AppsScriptPreviewData | null>(null);

  // OAuth state for Google Sheets data source (independent of main auth system)
  const [userDocuments, setUserDocuments] = useState<GoogleSheetDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<GoogleSheetDocument | null>(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState(false);
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [pendingAuthCheck, setPendingAuthCheck] = useState(false);

  useEffect(() => {
    const fetchEnvironments = async () => {
      try {
        const response = await fetch('/api/environments');
        const result: EnvironmentsResponse = await response.json();

        if (result.success) {
          const options: EnvironmentOption[] = result.environments.map((env) => ({
            label: env.name,
            value: env.id,
            description: env.description,
          }));
          setEnvironmentOptions(options);

          if (options.length > 0) {
            setSelectedEnvironment(options[0]);
          }
        } else {
          setError(result.error || 'Failed to fetch environments');
        }
      } catch {
        setError('Failed to fetch environments');
      } finally {
        setIsLoadingEnvironments(false);
      }
    };

    fetchEnvironments();
  }, []);

  const connectionMethods: ConnectionMethodOption[] = [
    {
      id: 'oauth',
      title: 'Google OAuth',
      subtitle: 'Connect with your Google account',
      icon: '/icons/oauth-user.svg',
    },
    {
      id: 'sharable-url',
      title: 'Sharable URL',
      subtitle: 'Use sharable accessible document',
      icon: '/icons/sharable-url.svg',
    },
  ];

  const getSteps = () => {
    if (selectedMethod === 'sharable-url') {
      return [
        { label: 'Google Sheet URL', completed: currentStep !== 'setup' && currentStep !== 'url-input' },
        { label: 'Apps Script Web App URL', completed: currentStep === 'apps-script' && !!appsScriptUrl },
      ];
    } else if (selectedMethod === 'oauth') {
      return [
        { label: 'Authentication', completed: isGoogleAuthenticated },
        { label: 'Spreadsheet', completed: !!selectedDocument },
      ];
    }

    return [];
  };

  const getCurrentStepIndex = () => {
    if (selectedMethod === 'sharable-url') {
      switch (currentStep) {
        case 'url-input':
          return 0;
        case 'apps-script':
          return 1;
        default:
          return 0;
      }
    } else if (selectedMethod === 'oauth') {
      switch (currentStep) {
        case 'oauth-login':
          return 0;
        case 'oauth-documents':
          return 1;
        default:
          return 0;
      }
    }

    return 0;
  };

  const handleMethodSelect = (methodId: ConnectionMethod) => {
    setSelectedMethod(methodId);
  };

  const handleStartSetup = () => {
    if (selectedMethod && dataSourceName.trim() && selectedEnvironment) {
      if (selectedMethod === 'sharable-url') {
        setCurrentStep('url-input');
      } else if (selectedMethod === 'oauth') {
        setCurrentStep('oauth-login');
      }
    }
  };

  const handleUrlSubmit = () => {
    if (googleSheetsUrl.trim()) {
      setCurrentStep('apps-script');
    }
  };

  // Extract document info from Google Sheets URL (from working GoogleWorkspaceConnector)
  const extractDocumentInfo = (url: string): ParsedDocument => {
    try {
      const patterns = [/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/];

      for (const pattern of patterns) {
        const match = url.match(pattern);

        if (match) {
          const documentId = match[1];
          const isSheetUrl = url.includes('/spreadsheets/');

          if (!isSheetUrl) {
            throw new Error('URL must be a Google Sheets URL');
          }

          // Generate a simple title like the old working code
          const title = `Spreadsheet (${documentId.substring(0, 8)}...)`;

          return {
            id: documentId,
            title,
            url: url.split('?')[0], // Clean URL
          };
        }
      }

      throw new Error('Invalid Google Sheets URL format');
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Invalid URL format');
    }
  };

  // Extract Apps Script info from URL (from working GoogleWorkspaceConnector)
  const extractAppsScriptInfo = (url: string): ParsedAppsScript => {
    try {
      const match = url.match(/\/macros\/s\/([a-zA-Z0-9-_]+)/);

      if (match) {
        const scriptId = match[1];
        return {
          id: scriptId,
          title: `Apps Script Web App (${scriptId.substring(0, 8)}...)`,
          url: url.split('?')[0], // Clean URL
        };
      }

      throw new Error('Invalid Google Apps Script Web App URL format');
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Invalid Apps Script URL format');
    }
  };

  // Auto-generate preview when URL changes
  useEffect(() => {
    if (googleSheetsUrl.trim()) {
      try {
        const docInfo = extractDocumentInfo(googleSheetsUrl.trim());
        setSheetsPreviewData({
          title: docInfo.title,
          documentId: docInfo.id,
          modified: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          owner: 'Unknown Owner',
          url: docInfo.url,
        });
      } catch {
        setSheetsPreviewData(null);
      }
    } else {
      setSheetsPreviewData(null);
    }
  }, [googleSheetsUrl]);

  // Auto-generate Apps Script preview when URL changes
  useEffect(() => {
    if (appsScriptUrl.trim()) {
      try {
        const scriptInfo = extractAppsScriptInfo(appsScriptUrl.trim());
        setAppsScriptPreviewData({
          scriptId: scriptInfo.id,
          url: scriptInfo.url,
        });
      } catch {
        setAppsScriptPreviewData(null);
      }
    } else {
      setAppsScriptPreviewData(null);
    }
  }, [appsScriptUrl]);

  const handleAppsScriptSubmit = () => {
    handleComplete('sharable-url');
  };

  const checkOAuthStatus = async () => {
    try {
      const response = await fetch('/api/data-sources/google-sheets/oauth/status');
      const rawResult = await response.json();
      const result = oAuthStatusResponseSchema.parse(rawResult);

      if (result.success && result.authenticated) {
        setIsGoogleAuthenticated(true);
        setGoogleUser(result.user || null);

        return true;
      } else {
        setIsGoogleAuthenticated(false);
        setGoogleUser(null);

        return false;
      }
    } catch {
      return false;
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      // Open Google OAuth in a popup window
      const popup = window.open(
        '/api/data-sources/google-sheets/oauth/authorize',
        'google-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes',
      );

      if (!popup) {
        setError('Popup blocked. Please allow popups for this site.');
        return;
      }

      // Set up periodic check for popup closure (like GoogleWorkspaceConnector)
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

      // Cleanup on timeout (5 minutes like GoogleWorkspaceConnector)
      setTimeout(
        () => {
          if (!popup?.closed) {
            popup?.close();
          }

          clearInterval(pollTimer);
        },
        5 * 60 * 1000,
      );
    } catch {
      setError('Failed to sign in with Google');
    }
  };

  const handleSignOut = async () => {
    try {
      // Clear the OAuth tokens by making a request to clear cookies
      await fetch('/api/data-sources/google-sheets/oauth/logout', { method: 'POST' });

      setIsGoogleAuthenticated(false);
      setGoogleUser(null);
      setUserDocuments([]);
      setSelectedDocument(null);
    } catch {}
  };

  const fetchUserDocuments = async () => {
    setIsLoadingDocuments(true);

    try {
      const response = await fetch('/api/google-sheets/documents');
      const rawResult = await response.json();
      const result = DocumentsResponseSchema.parse(rawResult);

      if (result.success) {
        setUserDocuments(result.documents || []);
      } else {
        setError(result.error || 'Failed to fetch documents');
      }
    } catch {
      setError('Failed to fetch documents');
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const handleDocumentSelect = (doc: GoogleSheetDocument) => {
    setSelectedDocument(doc);
  };

  const handleOAuthComplete = () => {
    if (selectedDocument) {
      handleComplete('oauth');
    }
  };

  const fetchAppsScriptMetadata = async (url: string) => {
    try {
      const scriptIdMatch = url.match(/\/s\/([a-zA-Z0-9-_]+)/);

      if (!scriptIdMatch) {
        // Try alternative pattern for Apps Script URLs
        const altMatch = url.match(/macros\/s\/([a-zA-Z0-9-_]+)/);

        if (!altMatch) {
          throw new Error('Invalid Apps Script URL');
        }

        return {
          scriptId: altMatch[1],
          url,
        };
      }

      const scriptId = scriptIdMatch[1];

      // For Apps Script, we can't easily get metadata without authentication
      // So we'll extract what we can from the URL
      return {
        scriptId,
        url,
      };
    } catch {
      // Fallback for any errors
      const scriptIdMatch = url.match(/\/s\/([a-zA-Z0-9-_]+)/) || url.match(/macros\/s\/([a-zA-Z0-9-_]+)/);
      const scriptId = scriptIdMatch ? scriptIdMatch[1] : 'Unknown';

      return {
        scriptId,
        url,
      };
    }
  };

  // Auto-generate Apps Script preview when URL changes
  useEffect(() => {
    if (appsScriptUrl.trim()) {
      fetchAppsScriptMetadata(appsScriptUrl).then((metadata) => {
        setAppsScriptPreviewData(metadata);
      });
    } else {
      setAppsScriptPreviewData(null);
    }
  }, [appsScriptUrl]);

  // Check Google OAuth status on component mount
  useEffect(() => {
    const initializeAuth = async () => {
      await checkOAuthStatus();
      setIsCheckingAuth(false);
    };

    initializeAuth();
  }, []);

  // Add focus listener for post-OAuth auth checking (like GoogleWorkspaceConnector)
  useEffect(() => {
    const handleWindowFocus = () => {
      if (pendingAuthCheck) {
        setPendingAuthCheck(false);
        setTimeout(() => {
          checkOAuthStatus();
        }, 500);
      }
    };

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [pendingAuthCheck]);

  // Fetch documents when authenticated user is on the documents step
  useEffect(() => {
    if (currentStep === 'oauth-documents' && isGoogleAuthenticated && userDocuments.length === 0) {
      fetchUserDocuments();
    }
  }, [currentStep, isGoogleAuthenticated, userDocuments.length]);

  const handleComplete = async (method: ConnectionMethod) => {
    setError(null);
    setIsSubmitting(true);

    try {
      if (!selectedEnvironment) {
        setError('Please select an environment');
        return;
      }

      // Create connection string in the format the old working UI used
      let connectionString = '';

      if (method === 'oauth') {
        if (selectedDocument) {
          // OAuth connection: use sheets:// protocol with document ID
          connectionString = `sheets://${selectedDocument.id}`;
        } else {
          // Fallback for OAuth without document
          connectionString = `sheets://oauth_${encodeURIComponent(dataSourceName)}`;
        }
      } else {
        // Public URL connection: use the raw Google Sheets URL (like old UI)
        connectionString = googleSheetsUrl;

        // Add Apps Script URL if provided (use correct parameter name)
        if (appsScriptUrl) {
          connectionString += `${connectionString.includes('?') ? '&' : '?'}appsScript=${encodeURIComponent(appsScriptUrl)}`;
        }
      }

      const formData = new FormData();
      formData.append('name', dataSourceName);
      formData.append('type', 'GOOGLE_SHEETS');
      formData.append('environmentId', environmentId || selectedEnvironment.value);

      const properties = [
        {
          type: 'CONNECTION_URL',
          value: connectionString,
        },
      ];
      formData.append('properties', JSON.stringify(properties));

      const response = await fetch('/api/data-sources', {
        method: 'POST',
        body: formData,
      });

      const result = (await response.json()) as DataSourceResponse;

      if (result.success) {
        toast.success('Google Sheets connected successfully');
        // Add a small delay to ensure the database operation is fully complete
        setTimeout(() => {
          onSuccess();
        }, 100);
      } else {
        const message = result.error || 'Failed to add Google Sheets data source';
        toast.error(message);
        setError(message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add Google Sheets data source';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 'apps-script') {
      setCurrentStep('url-input');
    } else if (currentStep === 'url-input') {
      setCurrentStep('setup');
    }
  };

  const isSetupEnabled = Boolean(selectedMethod && dataSourceName.trim() && (environmentId || selectedEnvironment));
  const isUrlEnabled = Boolean(googleSheetsUrl.trim());

  // Setup step - shows dropdowns
  if (currentStep === 'setup') {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <label className="mb-3 block text-sm font-medium text-secondary">Environment</label>
          <BaseSelect
            value={selectedEnvironment}
            onChange={(value: EnvironmentOption | null) => {
              setSelectedEnvironment(value);
              setError(null);
            }}
            options={environmentOptions}
            placeholder={isLoadingEnvironments ? 'Loading environments...' : 'Select environment'}
            isDisabled={isLoadingEnvironments}
            width="100%"
            minWidth="100%"
            isSearchable={false}
          />
          {selectedEnvironment?.description && (
            <div className="text-gray-400 text-sm mt-2">{selectedEnvironment.description}</div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-secondary)] mb-3">Data Source Name</label>
          <Input
            value={dataSourceName}
            onChange={(e) => setDataSourceName(e.target.value)}
            placeholder="Enter data source name"
            data-testid="data-source-name-input"
            style={{
              borderRadius: '8px',
              padding: '8px 12px',
              background: 'var(--color-gray-600)',
              color: '#fff',
            }}
          />
        </div>

        <ConnectionMethodSelector
          methods={connectionMethods}
          selectedMethod={selectedMethod}
          onMethodSelect={(methodId) => handleMethodSelect(methodId as ConnectionMethod)}
        />

        {error && (
          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleStartSetup}
            disabled={!isSetupEnabled || isSubmitting}
            className={classNames(
              'transition-all duration-200 text-sm font-medium rounded-lg',
              isSetupEnabled && !isSubmitting
                ? 'bg-[var(--color-accent)] text-gray-900 hover:bg-[var(--color-accent-600)] cursor-pointer'
                : 'bg-[#474B4F] text-[var(--color-gray-400)] cursor-not-allowed',
            )}
            style={{
              height: '36px',
              borderRadius: '8px',
              padding: '8px 12px',
              minWidth: isSetupEnabled ? '102px' : '56px',
            }}
          >
            {isSubmitting ? 'Setting up...' : 'Start Setup'}
          </button>
        </div>
      </div>
    );
  }

  // URL Input step - no dropdowns
  if (currentStep === 'url-input') {
    return (
      <div className="space-y-6">
        <StepIndicator currentStep={getCurrentStepIndex()} steps={getSteps()} />

        <div>
          <h2
            className="mb-1"
            style={{
              fontFamily: 'SF Pro Text, sans-serif',
              fontSize: '16px',
              fontWeight: 500,
              lineHeight: '24px',
              color: 'var(--color-gray-100)',
            }}
          >
            Document Permissions
          </h2>

          <div
            className="mb-5"
            style={{
              fontFamily: 'SF Pro Text, sans-serif',
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: '20px',
              color: 'var(--color-gray-300)',
            }}
          >
            For <span className="font-semibold">reading only</span>: Set to "Anyone with the link can view"
            <br />
            For <span className="font-semibold">editing</span>: Set to "Anyone with the link can edit"
            <br />
            For <span className="font-semibold">full editing capabilities</span>: consider setting up a Google Apps
            Script
            <br />
            Web App documentation
          </div>

          <button
            onClick={() => window.open('https://docs.google.com/spreadsheets/d/your-guide-url', '_blank')}
            className="flex items-center gap-2 cursor-pointer transition-colors hover:bg-[var(--color-gray-700)] border border-[var(--color-gray-600)] rounded-lg"
            style={{
              width: '194px',
              height: '36px',
              padding: '8px 12px',
            }}
          >
            <span
              style={{
                fontFamily: 'SF Pro Text, sans-serif',
                fontSize: '14px',
                color: 'var(--color-gray-300)',
              }}
            >
              Guide documentation
            </span>
            <img src="/icons/external-link.svg" alt="External link" style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-secondary)] mb-3">
            Enter Google Sheets URL
          </label>
          <Input
            value={googleSheetsUrl}
            onChange={(e) => setGoogleSheetsUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            data-testid="google-sheets-url-input"
            style={{
              background: 'var(--color-gray-600)',
              color: '#fff',
            }}
          />
        </div>

        {sheetsPreviewData && (
          <div className="mt-4">
            <DocumentPreview type="document" data={sheetsPreviewData} />
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <NavigationButtons onBack={handleBack} onNext={handleUrlSubmit} nextDisabled={!isUrlEnabled} />
      </div>
    );
  }

  // Apps Script step - no dropdowns
  if (currentStep === 'apps-script') {
    return (
      <div className="space-y-6">
        <StepIndicator currentStep={getCurrentStepIndex()} steps={getSteps()} />

        <div>
          <h2
            className="mb-2"
            style={{
              fontFamily: 'SF Pro Text, sans-serif',
              fontSize: '16px',
              fontWeight: 500,
              lineHeight: '24px',
              color: 'var(--color-gray-100)',
            }}
          >
            Apps Script Web App URL (optional step)
          </h2>

          <div
            className="mb-4"
            style={{
              fontFamily: 'SF Pro Text, sans-serif',
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: '20px',
              color: 'var(--color-gray-300)',
            }}
          >
            For reliable writing add your Apps Script Web App URL for guaranteed data writing. Without this, we'll try
            to use OAuth tokens (not available) for editing.
            <br />
            Read documentation for 5-minute Google Apps Script setup.
          </div>

          <button
            onClick={() => window.open('https://docs.google.com/spreadsheets/d/your-setup-url', '_blank')}
            className="flex items-center gap-2 cursor-pointer transition-colors hover:bg-[var(--color-gray-700)] border border-[var(--color-gray-600)] rounded-lg"
            style={{
              width: '194px',
              height: '36px',
              padding: '8px 12px',
            }}
          >
            <img src="/icons/external-link.svg" alt="External link" style={{ width: '16px', height: '16px' }} />
            <span
              style={{
                fontFamily: 'SF Pro Text, sans-serif',
                fontSize: '14px',
                color: 'var(--color-gray-300)',
              }}
            >
              Setup documentation
            </span>
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-secondary)] mb-3">
            Enter Apps Script Web App URL
          </label>
          <Input
            value={appsScriptUrl}
            onChange={(e) => setAppsScriptUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/..."
            style={{
              background: 'var(--color-gray-600)',
              color: '#fff',
            }}
          />
        </div>

        {appsScriptPreviewData && (
          <div className="mt-4">
            <DocumentPreview type="apps-script" data={appsScriptPreviewData} />
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <NavigationButtons
          onBack={handleBack}
          onNext={handleAppsScriptSubmit}
          nextLabel="Complete Setup"
          isSubmitting={isSubmitting}
        />
      </div>
    );
  }

  // OAuth Login step
  if (currentStep === 'oauth-login') {
    return (
      <div className="space-y-6">
        <StepIndicator currentStep={getCurrentStepIndex()} steps={getSteps()} />

        <OauthSection
          isCheckingAuth={isCheckingAuth}
          isGoogleAuthenticated={isGoogleAuthenticated}
          googleUser={googleUser}
          onGoogleSignIn={handleGoogleSignIn}
          onSignOut={handleSignOut}
          pendingAuthCheck={pendingAuthCheck}
          setPendingAuthCheck={setPendingAuthCheck}
          checkOAuthStatus={checkOAuthStatus}
        />

        {error && (
          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <NavigationButtons
          onBack={() => setCurrentStep('setup')}
          onNext={() => setCurrentStep('oauth-documents')}
          nextDisabled={!isGoogleAuthenticated || !googleUser}
        />
      </div>
    );
  }

  // OAuth Documents step
  if (currentStep === 'oauth-documents') {
    return (
      <div className="space-y-6">
        <StepIndicator currentStep={getCurrentStepIndex()} steps={getSteps()} />

        <DocumentList
          documents={userDocuments}
          selectedDocument={selectedDocument}
          onDocumentSelect={handleDocumentSelect}
          onRefresh={fetchUserDocuments}
          isLoading={isLoadingDocuments}
        />

        {error && (
          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <NavigationButtons
          onBack={() => setCurrentStep('oauth-login')}
          onNext={handleOAuthComplete}
          nextLabel="Complete Setup"
          nextDisabled={!selectedDocument}
          isSubmitting={isSubmitting}
        />
      </div>
    );
  }

  return null;
}
