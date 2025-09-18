import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Eye, EyeOff, Info, Loader2, Plug, Trash2, XCircle } from 'lucide-react';
import { classNames } from '~/utils/classNames';
import type { DataSourceWithEnvironments } from '~/lib/stores/environmentDataSources';
import { type DataSourceOption, useDataSourceTypesPlugin } from '~/lib/hooks/plugins/useDataSourceTypesPlugin';
import {
  DataSourcePropertyType,
  DataSourceType,
  type DataSourcePropertyDescriptor,
} from '@liblab/data-access/utils/types';
import { getDataSourceProperties } from '~/components/@settings/utils/data-sources';
import { z } from 'zod';
import { Button } from '~/components/ui/Button';
import WithTooltip from '~/components/ui/Tooltip';
import { logger } from '~/utils/logger';
import { useEnvironmentsStore } from '~/lib/stores/environments';
import type { EnvironmentWithRelations } from '~/lib/services/environmentService';
import { DeleteConfirmationModal } from '~/components/ui/DeleteConfirmationModal';

type Props = {
  dataSource: DataSourceWithEnvironments;
  onBack: () => void;
  setHeaderTitle?: (title: string) => void;
  setHeaderBackHandler?: (handler: () => void) => void;
  onSuccess?: () => void;
  environmentId?: string; // Optional for create mode
  isCreateMode?: boolean; // New prop to indicate create mode
};

type SimpleProperty = { type: string; value: string };

// Google Sheets specific state
interface GoogleSheetsConfig {
  googleSheetsUrl: string;
  appsScriptUrl: string;
}

export default function DataSourceEnvironmentsForm({
  dataSource,
  environmentId,
  onBack,
  setHeaderTitle,
  setHeaderBackHandler,
  onSuccess,
  isCreateMode = false,
}: Props) {
  const { availableDataSourceOptions } = useDataSourceTypesPlugin();
  const [showSensitiveInput, setShowSensitiveInput] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [properties, setProperties] = useState<SimpleProperty[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [editedProperties, setEditedProperties] = useState<SimpleProperty[]>([]);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string>('');
  const { environments, setEnvironments } = useEnvironmentsStore();

  // Google Sheets specific state
  const [googleSheetsConfig, setGoogleSheetsConfig] = useState<GoogleSheetsConfig>({
    googleSheetsUrl: '',
    appsScriptUrl: '',
  });

  const isGoogleSheets = dataSource.type === DataSourceType.GOOGLE_SHEETS;

  // Helper functions for Google Sheets URLs
  const parseGoogleSheetsConnectionString = (connectionString: string): GoogleSheetsConfig => {
    try {
      const url = new URL(connectionString);
      const appsScriptParam = url.searchParams.get('appsScript');

      return {
        googleSheetsUrl: connectionString.split('?')[0], // Remove query params for display
        appsScriptUrl: appsScriptParam ? decodeURIComponent(appsScriptParam) : '',
      };
    } catch {
      // If not a valid URL, it might be a direct Google Sheets URL
      return {
        googleSheetsUrl: connectionString,
        appsScriptUrl: '',
      };
    }
  };

  const createGoogleSheetsConnectionString = (config: GoogleSheetsConfig): string => {
    let connectionString = config.googleSheetsUrl;

    if (config.appsScriptUrl) {
      connectionString += `${connectionString.includes('?') ? '&' : '?'}appsScript=${encodeURIComponent(config.appsScriptUrl)}`;
    }

    return connectionString;
  };

  const selectedEnv = useMemo(() => {
    if (isCreateMode) {
      return null; // No environment selected in create mode
    }

    return dataSource.environments.find((e) => e.id === environmentId) || null;
  }, [dataSource.environments, environmentId, isCreateMode]);

  const dsOption: DataSourceOption | undefined = useMemo(
    () => availableDataSourceOptions.find((o) => (o.type || o.value.toUpperCase()) === dataSource.type),
    [availableDataSourceOptions, dataSource.type],
  );

  const propertyDescriptors: DataSourcePropertyDescriptor[] = useMemo(() => {
    return (dsOption?.properties as DataSourcePropertyDescriptor[]) || [];
  }, [dsOption?.properties]);

  const expectedProps = useMemo(() => (propertyDescriptors || []).map((p) => p.type), [propertyDescriptors]);
  const providedPropsMap = useMemo(() => new Map(editedProperties.map((p) => [p.type, p.value])), [editedProperties]);

  const hasAllRequiredProperties = useMemo(() => {
    if (isGoogleSheets) {
      // For Google Sheets, only require the Google Sheets URL
      return Boolean(googleSheetsConfig.googleSheetsUrl && googleSheetsConfig.googleSheetsUrl.trim() !== '');
    }

    return expectedProps.every((t) => {
      const v = providedPropsMap.get(t);
      return Boolean(v && v.trim() !== '');
    });
  }, [expectedProps, providedPropsMap, isGoogleSheets, googleSheetsConfig]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (isCreateMode) {
          // In create mode, initialize with empty properties based on data source type
          const expectedProps = (propertyDescriptors || []).map((p) => ({ type: p.type, value: '' }));
          setProperties(expectedProps);
          setEditedProperties(expectedProps);
        } else {
          const result = await getDataSourceProperties(dataSource.id, environmentId!);

          if (!mounted) {
            return;
          }

          if (result) {
            setProperties(result);
            setEditedProperties(result);

            // Parse Google Sheets URLs if this is a Google Sheets data source
            if (isGoogleSheets) {
              const connectionProperty = result.find((p) => p.type === DataSourcePropertyType.CONNECTION_URL);

              if (connectionProperty?.value) {
                const parsedConfig = parseGoogleSheetsConnectionString(connectionProperty.value);
                setGoogleSheetsConfig(parsedConfig);
              }
            }
          } else {
            // fallback to values we already have on the details object
            const fallbackProperties = (selectedEnv?.dataSourceProperties as any) || [];
            setProperties(fallbackProperties);
            setEditedProperties(fallbackProperties);

            // Parse Google Sheets URLs from fallback properties
            if (isGoogleSheets) {
              const connectionProperty = fallbackProperties.find(
                (p: any) => p.type === DataSourcePropertyType.CONNECTION_URL,
              );

              if (connectionProperty?.value) {
                const parsedConfig = parseGoogleSheetsConnectionString(connectionProperty.value);
                setGoogleSheetsConfig(parsedConfig);
              }
            }
          }
        }
      } catch (e) {
        logger.error('Failed to load data source properties:', e);
        setError('Failed to load properties');

        const fallbackProperties = (selectedEnv?.dataSourceProperties as any) || [];
        setProperties(fallbackProperties);
        setEditedProperties(fallbackProperties);

        // Parse Google Sheets URLs from fallback properties in error case
        if (isGoogleSheets) {
          const connectionProperty = fallbackProperties.find(
            (p: any) => p.type === DataSourcePropertyType.CONNECTION_URL,
          );

          if (connectionProperty?.value) {
            const parsedConfig = parseGoogleSheetsConnectionString(connectionProperty.value);
            setGoogleSheetsConfig(parsedConfig);
          }
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [dataSource.id, environmentId, selectedEnv?.dataSourceProperties, isCreateMode, propertyDescriptors]);

  useEffect(() => {
    if (isCreateMode) {
      setHeaderTitle?.(`Create New Environment for "${dataSource.name}"`);
      setHeaderBackHandler?.(() => onBack);
    } else if (selectedEnv) {
      setHeaderTitle?.(`Edit "${selectedEnv.name}" Environment for "${dataSource.name}"`);
      setHeaderBackHandler?.(() => onBack);
    }
  }, [isCreateMode]);

  useEffect(() => {
    const loadEnvironments = async () => {
      try {
        const response = await fetch('/api/environments');
        const data = (await response.json()) as { success: boolean; environments: EnvironmentWithRelations[] };

        if (data.success) {
          setEnvironments(data.environments);
        }
      } catch (error) {
        logger.error('Failed to load environments:', error);
      }
    };

    loadEnvironments();
  }, [setEnvironments]);

  const getLabelForType = (type: string) => propertyDescriptors.find((d) => d.type === (type as any))?.label || type;
  const getFormatForType = (type: string) => propertyDescriptors.find((d) => d.type === (type as any))?.format || '';

  const handlePropertyChange = (type: string, value: string) => {
    setEditedProperties((prev) => {
      const existing = prev.find((p) => p.type === type);

      if (existing) {
        return prev.map((p) => (p.type === type ? { ...p, value } : p));
      } else {
        return [...prev, { type, value }];
      }
    });
  };

  const handleGoogleSheetsConfigChange = (config: GoogleSheetsConfig) => {
    setGoogleSheetsConfig(config);

    if (isGoogleSheets) {
      const connectionString = createGoogleSheetsConnectionString(config);
      handlePropertyChange(DataSourcePropertyType.CONNECTION_URL, connectionString);
    }
  };

  const hasChanges = useMemo(() => {
    if (properties.length !== editedProperties.length) {
      return true;
    }

    return properties.some((prop) => {
      const edited = editedProperties.find((p) => p.type === prop.type);
      return !edited || edited.value !== prop.value;
    });
  }, [properties, editedProperties]);

  const isOnlyEnvironment = useMemo(() => {
    return dataSource.environments.length === 1;
  }, [dataSource.environments.length]);

  const testConnectionResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
  });

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);
    setError(null);

    try {
      if (!dsOption) {
        setError('Data source type is not available.');
        return;
      }

      if (!hasAllRequiredProperties) {
        setError('Please ensure all required fields are configured for this environment.');
        return;
      }

      const formData = new FormData();
      formData.append('type', dsOption.type || dsOption.value.toUpperCase());

      const propsPayload = expectedProps.map((t) => ({ type: t, value: providedPropsMap.get(t) || '' }));

      formData.append('properties', JSON.stringify(propsPayload));

      const response = await fetch('/api/data-sources/testing', {
        method: 'POST',
        body: formData,
      });

      const responseText = await response.text();

      try {
        const parsed = JSON.parse(responseText);
        const data = testConnectionResponseSchema.parse(parsed);
        setTestResult(data);
        setError(null);
      } catch (parseError) {
        logger.error(`Failed to parse test connection response:`, parseError);

        throw new Error(`Invalid response format: ${responseText.substring(0, 200)}...`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e) || 'Failed to test connection. Please try again.';
      setTestResult({
        success: false,
        message,
      });
      setError(null);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveConfirm = async () => {
    if (!isCreateMode && !hasChanges) {
      setError('No changes to save');
      return;
    }

    if (isCreateMode && !selectedEnvironmentId) {
      setError('Please select an environment');
      return;
    }

    setIsSaving(true);
    setError(null);
    setTestResult(null);

    try {
      // First test the connection before saving
      if (!dsOption) {
        setError('Data source type is not available.');
        return;
      }

      if (!hasAllRequiredProperties) {
        setError('Please ensure all required fields are configured for this environment.');
        return;
      }

      // Test connection first
      const testFormData = new FormData();
      testFormData.append('type', dsOption.type || dsOption.value.toUpperCase());

      const propsPayload = expectedProps.map((t) => ({ type: t, value: providedPropsMap.get(t) || '' }));

      testFormData.append('properties', JSON.stringify(propsPayload));

      const testResponse = await fetch('/api/data-sources/testing', {
        method: 'POST',
        body: testFormData,
      });

      const testResponseText = await testResponse.text();
      const testParsed = JSON.parse(testResponseText);
      const testData = testConnectionResponseSchema.parse(testParsed);

      if (!testData.success) {
        setTestResult({
          success: false,
          message: testData.message,
        });
        setError(null);

        return;
      }

      // If test passes, proceed with saving
      const formData = new FormData();
      formData.append('properties', JSON.stringify(editedProperties));

      if (isCreateMode) {
        formData.append('environmentId', selectedEnvironmentId);

        const response = await fetch(`/api/data-sources/${dataSource.id}/environments`, {
          method: 'POST',
          body: formData,
        });

        const data = (await response.json()) as { success: boolean; error?: string };

        if (data.success) {
          setTestResult({
            success: true,
            message: 'Data source environment created successfully',
          });
          setError(null);
          setProperties(editedProperties);
          onSuccess?.();
        } else {
          const message = data.error || 'Failed to create data source environment';
          setTestResult({
            success: false,
            message,
          });
          setError(null);
        }
      } else {
        const response = await fetch(`/api/data-sources/${dataSource.id}/environments/${environmentId}`, {
          method: 'PUT',
          body: formData,
        });

        const data = (await response.json()) as { success: boolean; error?: string };

        if (data.success) {
          setTestResult({
            success: true,
            message: 'Data source properties updated successfully',
          });
          setError(null);
          setProperties(editedProperties);
          onSuccess?.();
        } else {
          const message = data.error || 'Failed to update data source properties';
          setTestResult({
            success: false,
            message,
          });
          setError(null);
        }
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error) || 'Failed to save data source properties. Please try again.';
      setTestResult({
        success: false,
        message,
      });
      setError(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    await handleSaveConfirm();
  };

  const handleDeleteEnvironment = () => {
    setShowDeleteConfirmation(true);
  };

  const handleDeleteConfirm = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/data-sources/${dataSource.id}/environments/${environmentId}`, {
        method: 'DELETE',
      });

      const data = (await response.json()) as { success: boolean; error?: string };

      if (data.success) {
        setTestResult({
          success: true,
          message: 'Environment deleted successfully',
        });
        setError(null);
        setShowDeleteConfirmation(false);
        onSuccess?.();
      } else {
        const message = data.error || 'Failed to delete environment';
        setTestResult({
          success: false,
          message,
        });
        setError(null);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error) || 'Failed to delete environment. Please try again.';
      setTestResult({
        success: false,
        message,
      });
      setError(null);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isCreateMode && !selectedEnv) {
    return (
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
          Environment not found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="text-sm text-secondary">Loading properties...</div>
      ) : properties.length === 0 ? (
        <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            <p className="text-sm text-blue-600 dark:text-blue-400">No properties configured for this environment.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 mb-10">
          {isCreateMode && (
            <div>
              <label className="mb-3 block text-sm font-medium text-secondary">Select Environment</label>
              <select
                value={selectedEnvironmentId}
                onChange={(e) => setSelectedEnvironmentId(e.target.value)}
                disabled={isSaving}
                className={classNames(
                  'w-full px-4 py-2.5 bg-[#F5F5F5] dark:bg-gray-700 border rounded-lg',
                  'text-primary text-base',
                  'border-[#E5E5E5] dark:border-[#1A1A1A] rounded-lg',
                  'focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500',
                  'transition-all duration-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                <option value="">Choose an environment...</option>
                {environments.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {isGoogleSheets ? (
            // Google Sheets specific inputs
            <>
              <div>
                <label className="mb-3 block text-sm font-medium text-secondary">Google Sheets URL</label>
                <div className="relative">
                  <input
                    type="text"
                    value={googleSheetsConfig.googleSheetsUrl}
                    onChange={(e) =>
                      handleGoogleSheetsConfigChange({
                        ...googleSheetsConfig,
                        googleSheetsUrl: e.target.value,
                      })
                    }
                    disabled={isSaving}
                    className={classNames(
                      'w-full px-4 py-2.5 bg-[#F5F5F5] dark:bg-gray-700 border rounded-lg',
                      'text-primary placeholder-tertiary text-base',
                      'border-[#E5E5E5] dark:border-[#1A1A1A] rounded-lg',
                      'focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500',
                      'transition-all duration-200',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                    placeholder="https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit"
                  />
                </div>
                <label className="mb-3 block !text-[11px] text-secondary mt-1">
                  For read operations. e.g. https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
                </label>
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-secondary">
                  Apps Script Web App URL (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={googleSheetsConfig.appsScriptUrl}
                    onChange={(e) =>
                      handleGoogleSheetsConfigChange({
                        ...googleSheetsConfig,
                        appsScriptUrl: e.target.value,
                      })
                    }
                    disabled={isSaving}
                    className={classNames(
                      'w-full px-4 py-2.5 bg-[#F5F5F5] dark:bg-gray-700 border rounded-lg',
                      'text-primary placeholder-tertiary text-base',
                      'border-[#E5E5E5] dark:border-[#1A1A1A] rounded-lg',
                      'focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500',
                      'transition-all duration-200',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                    placeholder="https://script.google.com/macros/s/SCRIPT_ID/exec"
                  />
                </div>
                <label className="mb-3 block !text-[11px] text-secondary mt-1">
                  For write operations. e.g. https://script.google.com/macros/s/SCRIPT_ID/exec
                </label>
              </div>
            </>
          ) : (
            // Regular properties for other data sources
            editedProperties.map((prop) => (
              <div key={prop.type}>
                <label className="mb-3 block text-sm font-medium text-secondary">{getLabelForType(prop.type)}</label>
                <div className="relative">
                  <input
                    type={showSensitiveInput ? 'text' : 'password'}
                    value={prop.value}
                    onChange={(e) => handlePropertyChange(prop.type, e.target.value)}
                    disabled={isSaving}
                    className={classNames(
                      'w-full px-4 py-2.5 pr-12 bg-[#F5F5F5] dark:bg-gray-700 border rounded-lg',
                      'text-primary placeholder-tertiary text-base',
                      'border-[#E5E5E5] dark:border-[#1A1A1A] rounded-lg',
                      'focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500',
                      'transition-all duration-200',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                    placeholder={getFormatForType(prop.type)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSensitiveInput((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#4b4f5a] rounded group"
                    tabIndex={-1}
                  >
                    <span className="text-gray-400 group-hover:text-white transition-colors">
                      {showSensitiveInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </span>
                  </button>
                </div>
                <label className="mb-3 block !text-[13px] text-secondary mt-2">
                  e.g. {getFormatForType(prop.type)}
                </label>
              </div>
            ))
          )}

          {(testResult || error) && (
            <div
              className={`p-3 rounded-lg ${
                testResult?.success
                  ? 'bg-green-500/5 border border-green-500/20'
                  : 'bg-red-500/5 border border-red-500/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 ${testResult?.success ? 'text-green-500' : 'text-red-500'}`}>
                  {testResult?.success ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>
                <p
                  className={`text-sm ${
                    testResult?.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {testResult?.message || error}
                </p>
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button
              onClick={async (e) => {
                e.preventDefault();
                await handleTestConnection();
              }}
              disabled={isTestingConnection || editedProperties.length === 0}
              variant="outline"
            >
              {isTestingConnection ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <Plug className="w-4 h-4 mr-2" />
                  <span>Test Connection</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="pt-5 border-t border-depth-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!isCreateMode && (
              <WithTooltip
                tooltip="It is not possible to delete the only environment for the data source. If you want to delete the whole data source, do it from the 'Details' tab."
                hidden={!isOnlyEnvironment}
              >
                <div>
                  <Button
                    onClick={handleDeleteEnvironment}
                    variant="destructive"
                    disabled={isOnlyEnvironment || isSaving}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    <span>Delete Environment</span>
                  </Button>
                </div>
              </WithTooltip>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={
                isSaving ||
                !hasAllRequiredProperties ||
                (isCreateMode && !selectedEnvironmentId) ||
                (!isCreateMode && !hasChanges)
              }
              variant="primary"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>{isCreateMode ? 'Creating...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <span>{isCreateMode ? 'Add Environment' : 'Save Changes'}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleDeleteConfirm}
        entityName={`"${selectedEnv?.name}" environment for "${dataSource.name}"`}
        customWarning={
          selectedEnv?.conversationCount
            ? {
                title: `This will also delete ${selectedEnv.conversationCount} conversation${selectedEnv.conversationCount === 1 ? '' : 's'}!`,
                description:
                  'All conversations associated with this data source will be permanently deleted and cannot be recovered.',
              }
            : undefined
        }
      />
    </div>
  );
}
