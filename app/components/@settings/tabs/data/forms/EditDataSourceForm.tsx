import { classNames } from '~/utils/classNames';
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Info, Loader2, Plug, Save, Trash2, XCircle } from 'lucide-react';
import type { TestConnectionResponse } from '~/components/@settings/tabs/data/DataTab';
import { toast } from 'sonner';
import { BaseSelect } from '~/components/ui/Select';
import { SelectDatabaseTypeOptions, SingleValueWithTooltip } from '~/components/database/SelectDatabaseTypeOptions';
import { Eye, EyeSlash } from 'iconsax-reactjs';
import {
  type DataSourceOption,
  DEFAULT_DATA_SOURCES,
  SAMPLE_DATABASE,
  useDataSourceTypesPlugin,
} from '~/lib/hooks/plugins/useDataSourceTypesPlugin';
import type { EnvironmentDataSource } from '~/lib/stores/environmentDataSources';
import { getDataSourceProperties } from '~/components/@settings/utils/data-sources';
import type { DataSourcePropertyDescriptor } from '@liblab/data-access/utils/types';
import ResourceAccessMembers from '~/components/@settings/shared/components/ResourceAccessMembers';

interface DataSourceResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface Environment {
  id: string;
  name: string;
  description?: string;
}

interface EnvironmentOption {
  label: string;
  value: string;
  description?: string;
}

interface EnvironmentsResponse {
  success: boolean;
  environments: Environment[];
  error?: string;
}

interface EditDataSourceFormProps {
  selectedDataSource: EnvironmentDataSource | null;
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
  onSuccess: () => void;
  onDelete: () => void;
  onInvite: () => void;
}

export default function EditDataSourceForm({
  selectedDataSource,
  isSubmitting,
  setIsSubmitting,
  onSuccess,
  onDelete,
  onInvite,
}: EditDataSourceFormProps) {
  const { availableDataSourceOptions } = useDataSourceTypesPlugin();

  const [dbType, setDbType] = useState<DataSourceOption>({} as DataSourceOption);
  const [dbName, setDbName] = useState('');
  const [propertyValues, setPropertyValues] = useState<Record<string, string>>({});
  const [selectedEnvironment, setSelectedEnvironment] = useState<EnvironmentOption | null>(null);
  const [environmentOptions, setEnvironmentOptions] = useState<EnvironmentOption[]>([]);
  const [isLoadingEnvironments, setIsLoadingEnvironments] = useState(true);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<DataSourceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showSensitiveInput, setShowSensitiveInput] = useState(false);

  // Fetch environments on component mount
  useEffect(() => {
    const fetchEnvironments = async () => {
      try {
        const response = await fetch('/api/environments');
        const result: EnvironmentsResponse = await response.json();

        if (result.success) {
          // Transform environments to options
          const options: EnvironmentOption[] = result.environments.map((env) => ({
            label: env.name,
            value: env.id,
            description: env.description || undefined,
          }));
          setEnvironmentOptions(options);

          // Auto-select first environment if available
          if (!selectedEnvironment && options.length > 0) {
            setSelectedEnvironment((previouslySelectedEnvironment) => previouslySelectedEnvironment || options[0]);
          }
        } else {
          setError(result.error || 'Failed to fetch environments');
        }
      } catch (error) {
        setError('Failed to fetch environments');
        console.error('Error fetching environments:', error);
      } finally {
        setIsLoadingEnvironments(false);
      }
    };

    fetchEnvironments();
  }, []);

  useEffect(() => {
    if (!selectedDataSource) {
      return;
    }

    // Set the current environment from the selected data source
    const currentEnvironment: EnvironmentOption = {
      label: selectedDataSource.environment.name,
      value: selectedDataSource.environment.id,
      description: selectedDataSource.environment.description || undefined,
    };

    setSelectedEnvironment(currentEnvironment);

    if (selectedDataSource.dataSource.name === 'Sample Database') {
      setDbType(DEFAULT_DATA_SOURCES[0]);
      setDbName('');
      setPropertyValues({});
    } else {
      // For non-sample databases, we need to get the connection string from the API
      // since it's not stored in the EnvironmentDataSource object
      // This will be handled when we need to update the data source

      setDbName(selectedDataSource.dataSource.name);

      getDataSourceProperties(selectedDataSource.dataSource.id, currentEnvironment.value).then((properties) => {
        const matchingOption = availableDataSourceOptions.find(
          (opt) => opt.value === selectedDataSource.dataSource.type.toLowerCase(),
        );

        setDbType(matchingOption || DEFAULT_DATA_SOURCES[0]);
        setDbName(selectedDataSource.dataSource.name);

        setPropertyValues(properties.reduce((acc, prop) => ({ ...acc, [prop.type]: prop.value }), {}));
      });
    }

    setError(null);
    setTestResult(null);
  }, [selectedDataSource?.dataSourceId, selectedDataSource?.dataSource.name, selectedDataSource?.environment]);

  const handlePropertyChange = (propertyLabel: string, value: string) => {
    setPropertyValues((prev) => ({
      ...prev,
      [propertyLabel]: value,
    }));
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);
    setError(null);

    try {
      if (dbType.value !== SAMPLE_DATABASE) {
        if (!dbType.properties || dbType.properties.length === 0) {
          setTestResult({
            success: true,
            message: 'No connection testing required for this data source type.',
          });
          return;
        }

        const hasAllRequiredProperties = dbType.properties.every((prop) => {
          const value = propertyValues[prop.label];
          return value && value.trim() !== '';
        });

        if (!hasAllRequiredProperties) {
          setError('Please fill in all required fields');
          return;
        }

        if (!selectedEnvironment) {
          setError('Please select an environment');
          return;
        }

        const formData = new FormData();
        formData.append('type', dbType.type || dbType.value.toUpperCase());

        const properties = dbType.properties.map((prop) => ({
          type: prop.type,
          value: propertyValues[prop.label] || '',
        }));
        formData.append('properties', JSON.stringify(properties));

        const response = await fetch('/api/data-sources/testing', {
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
    if (dbType.value === SAMPLE_DATABASE) {
      setError('Cannot edit sample database');
      setTestResult(null);

      return;
    }

    if (!dbName) {
      setError('Please enter the data source name');
      setTestResult(null);

      return;
    }

    if (dbType.properties && dbType.properties.length > 0) {
      const hasAllRequiredProperties = dbType.properties.every((prop) => {
        const value = propertyValues[prop.label];
        return value && value.trim() !== '';
      });

      if (!hasAllRequiredProperties) {
        setError('Please fill in all required fields');
        setTestResult(null);

        return;
      }
    }

    if (!selectedEnvironment) {
      setError('Please select an environment');
      setTestResult(null);

      return;
    }

    setIsSubmitting(true);
    setError(null);
    setTestResult(null);
    setShowSaveConfirmation(false);

    try {
      const formData = new FormData();
      formData.append('name', dbName);
      formData.append('type', dbType.type || dbType.value.toUpperCase());

      const properties = dbType.properties.map((prop) => ({
        type: prop.type,
        value: propertyValues[prop.label] || '',
      }));
      formData.append('properties', JSON.stringify(properties));

      const response = await fetch(
        `/api/data-sources/${selectedDataSource?.dataSourceId}?environmentId=${selectedEnvironment.value}`,
        {
          method: 'PUT',
          body: formData,
        },
      );

      const data = await response.json<DataSourceResponse>();

      if (data.success) {
        toast.success('Data source updated successfully');
        onSuccess();
      } else {
        const message = data.error || 'Failed to update data source';
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

  const isFormDisabled =
    isTestingConnection ||
    !selectedEnvironment ||
    isSubmitting ||
    !dbType?.properties?.every((prop) => propertyValues?.[prop.type]);

  if (!selectedDataSource) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-4">
          <div className="flex gap-2 mb-6 items-end">
            <div className="min-w-[160px] flex-1">
              <label className="mb-3 block text-sm font-medium text-secondary">Data source</label>
              <BaseSelect
                value={dbType}
                onChange={(value) => {
                  if ((value as DataSourceOption).status !== 'available') {
                    return;
                  }

                  const newDbType = value as DataSourceOption;
                  setDbType(newDbType);
                  setError(null);
                  setTestResult(null);
                  setPropertyValues({});
                }}
                options={availableDataSourceOptions}
                width="100%"
                minWidth="100%"
                isSearchable={false}
                menuPlacement="bottom"
                components={{
                  MenuList: SelectDatabaseTypeOptions,
                  SingleValue: SingleValueWithTooltip,
                }}
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-3 block text-sm font-medium text-secondary">Environment</label>
            <BaseSelect
              value={selectedEnvironment}
              onChange={(value: EnvironmentOption | null) => {
                setSelectedEnvironment(value);
                setError(null);
                setTestResult(null);
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

          {dbType.value !== SAMPLE_DATABASE && (
            <>
              <div>
                <label className="mb-3 block text-sm font-medium text-secondary">Data Source Name</label>
                <input
                  type="text"
                  value={dbName}
                  onChange={(e) => setDbName(e.target.value)}
                  disabled={isSubmitting}
                  className={classNames(
                    'w-full px-4 py-2.5 bg-[#F5F5F5] dark:bg-gray-700 border rounded-lg',
                    'text-primary placeholder-tertiary text-base',
                    'border-[#E5E5E5] dark:border-[#1A1A1A] rounded-lg',
                    'focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500',
                    'transition-all duration-200',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                  placeholder="Enter data source name"
                />
              </div>

              {/* Dynamic property fields */}
              {dbType.properties && dbType.properties.length > 0 ? (
                dbType.properties.map((property: DataSourcePropertyDescriptor) => (
                  <div key={property.label}>
                    <label className="mb-3 block text-sm font-medium text-secondary">{property.label}</label>
                    <div className="relative">
                      <input
                        type={showSensitiveInput ? 'text' : 'password'}
                        value={propertyValues[property.type] || ''}
                        onChange={(e) => handlePropertyChange(property.type, e.target.value)}
                        disabled={isSubmitting}
                        className={classNames(
                          'w-full px-4 py-2.5 pr-12 bg-[#F5F5F5] dark:bg-gray-700 border rounded-lg',
                          'text-primary placeholder-tertiary text-base',
                          'border-[#E5E5E5] dark:border-[#1A1A1A] rounded-lg',
                          'focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500',
                          'transition-all duration-200',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                        )}
                        placeholder={property.format}
                      />

                      <button
                        type="button"
                        onClick={() => setShowSensitiveInput((prev) => !prev)}
                        disabled={false}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#4b4f5a] rounded group disabled:opacity-50"
                        tabIndex={-1}
                      >
                        <span className="text-gray-400 group-hover:text-white transition-colors">
                          {showSensitiveInput ? (
                            <EyeSlash variant="Bold" size={20} />
                          ) : (
                            <Eye variant="Bold" size={20} />
                          )}
                        </span>
                      </button>
                    </div>
                    <label className="mb-3 block !text-[13px] text-secondary mt-2">e.g. {property.format}</label>
                  </div>
                ))
              ) : (
                <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      No configuration properties available for this data source type.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {dbType.value === SAMPLE_DATABASE && (
            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-500" />
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
                <XCircle className="w-5 h-5 text-red-500" />
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
                <div className={`w-5 h-5 ${testResult.success ? 'text-green-500' : 'text-red-500'}`}>
                  {testResult.success ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>
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

        <div>
          <ResourceAccessMembers
            resourceScope="DATA_SOURCE"
            resourceId={selectedDataSource.dataSource.id}
            onInvite={onInvite}
          />
        </div>

        <div className="pt-4 border-t border-[#E5E5E5] dark:border-[#1A1A1A]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {dbType.value !== SAMPLE_DATABASE && (
                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    await handleTestConnection();
                  }}
                  disabled={isFormDisabled}
                  className={classNames(
                    'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    'bg-blue-500 hover:bg-blue-600',
                    'text-gray-950 dark:text-gray-950',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  {isTestingConnection ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Plug className="w-4 h-4" />
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
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isFormDisabled}
                className={classNames(
                  'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  'bg-accent-500 hover:bg-accent-600',
                  'text-gray-950 dark:text-gray-950',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
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
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <h3 className="text-lg font-semibold text-primary">Confirm Save Changes</h3>
            </div>
            <p className="text-sm text-secondary mb-6">
              Are you sure you want to save these changes to the data source? This action will update the connection
              settings.
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
