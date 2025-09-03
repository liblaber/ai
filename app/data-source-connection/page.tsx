'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Lock } from 'lucide-react';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Label } from '~/components/ui/Label';
import { BaseSelect } from '~/components/ui/Select';
import { SelectDatabaseTypeOptions, SingleValueWithTooltip } from '~/components/database/SelectDatabaseTypeOptions';
import { useDataSourceActions, useEnvironmentDataSourcesStore } from '~/lib/stores/environmentDataSources';
import { useRouter } from 'next/navigation';
import { Header } from '~/components/header/Header';
import {
  type DataSourceOption,
  DEFAULT_DATA_SOURCES,
  SAMPLE_DATABASE,
  useDataSourceTypesPlugin,
} from '~/lib/hooks/plugins/useDataSourceTypesPlugin';

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  dataSource?: {
    id: string;
  };
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

export default function DataSourceConnectionPage() {
  const [dbType, setDbType] = useState<DataSourceOption>(DEFAULT_DATA_SOURCES[0]);
  const [dbName, setDbName] = useState('');
  const [connStr, setConnStr] = useState('');
  const [selectedEnvironment, setSelectedEnvironment] = useState<EnvironmentOption | null>(null);
  const [environmentOptions, setEnvironmentOptions] = useState<EnvironmentOption[]>([]);
  const [isLoadingEnvironments, setIsLoadingEnvironments] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setSelectedEnvironmentDataSource } = useEnvironmentDataSourcesStore();
  const { refetchEnvironmentDataSources } = useDataSourceActions();
  const router = useRouter();

  const { availableDataSourceOptions } = useDataSourceTypesPlugin();

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
            description: env.description,
          }));
          setEnvironmentOptions(options);

          // Auto-select first environment if available
          if (options.length > 0) {
            setSelectedEnvironment(options[0]);
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setError(null);

    if (!selectedEnvironment) {
      setError('Please select an environment');
      return;
    }

    if (!dbName) {
      setError('Please enter a database name');
      return;
    }

    if (!connStr) {
      setError('Please enter a connection string');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', dbName);
      formData.append('connectionString', connStr);

      const response = await fetch('/api/data-sources/testing', {
        method: 'POST',
        body: formData,
      });

      const result = (await response.json()) as ApiResponse;

      if (result.success) {
        await handleAddDataSource();
      } else {
        setError(result.message || result.error || 'Failed to connect to database');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsTesting(false);
    }
  };

  const handleAddDataSource = async () => {
    try {
      setError(null);

      const formData = new FormData();
      formData.append('name', dbName);
      formData.append('connectionString', connStr);
      formData.append('environmentId', selectedEnvironment!.value);

      const response = await fetch('/api/data-sources', {
        method: 'POST',
        body: formData,
      });

      const result = (await response.json()) as ApiResponse;

      if (result.success && result.dataSource) {
        setIsSuccess(true);
        refetchEnvironmentDataSources();
        setSelectedEnvironmentDataSource(result.dataSource.id, selectedEnvironment!.value);
        setTimeout(() => {
          router.push('/');
        }, 1000);
      } else {
        setError(result.error || 'Failed to create data source');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  };

  const handleSampleDatabase = async () => {
    setError(null);
    setIsConnecting(true);

    if (!selectedEnvironment) {
      setError('Please select an environment');
      setIsConnecting(false);

      return;
    }

    try {
      const response = await fetch(`/api/data-sources/example?environmentId=${selectedEnvironment.value}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          environmentId: selectedEnvironment.value,
        }),
      });

      const result = (await response.json()) as ApiResponse;

      if (result.success && result.dataSource) {
        setIsSuccess(true);
        refetchEnvironmentDataSources();
        setSelectedEnvironmentDataSource(result.dataSource.id, selectedEnvironment!.value);
        setTimeout(() => {
          router.push('/');
        }, 1000);
      } else {
        setError('Failed to connect sample data source.');
      }
    } catch {
      setError('Failed to connect sample data source.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-depth-1">
      <Header showMenuIcon={false} />
      <div className="h-full bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-[620px] h-[560px]">
          <h1 className="text-2xl text-primary mb-6 text-center">Let's connect your data source</h1>
          <div className="mb-6">
            <p className="text-center text-base font-light text-primary">
              Continue with a sample database or connect your own database. More options, such as Github and other
              integrations are coming soon!
            </p>
          </div>
          <div className="flex gap-2 mb-6 items-end">
            <div className="min-w-[160px] flex-1">
              <Label className="mb-3 block text-gray-300">Data source</Label>
              <BaseSelect
                value={dbType}
                onChange={(value: DataSourceOption | null) => {
                  if (!value || value.status !== 'available') {
                    return;
                  }

                  setDbType(value);
                  setDbName('');
                  setConnStr('');
                  setError(null);
                }}
                options={availableDataSourceOptions}
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
          <div className="mb-6">
            <Label className="mb-3 block text-gray-300">Environment</Label>
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
          {dbType.value !== 'sample' && (
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-6">
              <div>
                <Label htmlFor="db-name" className="mb-3 block text-gray-300">
                  Database Name
                </Label>
                <Input
                  id="db-name"
                  type="text"
                  value={dbName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDbName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="conn-str" className="mb-3 block text-gray-300">
                  Connection String
                </Label>
                <Input
                  id="conn-str"
                  type="text"
                  value={connStr}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConnStr(e.target.value)}
                />
                <Label className="mb-3 block !text-[13px] text-gray-300 mt-2">
                  e.g. {dbType.value}://username:password@host:port/database
                </Label>
              </div>
              {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
              <Button
                type="submit"
                variant="primary"
                className={`min-w-[150px] max-w-[220px] transition-all duration-300 ${isSuccess ? 'bg-green-500 hover:bg-green-500 !disabled:opacity-100' : ''}`}
                disabled={!selectedEnvironment || !dbName || !connStr || isTesting || isSuccess}
              >
                {isSuccess ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Data Source Connected
                  </div>
                ) : isTesting ? (
                  'Testing...'
                ) : (
                  'Test & Continue'
                )}
              </Button>
              <div>
                <div className="border-b border-gray-700 mb-7" />
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-5 h-5 text-gray-400 !text-primary" />
                  <span className="font-medium text-primary text-sm">100% Secure & Encrypted</span>
                </div>
                <div className="text-gray-400 text-[13px] leading-snug">
                  Your company's data is protected through AES-256 encryption, HTTPS with TLS 1.2/1.3, and strict
                  network policies.
                </div>
              </div>
            </form>
          )}
          {dbType.value === SAMPLE_DATABASE && (
            <>
              {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
              <Button
                type="button"
                variant="primary"
                className={`min-w-[150px] transition-all duration-300 ${isSuccess ? 'bg-green-500 hover:bg-green-500 !disabled:opacity-100' : ''}`}
                onClick={handleSampleDatabase}
                disabled={!selectedEnvironment || isSuccess}
              >
                {isSuccess ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Data Source Connected
                  </div>
                ) : isConnecting ? (
                  'Connecting...'
                ) : (
                  'Connect'
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
