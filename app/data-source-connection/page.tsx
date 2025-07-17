'use client';

import { useState } from 'react';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Label } from '~/components/ui/Label';
import { BaseSelect } from '~/components/ui/Select';
import { SelectDatabaseTypeOptions, SingleValueWithTooltip } from '~/components/database/SelectDatabaseTypeOptions';
import { useDataSourceActions, useDataSourcesStore } from '~/lib/stores/dataSources';
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

export default function DataSourceConnectionPage() {
  const [dbType, setDbType] = useState<DataSourceOption>(DEFAULT_DATA_SOURCES[0]);
  const [dbName, setDbName] = useState('');
  const [connStr, setConnStr] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setSelectedDataSourceId } = useDataSourcesStore();
  const { refetchDataSources } = useDataSourceActions();
  const router = useRouter();

  const { availableDataSourceOptions } = useDataSourceTypesPlugin();

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setError(null);

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

      const response = await fetch('/api/data-sources', {
        method: 'POST',
        body: formData,
      });

      const result = (await response.json()) as ApiResponse;

      if (result.success && result.dataSource) {
        setIsSuccess(true);
        refetchDataSources();
        setSelectedDataSourceId(result.dataSource.id);
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

    try {
      const response = await fetch('/api/data-sources/example', {
        method: 'POST',
      });

      const result = (await response.json()) as ApiResponse;

      if (result.success && result.dataSource) {
        setIsSuccess(true);
        refetchDataSources();
        setSelectedDataSourceId(result.dataSource.id);
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
    <div className="flex flex-col h-full w-full bg-liblab-elements-bg-depth-1">
      <Header showMenuIcon={false} />
      <div className="h-full bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-[620px] h-[560px]">
          <h1 className="text-2xl text-liblab-elements-textPrimary mb-6 text-center">Let's connect your data source</h1>
          <div className="mb-6">
            <p className="text-center text-base font-light text-liblab-elements-textPrimary">
              Continue with a sample database or connect your own database. More options, such as MongoDB and Github are
              coming soon!
            </p>
          </div>
          <div className="flex gap-2 mb-6 items-end">
            <div className="min-w-[160px] flex-1">
              <Label className="mb-3 block text-gray-300">Data source</Label>
              <BaseSelect
                value={dbType}
                onChange={(value: DataSourceOption) => {
                  if (value.status !== 'available') {
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
                disabled={!dbName || !connStr || isTesting || isSuccess}
              >
                {isSuccess ? (
                  <div className="flex items-center gap-2">
                    <span className="i-ph:check-circle-fill text-lg" />
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
                  <span className="i-ph:lock-fill text-lg text-gray-400 !text-[var(--liblab-elements-textPrimary)]" />
                  <span className="font-medium text-[var(--liblab-elements-textPrimary)] text-sm">
                    100% Secure & Encrypted
                  </span>
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
                disabled={isSuccess}
              >
                {isSuccess ? (
                  <div className="flex items-center gap-2">
                    <span className="i-ph:check-circle-fill text-lg" />
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
