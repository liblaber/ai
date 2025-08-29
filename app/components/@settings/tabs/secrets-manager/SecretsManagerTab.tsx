import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, ChevronRight, Eye, EyeOff, Lock, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogClose, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedEnvironmentVariable, setSelectedEnvironmentVariable] = useState<EnvironmentVariableWithDetails | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValuesMap, setShowValuesMap] = useState<Record<string, boolean>>({});
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

        console.log({ data });

        if (data.success) {
          setEnvironmentVariables(data.environmentVariables);
        }

        // Reset show values map when environment variables change
        setShowValuesMap({});
      } catch (error) {
        console.error('Failed to load environment variables:', error);
        toast.error('Failed to load environment variables');
      } finally {
        setLoading(false);
      }
    };

    loadEnvironmentVariables();
  }, [selectedEnvironmentId, setEnvironmentVariables, setLoading]);

  const handleDelete = async () => {
    if (!selectedEnvironmentVariable) {
      return;
    }

    try {
      const response = await fetch(`/api/environment-variables/${selectedEnvironmentVariable.id}`, {
        method: 'DELETE',
      });

      const data = (await response.json()) as { success: boolean; error?: string };

      if (data.success) {
        toast.success('Secret deleted successfully');

        // Reload environment variables
        const reloadResponse = await fetch(
          `/api/environment-variables?environmentId=${selectedEnvironmentVariable.environmentId}`,
        );
        const reloadData = (await reloadResponse.json()) as EnvironmentVariablesResponse;

        if (reloadData.success) {
          setEnvironmentVariables(reloadData.environmentVariables);
        }

        setShowDeleteConfirm(false);
        setShowEditForm(false);
        setSelectedEnvironmentVariable(null);
      } else {
        toast.error(data.error || 'Failed to delete secret');
      }
    } catch (error) {
      console.error('Failed to delete secret:', error);
      toast.error('Failed to delete secret');
    }
  };

  const handleEdit = (environmentVariable: EnvironmentVariableWithDetails) => {
    setSelectedEnvironmentVariable(environmentVariable);
    setShowEditForm(true);
    setShowAddFormLocal(false);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleBack = () => {
    setShowEditForm(false);
    setShowAddFormLocal(false);
    setSelectedEnvironmentVariable(null);
  };

  const handleAdd = () => {
    setShowAddFormLocal(true);
    setShowEditForm(false);
    setSelectedEnvironmentVariable(null);
  };

  const toggleShowValues = (environmentVariableId: string) => {
    setShowValuesMap((prev) => ({
      ...prev,
      [environmentVariableId]: !prev[environmentVariableId],
    }));
  };

  const handleEnvironmentChange = (environmentId: string) => {
    setSelectedEnvironmentId(environmentId);
  };

  console.log({ environmentVariables });

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

      {showEditForm && selectedEnvironmentVariable && (
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
                <h2 className="text-lg font-medium text-primary">Edit Secret</h2>
                <p className="text-sm text-secondary">Modify your environment variable settings</p>
              </div>
            </div>
          </div>
          <EditSecretForm
            selectedSecret={selectedEnvironmentVariable}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            onSuccess={() => {
              // Reload environment variables
              const reloadResponse = fetch(
                `/api/environment-variables?environmentId=${selectedEnvironmentVariable.environmentId}`,
              );
              reloadResponse
                .then((response) => response.json())
                .then((data: unknown) => {
                  const typedData = data as EnvironmentVariablesResponse;

                  if (typedData.success) {
                    setEnvironmentVariables(typedData.environmentVariables);
                  }
                })
                .catch((error) => console.error('Failed to reload environment variables after edit:', error));
              handleBack();
            }}
            onDelete={handleDeleteClick}
          />
        </div>
      )}

      {!showEditForm && !showAddFormLocal && (
        <div className="space-y-4">
          {environmentVariables.length === 0 ? (
            <div className="text-center py-12">
              <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Secrets</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Get started by adding your first environment variable.
              </p>
            </div>
          ) : (
            environmentVariables.map((environmentVariable) => (
              <motion.div
                key={environmentVariable.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-accent-500" />
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{environmentVariable.key}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {environmentVariable.type} • {environmentVariable.environment.name}
                        </p>
                        {environmentVariable.description && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {environmentVariable.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleEdit(environmentVariable)}
                      className={classNames(
                        'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                        'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700',
                        'text-gray-700 dark:text-gray-300',
                      )}
                    >
                      <span>Edit</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Value Display */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Value</label>
                    <div className="relative">
                      <input
                        type={showValuesMap[environmentVariable.id] ? 'text' : 'password'}
                        value={environmentVariable.value}
                        readOnly
                        className={classNames(
                          'w-full px-4 py-2.5 pr-12 bg-[#F5F5F5] dark:bg-gray-700 border rounded-lg',
                          'text-primary border-[#E5E5E5] dark:border-[#1A1A1A]',
                          'cursor-default',
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowValues(environmentVariable.id)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#4b4f5a] rounded group"
                        tabIndex={-1}
                      >
                        <span className="text-gray-400 group-hover:text-white transition-colors">
                          {showValuesMap[environmentVariable.id] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      <DialogRoot open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <Dialog>
          <div className="rounded-xl bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#F5F5F5] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#1A1A1A]">
                    <Trash2 className="w-5 h-5 text-tertiary" />
                  </div>
                  <div>
                    <DialogTitle title="Delete Secret" />
                    <p className="text-sm text-secondary">This action cannot be undone</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-secondary">
                  Are you sure you want to delete the secret "{selectedEnvironmentVariable?.key}"? This will remove the
                  environment variable and cannot be undone.
                </p>

                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <div className="text-sm">
                      <p className="text-amber-600 dark:text-amber-400 font-medium">
                        Warning: This will affect all applications using this environment variable!
                      </p>
                      <p className="text-amber-600 dark:text-amber-400 mt-1">
                        Any applications or data sources that depend on this secret may stop working.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-[#E5E5E5] dark:border-[#1A1A1A]">
                <DialogClose asChild>
                  <button
                    className={classNames(
                      'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                      'bg-[#F5F5F5] hover:bg-[#E5E5E5]',
                      'dark:bg-[#1A1A1A] dark:hover:bg-[#2A2A2A]',
                      'text-primary',
                    )}
                  >
                    Cancel
                  </button>
                </DialogClose>
                <button
                  onClick={handleDelete}
                  className={classNames(
                    'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    'bg-red-500 hover:bg-red-600',
                    'text-white',
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      </DialogRoot>
    </div>
  );
}
