import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Edit, Globe, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogClose, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import AddEnvironmentForm from './forms/AddEnvironmentForm';
import EditEnvironmentForm from './forms/EditEnvironmentForm';
import ResourceAccessInvite from '~/components/@settings/shared/components/ResourceAccessInvite';
import { classNames } from '~/utils/classNames';
import { toast } from 'sonner';
import { useEnvironmentsStore } from '~/lib/stores/environments';
import { settingsPanelStore, useSettingsStore } from '~/lib/stores/settings';
import { useStore } from '@nanostores/react';
import type { EnvironmentWithRelations } from '~/lib/services/environmentService';
import { logger } from '~/utils/logger';

interface EnvironmentsResponse {
  success: boolean;
  environments: EnvironmentWithRelations[];
}

export default function EnvironmentsTab() {
  const { showAddForm } = useStore(settingsPanelStore);
  const [showAddFormLocal, setShowAddFormLocal] = useState(showAddForm);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState<EnvironmentWithRelations | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { environments, setEnvironments } = useEnvironmentsStore();
  const { selectedTab } = useSettingsStore();

  // Update local state when store changes
  useEffect(() => {
    setShowAddFormLocal(showAddForm);
  }, [showAddForm]);

  // Show add form when opened from chat
  useEffect(() => {
    if (selectedTab === 'environments') {
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
        }
      } catch (error) {
        console.error('Failed to load environments:', error);
      }
    };

    loadEnvironments();
  }, [setEnvironments]);

  const handleDelete = async () => {
    if (!selectedEnvironment) {
      return;
    }

    try {
      const response = await fetch(`/api/environments/${selectedEnvironment.id}`, {
        method: 'DELETE',
      });

      const data = (await response.json()) as { success: boolean; error?: string };

      if (data.success) {
        toast.success('Environment deleted successfully');

        // Reload environments
        const reloadResponse = await fetch('/api/environments');
        const reloadData = (await reloadResponse.json()) as EnvironmentsResponse;

        if (reloadData.success) {
          setEnvironments(reloadData.environments);
        }

        setShowDeleteConfirm(false);
        setShowEditForm(false);
        setSelectedEnvironment(null);
      } else {
        toast.error(data.error || 'Failed to delete environment');
      }
    } catch (error) {
      logger.error('Failed to load environments:', JSON.stringify(error));
      toast.error('Failed to delete environment');
    }
  };

  const handleEdit = (environment: EnvironmentWithRelations) => {
    setSelectedEnvironment(environment);
    setShowEditForm(true);
    setShowAddFormLocal(false);
  };

  const handleDeleteClick = (environment: EnvironmentWithRelations) => {
    setSelectedEnvironment(environment);
    setShowDeleteConfirm(true);
  };

  const handleBack = () => {
    setShowEditForm(false);
    setShowAddFormLocal(false);
    setSelectedEnvironment(null);
  };

  const handleAdd = () => {
    setShowAddFormLocal(true);
    setShowEditForm(false);
    setSelectedEnvironment(null);
  };

  if (showAddFormLocal) {
    return (
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
              <h2 className="text-lg font-medium text-primary">Create Environment</h2>
              <p className="text-sm text-secondary">Add a new environment</p>
            </div>
          </div>
        </div>
        <AddEnvironmentForm
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
          onSuccess={() => {
            // Reload environments
            const reloadResponse = fetch('/api/environments');
            reloadResponse
              .then((response) => response.json())
              .then((data: unknown) => {
                const typedData = data as EnvironmentsResponse;

                if (typedData.success) {
                  setEnvironments(typedData.environments);
                }
              })
              .catch((error) => console.error('Failed to reload environments after add:', error));
            handleBack();
          }}
        />
      </div>
    );
  }

  if (showEditForm && selectedEnvironment) {
    return (
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
              <h2 className="text-lg font-medium text-primary">Edit Environment</h2>
              <p className="text-sm text-secondary">Modify your environment settings</p>
            </div>
          </div>
        </div>
        <EditEnvironmentForm
          environment={selectedEnvironment}
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
          onSuccess={() => {
            // Reload environments
            const reloadResponse = fetch('/api/environments');
            reloadResponse
              .then((response) => response.json())
              .then((data: unknown) => {
                const typedData = data as EnvironmentsResponse;

                if (typedData.success) {
                  setEnvironments(typedData.environments);
                }
              })
              .catch((error) => console.error('Failed to reload environments after edit:', error));
            handleBack();
          }}
          onDelete={() => handleDeleteClick(selectedEnvironment)}
          onInvite={() => {
            setShowEditForm(false);
            setShowInviteForm(true);
          }}
        />
      </div>
    );
  }

  if (showInviteForm && selectedEnvironment) {
    return (
      <ResourceAccessInvite
        resourceScope="ENVIRONMENT"
        resource={selectedEnvironment}
        onBack={() => {
          setShowEditForm(true);
          setShowInviteForm(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-primary">Environments</h2>
          <p className="text-sm text-secondary">Manage your environments</p>
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
          <span>Add Environment</span>
        </button>
      </div>

      <div className="space-y-4">
        {environments.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Environments</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Get started by adding your first environment.
            </p>
          </div>
        ) : (
          environments.map((environment) => (
            <motion.div
              key={environment.id}
              className="border-b border-gray-200 dark:border-gray-700"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-full flex items-center justify-between p-4">
                <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => handleEdit(environment)}>
                  <Globe className="w-5 h-5 text-accent-500" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{environment.name}</h4>
                    {environment.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{environment.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(environment)}
                    className={classNames(
                      'inline-flex items-center gap-2 p-2 text-sm font-medium rounded-lg transition-colors',
                      'text-gray-500 hover:text-accent-500',
                      'hover:bg-accent-50 dark:hover:bg-accent-950/20',
                    )}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(environment)}
                    className={classNames(
                      'inline-flex items-center gap-2 p-2 text-sm font-medium rounded-lg transition-colors',
                      'text-gray-500 hover:text-red-500',
                      'hover:bg-red-50 dark:hover:bg-red-950/20',
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

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
                    <DialogTitle title="Delete Environment" />
                    <p className="text-sm text-secondary">This action cannot be undone</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-secondary">
                  Are you sure you want to delete the environment "{selectedEnvironment?.name}"? This will remove all
                  associated data and cannot be undone.
                </p>

                {selectedEnvironment?.dataSources && selectedEnvironment.dataSources.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      <div className="text-sm">
                        <p className="text-amber-600 dark:text-amber-400 font-medium">
                          Warning: This environment has {selectedEnvironment.dataSources.length} data source
                          {selectedEnvironment.dataSources.length === 1 ? '' : 's'}!
                        </p>
                        <p className="text-amber-600 dark:text-amber-500 mt-1">
                          All data sources and associated conversations will be permanently deleted.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
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
