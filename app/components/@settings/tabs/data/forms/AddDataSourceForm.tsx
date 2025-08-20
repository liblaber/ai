import { classNames } from '~/utils/classNames';
import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle, Loader2, Plug, Save, XCircle } from 'lucide-react';
import type { TestConnectionResponse } from '~/components/@settings/tabs/data/DataTab';
import { z } from 'zod';
import { BaseSelect } from '~/components/ui/Select';
import { SelectDatabaseTypeOptions, SingleValueWithTooltip } from '~/components/database/SelectDatabaseTypeOptions';
import {
  type DataSourceOption,
  DEFAULT_DATA_SOURCES,
  SAMPLE_DATABASE,
  useDataSourceTypesPlugin,
} from '~/lib/hooks/plugins/useDataSourceTypesPlugin';
import type { DataSourcePropertyDescriptor } from '@liblab/data-access/utils/types';
import { DataSourcePropertyType } from '~/lib/datasource';

interface DataSourceResponse {
  success: boolean;
  message?: string;
  error?: string;
  dataSource?: {
    id: string;
  };
}

const testConnectionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

interface AddDataSourceFormProps {
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
  onSuccess: () => void;
}

export default function AddDataSourceForm({ isSubmitting, setIsSubmitting, onSuccess }: AddDataSourceFormProps) {
  const [dbType, setDbType] = useState<DataSourceOption>(DEFAULT_DATA_SOURCES[0]);
  const [dbName, setDbName] = useState('');
  const [propertyValues, setPropertyValues] = useState<Record<string, string>>({});
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<DataSourceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { availableDataSourceOptions } = useDataSourceTypesPlugin();

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
        // If no properties are required, skip connection testing
        if (!dbType.properties || dbType.properties.length === 0) {
          setTestResult({
            success: true,
            message: 'No connection testing required for this data source type.',
          });
          return;
        }

        // Check if all required properties are filled
        const hasAllRequiredProperties = dbType.properties.every((prop) => {
          const value = propertyValues[prop.label];
          return value && value.trim() !== '';
        });

        if (!hasAllRequiredProperties) {
          setError('Please fill in all required fields');
          return;
        }

        const formData = new FormData();
        formData.append('type', dbType.type || dbType.value.toUpperCase());

        // Convert property values to DataSourceProperty format
        const properties = dbType.properties.map((prop) => ({
          type: prop.type,
          value: propertyValues[prop.label] || '',
        }));
        formData.append('properties', JSON.stringify(properties));

        const response = await fetch('/api/data-sources/testing', {
          method: 'POST',
          body: formData,
        });

        const responseText = await response.text();

        let data: TestConnectionResponse;

        try {
          const parsedResponse = JSON.parse(responseText);
          data = testConnectionResponseSchema.parse(parsedResponse);
        } catch (parseError) {
          console.error('Response validation error:', parseError);
          throw new Error(`Invalid response format: ${responseText.substring(0, 200)}...`);
        }
        setTestResult(data);

        if (!data.success) {
          setError(null);
        }
      }
    } catch (error) {
      setTestResult({
        success: false,
        message:
          error instanceof Error ? error.message : String(error) || 'Failed to test connection. Please try again.',
      });
      setError(null);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSampleDatabase = async () => {
    setError(null);
    setTestResult(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/data-sources/example', {
        method: 'POST',
      });

      const result = (await response.json()) as DataSourceResponse;

      if (result.success) {
        toast.success('Sample database connected successfully');
        onSuccess();
      } else {
        setError(result.error || 'Failed to connect Sample database.');
        setTestResult(null);
      }
    } catch {
      setError('Failed to connect Sample database.');
      setTestResult(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (dbType.value === SAMPLE_DATABASE) {
      await handleSampleDatabase();
      return;
    }

    if (!dbName) {
      setError('Please enter the data source name');
      setTestResult(null);

      return;
    }

    // Check if all required properties are filled
    const hasAllRequiredProperties =
      dbType.properties && dbType.properties.length > 0
        ? dbType.properties.every((prop) => {
            const value = propertyValues[prop.label];
            return value && value.trim() !== '';
          })
        : true; // If no properties, consider it valid

    if (!hasAllRequiredProperties) {
      setError('Please fill in all required fields');
      setTestResult(null);

      return;
    }

    setIsSubmitting(true);
    setError(null);
    setTestResult(null);

    try {
      const formData = new FormData();
      formData.append('name', dbName);
      formData.append('type', dbType.type || dbType.value.toUpperCase());

      // Convert property values to DataSourceProperty format
      const properties = dbType.properties.map((prop) => ({
        type: prop.type,
        value: propertyValues[prop.label] || '',
      }));
      formData.append('properties', JSON.stringify(properties));

      const response = await fetch('/api/data-sources', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json<DataSourceResponse>();

      if (data.success) {
        toast.success('Data source added successfully');
        onSuccess();
      } else {
        const message = data.error || 'Failed to add data source';
        toast.error(message);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error) || 'Failed to add data source. Please try again.';
      setError(message);
      setTestResult(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset property values when database type changes
  const handleDatabaseTypeChange = (value: DataSourceOption) => {
    setDbType(value);
    setError(null);
    setTestResult(null);
    setDbName('');
    setPropertyValues({});
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-4">
          <div className="flex gap-2 mb-6 items-end">
            <div className="min-w-[160px] flex-1">
              <label className="mb-3 block text-sm font-medium text-secondary">Data source</label>
              <BaseSelect
                value={dbType}
                onChange={(value) => handleDatabaseTypeChange(value as DataSourceOption)}
                options={availableDataSourceOptions}
                width="100%"
                menuPlacement={'bottom'}
                minWidth="100%"
                isSearchable={false}
                components={{
                  MenuList: SelectDatabaseTypeOptions,
                  SingleValue: SingleValueWithTooltip,
                }}
              />
            </div>
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
                    <input
                      type={property.type === DataSourcePropertyType.ACCESS_TOKEN ? 'password' : 'text'}
                      value={propertyValues[property.label] || ''}
                      onChange={(e) => handlePropertyChange(property.label, e.target.value)}
                      disabled={isSubmitting}
                      className={classNames(
                        'w-full px-4 py-2.5 bg-[#F5F5F5] dark:bg-gray-700 border rounded-lg',
                        'text-primary placeholder-tertiary text-base',
                        'border-[#E5E5E5] dark:border-[#1A1A1A] rounded-lg',
                        'focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500',
                        'transition-all duration-200',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                      )}
                      placeholder={property.format}
                    />
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
                  disabled={
                    isTestingConnection ||
                    isSubmitting ||
                    (dbType.properties &&
                      dbType.properties.length > 0 &&
                      !dbType.properties.every(
                        (prop) => propertyValues[prop.label] && propertyValues[prop.label].trim() !== '',
                      ))
                  }
                  className={classNames(
                    'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    'bg-depth-1 bg-depth-1/50 ',
                    'text-primary',
                    'disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed',
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
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  (dbType.value !== SAMPLE_DATABASE &&
                    dbType.properties &&
                    dbType.properties.length > 0 &&
                    !dbType.properties.every(
                      (prop) => propertyValues[prop.label] && propertyValues[prop.label].trim() !== '',
                    ))
                }
                className={classNames(
                  'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  'bg-accent-500 hover:bg-accent-600',
                  'text-gray-950 dark:text-gray-950',
                  'disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed',
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Create</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
