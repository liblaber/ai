import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, Lock, Plus } from 'lucide-react';
import AddSecretForm from './forms/AddSecretForm';
import EditSecretForm from './forms/EditSecretForm';
import { classNames } from '~/utils/classNames';
import { toast } from 'sonner';
import type { EnvironmentVariableWithDetails } from '~/lib/stores/environmentVariables';
import { useEnvironmentVariablesStore } from '~/lib/stores/environmentVariables';
import { useEnvironmentsStore } from '~/lib/stores/environments';
import { settingsPanelStore, useSettingsStore } from '~/lib/stores/settings';
import { useStore } from '@nanostores/react';
import type { EnvironmentWithRelations } from '~/lib/services/environmentService';

interface EnvironmentVariablesResponse {
  success: boolean;
  environmentVariables: EnvironmentVariableWithDetails[];
}

interface EnvironmentsResponse {
  success: boolean;
  environments: EnvironmentWithRelations[];
}

export default function SecretsManagerTab() {
  const { showAddForm } = useStore(settingsPanelStore);
  const [showAddFormLocal, setShowAddFormLocal] = useState(showAddForm);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedEnvironmentVariable, setSelectedEnvironmentVariable] = useState<EnvironmentVariableWithDetails | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string>('');
  const { environmentVariables, setEnvironmentVariables, setLoading } = useEnvironmentVariablesStore();
  const { environments, setEnvironments } = useEnvironmentsStore();
  const { selectedTab } = useSettingsStore();

  // Update local state when store changes
  useEffect(() => {
    setShowAddFormLocal(showAddForm);
  }, [showAddForm]);

  // Show add form when opened from chat
  useEffect(() => {
    if (selectedTab === 'secrets-manager') {
      setShowAddFormLocal(true);
    }
  }, [selectedTab]);

  // Load environments on mount
  useEffect(() => {
    const loadEnvironments = async () => {
      try {
        const response = await fetch('/api/environments');
        const data = (await response.json()) as EnvironmentsResponse;

        if (data.success) {
          setEnvironments(data.environments);

          // Set "All" as default if environments are available
          if (data.environments.length > 0) {
            setSelectedEnvironmentId('all');
          }
        }
      } catch (error) {
        console.error('Failed to load environments:', error);
        toast.error('Failed to load environments');
      }
    };

    loadEnvironments();
  }, [setEnvironments]);

  // Load environment variables when environment changes
  useEffect(() => {
    if (!selectedEnvironmentId) {
      return;
    }

    const loadEnvironmentVariables = async () => {
      console.log('loading environment variables');

      try {
        setLoading(true);

        // Use the single API call with "all" parameter support
        const response = await fetch(`/api/environment-variables?environmentId=${selectedEnvironmentId}`);
        const data = (await response.json()) as EnvironmentVariablesResponse;

        if (data.success) {
          setEnvironmentVariables(data.environmentVariables);
        }

        // Reset show values map when environment variables change
      } catch (error) {
        console.error('Failed to load environment variables:', error);
        toast.error('Failed to load environment variables');
      } finally {
        setLoading(false);
      }
    };

    loadEnvironmentVariables();
  }, [selectedEnvironmentId, setEnvironmentVariables, setLoading]);

  const handleEnvironmentChange = (environmentId: string) => {
    setSelectedEnvironmentId(environmentId);
  };

  const handleBack = () => {
    setShowAddFormLocal(false);
    setShowEditForm(false);
    setSelectedEnvironmentVariable(null);
  };

  const handleAdd = () => {
    setShowAddFormLocal(true);
    setShowEditForm(false);
    setSelectedEnvironmentVariable(null);
  };

  return (
    <div className="space-y-6">
      {!showEditForm && !showAddFormLocal && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-primary">Secrets Manager</h2>
              <p className="text-sm text-secondary">Manage your environment variables and secrets</p>
            </div>
            <button
              onClick={handleAdd}
              className={classNames(
                'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                'bg-accent-500 hover:bg-accent-600',
                'text-gray-950 dark:text-gray-950',
              )}
            >
              <Plus className="w-4 h-4" />
              <span>Add Secret</span>
            </button>
          </div>

          {/* Environment Selector */}
          {environments.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Environment:</label>
              <select
                value={selectedEnvironmentId}
                onChange={(e) => handleEnvironmentChange(e.target.value)}
                className={classNames(
                  'px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
                  'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
                  'focus:ring-2 focus:ring-accent-500 focus:border-transparent',
                )}
              >
                <option value="all">All</option>
                {environments.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {showAddFormLocal && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className={classNames(
                  'inline-flex items-center gap-2 p-2 text-sm font-medium rounded-lg transition-colors',
                  'dark:bg-gray-900 dark:text-gray-300',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                )}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-lg font-medium text-primary">Create Secret</h2>
                <p className="text-sm text-secondary">Add a new environment variable</p>
              </div>
            </div>
          </div>
          <AddSecretForm
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            onSuccess={() => {
              const reloadResponse = fetch(`/api/environment-variables?environmentId=${selectedEnvironmentId}`);
              reloadResponse
                .then((response) => response.json())
                .then((data: unknown) => {
                  const typedData = data as EnvironmentVariablesResponse;

                  if (typedData.success) {
                    setEnvironmentVariables(typedData.environmentVariables);
                  }
                })
                .catch((error) => console.error('Failed to reload environment variables after add:', error));

              handleBack();
            }}
            selectedEnvironmentId={selectedEnvironmentId === 'all' ? environments[0].id : selectedEnvironmentId}
            availableEnvironments={environments}
          />
        </div>
      )}

      {/* Edit Form */}
      {showEditForm && selectedEnvironmentVariable && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-primary">Edit Secret</h2>
              <p className="text-sm text-secondary">Update the environment variable configuration</p>
            </div>
            <button
              onClick={() => {
                setShowEditForm(false);
                setSelectedEnvironmentVariable(null);
              }}
              className={classNames(
                'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700',
                'text-gray-700 dark:text-gray-300',
              )}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>

          <EditSecretForm
            environmentVariable={selectedEnvironmentVariable}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            onSuccess={() => {
              // Reload environment variables using the single API call
              const reloadResponse = fetch(`/api/environment-variables?environmentId=${selectedEnvironmentId}`);
              reloadResponse
                .then((response) => response.json())
                .then((data: unknown) => {
                  const typedData = data as EnvironmentVariablesResponse;

                  if (typedData.success) {
                    setEnvironmentVariables(typedData.environmentVariables);
                  }
                })
                .catch((error) => console.error('Failed to reload environment variables after edit:', error));

              setShowEditForm(false);
              setSelectedEnvironmentVariable(null);
            }}
            onDelete={() => {
              // Reload environment variables using the single API call
              const reloadResponse = fetch(`/api/environment-variables?environmentId=${selectedEnvironmentId}`);
              reloadResponse
                .then((response) => response.json())
                .then((data: unknown) => {
                  const typedData = data as EnvironmentVariablesResponse;

                  if (typedData.success) {
                    setEnvironmentVariables(typedData.environmentVariables);
                  }
                })
                .catch((error) => console.error('Failed to reload environment variables after delete:', error));

              setShowEditForm(false);
              setSelectedEnvironmentVariable(null);
            }}
          />
        </div>
      )}

      {!showEditForm && !showAddFormLocal && (
        <div className="space-y-4">
          {/* Environment Variables List */}
          {environmentVariables.length > 0 ? (
            <div className="space-y-2">
              {environmentVariables.map((environmentVariable) => (
                <div
                  key={environmentVariable.id}
                  className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedEnvironmentVariable(environmentVariable);
                    setShowEditForm(true);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-accent-500 rounded-full" />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{environmentVariable.key}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {environmentVariable.environment.name}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No secrets found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {selectedEnvironmentId === 'all'
                  ? 'No environment variables have been created yet.'
                  : 'No environment variables found in this environment.'}
              </p>
              <button
                onClick={() => setShowAddFormLocal(true)}
                className={classNames(
                  'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  'bg-accent-500 hover:bg-accent-600',
                  'text-gray-950 dark:text-gray-950',
                )}
              >
                <Plus className="w-4 h-4" />
                <span>Add Your First Secret</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
