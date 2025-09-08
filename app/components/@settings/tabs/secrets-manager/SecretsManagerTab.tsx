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
import { BaseSelect } from '~/components/ui/Select';
import { logger } from '~/utils/logger';
import { EnvironmentVariableType } from '@prisma/client';

interface EnvironmentVariablesResponse {
  success: boolean;
  environmentVariables: EnvironmentVariableWithDetails[];
}

interface EnvironmentsResponse {
  success: boolean;
  environments: EnvironmentWithRelations[];
}

interface EnvironmentOption {
  label: string;
  value: string;
  description?: string;
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
  const [environmentOptions, setEnvironmentOptions] = useState<EnvironmentOption[]>([]);
  const [isLoadingEnvironments, setIsLoadingEnvironments] = useState(true);
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
        setIsLoadingEnvironments(true);

        const response = await fetch('/api/environments');
        const data = (await response.json()) as EnvironmentsResponse;

        if (data.success) {
          setEnvironments(data.environments);

          // Transform environments to options
          const options: EnvironmentOption[] = [
            { label: 'All Environments', value: 'all', description: 'Global secrets from all environments' },
            ...data.environments.map((env) => ({
              label: env.name,
              value: env.id,
              description: env.description || undefined,
            })),
          ];
          setEnvironmentOptions(options);

          // Set "All" as default if environments are available
          if (data.environments.length > 0) {
            setSelectedEnvironmentId('all');
          }
        }
      } catch (error) {
        logger.error('Failed to load environments:', error);
        toast.error('Failed to load environments');
      } finally {
        setIsLoadingEnvironments(false);
      }
    };

    loadEnvironments();
  }, [setEnvironments]);

  const fetchEnvironmentVariables = async (showLoading = false) => {
    if (!selectedEnvironmentId) {
      return;
    }

    try {
      if (showLoading) {
        setLoading(true);
      }

      // We only show the GLOBAL environment variables (without the DATA_SOURCE environment variables)
      const response = await fetch(
        `/api/environment-variables?environmentId=${selectedEnvironmentId}&type=${EnvironmentVariableType.GLOBAL}`,
      );
      const data = (await response.json()) as EnvironmentVariablesResponse;

      if (data.success) {
        setEnvironmentVariables(data.environmentVariables);
      }
    } catch (error) {
      logger.error('Failed to load environment variables:', error);
      toast.error('Failed to load environment variables');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Load environment variables when environment changes
  useEffect(() => {
    if (!selectedEnvironmentId) {
      return;
    }

    fetchEnvironmentVariables(true);
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
              <p className="text-sm text-secondary">Manage your environment secrets</p>
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
          {environmentOptions.length > 0 && (
            <div className="mb-6">
              <label className="mb-3 block text-sm font-medium text-secondary">Environment</label>
              <BaseSelect
                value={environmentOptions.find((opt) => opt.value === selectedEnvironmentId) || null}
                onChange={(value: EnvironmentOption | null) => {
                  if (value) {
                    handleEnvironmentChange(value.value);
                  }
                }}
                options={environmentOptions}
                placeholder={isLoadingEnvironments ? 'Loading environments...' : 'Select environment'}
                isDisabled={isLoadingEnvironments}
                width="100%"
                minWidth="100%"
                isSearchable={false}
                menuPlacement={'bottom'}
              />
              {environmentOptions.find((opt) => opt.value === selectedEnvironmentId)?.description && (
                <div className="text-gray-400 text-sm mt-2">
                  {environmentOptions.find((opt) => opt.value === selectedEnvironmentId)?.description}
                </div>
              )}
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
                <p className="text-sm text-secondary">Add a new environment secret</p>
              </div>
            </div>
          </div>
          <AddSecretForm
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            onSuccess={async () => {
              await fetchEnvironmentVariables();
              handleBack();
            }}
            selectedEnvironmentId={selectedEnvironmentId === 'all' ? environments[0].id : selectedEnvironmentId}
            availableEnvironments={environments}
          />
        </div>
      )}

      {/* Edit Form */}
      {showEditForm && selectedEnvironmentVariable && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setShowEditForm(false);
                  setSelectedEnvironmentVariable(null);
                }}
                className={classNames(
                  'inline-flex items-center gap-2 p-2 text-sm font-medium rounded-lg transition-colors',
                  'dark:bg-gray-900 dark:text-gray-300',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                )}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-lg font-medium text-primary">Edit Secret</h2>
                <p className="text-sm text-secondary">Update the environment secret</p>
              </div>
            </div>
          </div>

          <EditSecretForm
            environmentVariable={selectedEnvironmentVariable}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            availableEnvironments={environments}
            onSuccess={async () => {
              await fetchEnvironmentVariables();
              setShowEditForm(false);
              setSelectedEnvironmentVariable(null);
            }}
            onDelete={async () => {
              await fetchEnvironmentVariables();
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
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{environmentVariable.key}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {environmentVariable.environment.name}
                        {environmentVariable.type === 'DATA_SOURCE' && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            Data Source
                          </span>
                        )}
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
              <p className="text-gray-500 dark:text-gray-400 mb-4">No secrets have been created yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
