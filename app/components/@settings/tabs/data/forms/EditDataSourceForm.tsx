import { classNames } from '~/utils/classNames';
import { useEffect, useState } from 'react';
import type { TestConnectionResponse } from '~/components/@settings/tabs/data/DataTab';
import { toast } from 'sonner';
import { useDataSourceTypesStore } from '~/lib/stores/dataSourceTypes';
import { BaseSelect } from '~/components/ui/Select';
import {
  DatabaseType,
  type DataSourceOption,
  DATASOURCES,
  SelectDatabaseTypeOptions,
  SingleValueWithTooltip,
} from '~/components/database/SelectDatabaseTypeOptions';
import { parseDatabaseConnectionUrl } from '~/utils/parseDatabaseConnectionUrl';

interface DataSource {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  username: string;
  database: string;
  sslMode: string;
  createdAt: string;
  updatedAt: string;
}

interface DataSourceResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface EditDataSourceFormProps {
  selectedDataSource: DataSource | null;
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
  onSuccess: () => void;
  onDelete: () => void;
}

const generateConnectionString = (dataSource: DataSource): string => {
  const sslMode = dataSource.sslMode?.toLowerCase() || 'disable';
  return `postgresql://${dataSource.username}:HIDDEN_PASSWORD@${dataSource.host}:${dataSource.port}/${dataSource.database}?sslmode=${sslMode}`;
};

console.log(generateConnectionString, 'TODO');

export default function EditDataSourceForm({
  selectedDataSource,
  isSubmitting,
  setIsSubmitting,
  onSuccess,
  onDelete,
}: EditDataSourceFormProps) {
  const [dbType, setDbType] = useState<DataSourceOption>(
    DATASOURCES.find((ds) => ds.value === 'postgres') || DATASOURCES[0],
  );
  const [connStr, setConnStr] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<DataSourceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const { types: databaseTypes, fetchTypes, error: typesError } = useDataSourceTypesStore();

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  useEffect(() => {
    if (typesError) {
      toast.error('Failed to load database types');
    }
  }, [typesError]);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);
    setError(null);

    try {
      if (dbType.value === DatabaseType.POSTGRES) {
        if (!connStr) {
          setError('Please enter a connection string');
          return;
        }

        const connectionDetails = parseDatabaseConnectionUrl(connStr);

        const formData = new FormData();
        formData.append('id', selectedDataSource?.id || '');
        Object.entries(connectionDetails)
          .filter(([key, value]) => !(key === 'password' && value === 'HIDDEN_PASSWORD'))
          .forEach(([key, value]) => {
            formData.append(key, value?.toString() || '');
          });

        const response = await fetch('/api/data-sources/edit/testing', {
          method: 'POST',
          body: formData,
        });

        const data = (await response.json()) as TestConnectionResponse;
        setTestResult(data);
      }
    } catch (error) {
      setTestResult({
        success: false,
        message:
          error instanceof Error ? error.message : String(error) || 'Failed to test connection. Please try again.',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveConfirm = async () => {
    if (dbType.value === DatabaseType.SAMPLE) {
      setError('Cannot edit sample database');
      setTestResult(null);

      return;
    }

    if (!connStr) {
      setError('Please enter a connection string');
      setTestResult(null);

      return;
    }

    setIsSubmitting(true);
    setError(null);
    setTestResult(null);
    setShowSaveConfirmation(false);

    try {
      const connectionDetails = parseDatabaseConnectionUrl(connStr);

      const formData = new FormData();
      formData.append('name', connectionDetails.database || '');
      formData.append('type', connectionDetails.type);
      formData.append('host', connectionDetails.host || '');
      formData.append('port', connectionDetails.port.toString());
      formData.append('username', connectionDetails.username || '');
      formData.append('database', connectionDetails.database || '');
      formData.append('sslMode', connectionDetails.sslMode);

      // Only include the password if it was actually changed
      if (!connStr.includes('HIDDEN_PASSWORD')) {
        formData.append('password', connectionDetails.password || '');
      }

      const response = await fetch(`/api/data-sources/${selectedDataSource?.id}`, {
        method: 'PUT',
        body: formData,
      });

      const data = await response.json<DataSourceResponse>();

      if (data.success) {
        toast.success('Data source updated successfully');
        onSuccess();
      } else {
        const message = data.message || 'Failed to update data source';
        toast.error(message);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error) || 'Failed to update data source. Please try again.';
      setError(message);
      setTestResult(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setShowSaveConfirmation(true);
  };

  if (!selectedDataSource) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-4">
          <div className="flex gap-2 mb-6 items-end">
            <div className="min-w-[160px] flex-1">
              <label className="mb-3 block text-sm font-medium text-liblab-elements-textSecondary">Data source</label>
              <BaseSelect
                value={dbType}
                onChange={(value) => {
                  const newDbType = value as DataSourceOption;
                  setDbType(newDbType);
                  setError(null);
                  setTestResult(null);
                }}
                options={databaseTypes}
                width="100%"
                minWidth="100%"
                isSearchable={false}
                components={{
                  MenuList: SelectDatabaseTypeOptions,
                  SingleValue: SingleValueWithTooltip,
                }}
              />
            </div>
          </div>

          {dbType.value === DatabaseType.POSTGRES && (
            <div>
              <label className="mb-3 block text-sm font-medium text-liblab-elements-textSecondary">
                Connection String
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={connStr}
                  onChange={(e) => setConnStr(e.target.value)}
                  disabled={isSubmitting}
                  className={classNames(
                    'w-full px-4 py-2.5 pr-12 bg-[#F5F5F5] dark:bg-gray-700 border rounded-lg',
                    'text-liblab-elements-textPrimary placeholder-liblab-elements-textTertiary text-base',
                    'border-[#E5E5E5] dark:border-[#1A1A1A] rounded-lg',
                    'focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500',
                    'transition-all duration-200',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                  placeholder="postgresql://username:password@host:port/database"
                />
              </div>
              <label className="mb-3 block !text-[13px] text-liblab-elements-textSecondary mt-2">
                e.g. postgresql://username:password@host:port/database <br />
                By changing the HIDDEN_PASSWORD placeholder, you actually change the password.
              </label>
            </div>
          )}

          {dbType.value === DatabaseType.SAMPLE && (
            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-2">
                <div className="i-ph:info w-5 h-5 text-blue-500" />
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Sample database cannot be edited. Delete and create a new one if needed.
                </p>
              </div>
            </div>
          )}

          {/* Show error state only if there's no test result, or show test result error */}
          {error && !testResult && (
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
              <div className="flex items-center gap-2">
                <div className="i-ph:x-circle w-5 h-5 text-red-500" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          {testResult && (
            <div
              className={`p-3 rounded-lg ${
                testResult.success
                  ? 'bg-green-500/5 border border-green-500/20'
                  : 'bg-red-500/5 border border-red-500/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`i-ph:${
                    testResult.success ? 'check-circle' : 'x-circle'
                  } w-5 h-5 ${testResult.success ? 'text-green-500' : 'text-red-500'}`}
                />
                <p
                  className={`text-sm ${
                    testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {testResult.message}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-[#E5E5E5] dark:border-[#1A1A1A]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {dbType.value === DatabaseType.POSTGRES && (
                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    await handleTestConnection();
                  }}
                  disabled={isTestingConnection || isSubmitting || !connStr}
                  className={classNames(
                    'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    'bg-blue-500 hover:bg-blue-600',
                    'text-gray-950 dark:text-gray-950',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  {isTestingConnection ? (
                    <>
                      <div className="i-ph:spinner animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <div className="i-ph:plug-fill" />
                      <span>Test Connection</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onDelete}
                disabled={isSubmitting}
                className={classNames(
                  'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  'bg-red-500 hover:bg-red-600',
                  'text-white',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                <div className="i-ph:trash-bold" />
                <span>Delete</span>
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  dbType.value === DatabaseType.SAMPLE ||
                  (dbType.value === DatabaseType.POSTGRES && !connStr)
                }
                className={classNames(
                  'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  'bg-accent-500 hover:bg-accent-600',
                  'text-gray-950 dark:text-gray-950',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {isSubmitting ? (
                  <>
                    <div className="i-ph:spinner animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <div className="i-ph:floppy-disk" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Confirmation Modal */}
      {showSaveConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="i-ph:warning-circle w-6 h-6 text-amber-500" />
              <h3 className="text-lg font-semibold text-liblab-elements-textPrimary">Confirm Save Changes</h3>
            </div>
            <p className="text-sm text-liblab-elements-textSecondary mb-6">
              Are you sure you want to save these changes to the data source? This action will update the connection
              settings
              {!connStr.includes('HIDDEN_PASSWORD') ? ' and the password' : ''}.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSaveConfirmation(false)}
                disabled={isSubmitting}
                className={classNames(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  'bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500',
                  'text-gray-700 dark:text-gray-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveConfirm}
                disabled={isSubmitting}
                className={classNames(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  'bg-accent-500 hover:bg-accent-600',
                  'text-gray-950 dark:text-gray-950',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
