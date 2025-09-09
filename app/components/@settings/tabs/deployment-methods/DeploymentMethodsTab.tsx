import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, ChevronRight, Plus, Rocket, Trash2 } from 'lucide-react';
import { Dialog, DialogClose, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import AddDeploymentMethodForm from './forms/AddDeploymentMethodForm';
import EditDeploymentMethodForm from './forms/EditDeploymentMethodForm';
import { classNames } from '~/utils/classNames';
import { toast } from 'sonner';
import {
  type EnvironmentDeploymentMethod,
  useDeploymentMethodActions,
  useDeploymentMethodsStore,
} from '~/lib/stores/deploymentMethods';
import { settingsPanelStore, useSettingsStore } from '~/lib/stores/settings';
import { useStore } from '@nanostores/react';

export default function DeploymentMethodsTab() {
  const { showAddForm } = useStore(settingsPanelStore);
  const [showAddFormLocal, setShowAddFormLocal] = useState(showAddForm);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedEnvironmentDeploymentMethod, setSelectedEnvironmentDeploymentMethod] =
    useState<EnvironmentDeploymentMethod | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { environmentDeploymentMethods, setEnvironmentDeploymentMethods } = useDeploymentMethodsStore();
  const { loadDeploymentMethods } = useDeploymentMethodActions();
  const { selectedTab } = useSettingsStore();

  // Update local state when store changes
  useEffect(() => {
    setShowAddFormLocal(showAddForm);
  }, [showAddForm]);

  // Show add form when opened from chat
  useEffect(() => {
    if (selectedTab === 'deployment-methods') {
      setShowAddFormLocal(true);
    }
  }, [selectedTab]);

  // Deployment methods are loaded via DataLoader, no need to load them here

  const handleDelete = async () => {
    if (!selectedEnvironmentDeploymentMethod) {
      return;
    }

    const response = await fetch(
      `/api/deployment-methods/${selectedEnvironmentDeploymentMethod.id}?environmentId=${selectedEnvironmentDeploymentMethod.environmentId}`,
      {
        method: 'DELETE',
      },
    );

    const data = (await response.json()) as { success: boolean; error?: string };

    if (data.success) {
      toast.success('Deployment method deleted successfully');

      // Reload deployment methods
      await loadDeploymentMethods();

      setShowDeleteConfirm(false);
      setShowEditForm(false);
      setSelectedEnvironmentDeploymentMethod(null);
    } else {
      toast.error(data.error || 'Failed to delete deployment method');
    }
  };

  const handleEdit = (environmentDeploymentMethod: EnvironmentDeploymentMethod) => {
    setSelectedEnvironmentDeploymentMethod(environmentDeploymentMethod);
    setShowEditForm(true);
    setShowAddFormLocal(false);
  };

  const handleDeleteClick = async () => {
    if (!selectedEnvironmentDeploymentMethod) {
      return;
    }

    setShowDeleteConfirm(true);
  };

  const handleBack = () => {
    setShowEditForm(false);
    setShowAddFormLocal(false);
    setSelectedEnvironmentDeploymentMethod(null);
  };

  const handleAdd = () => {
    setShowAddFormLocal(true);
    setShowEditForm(false);
    setSelectedEnvironmentDeploymentMethod(null);
  };

  return (
    <div className="space-y-6">
      {!showEditForm && !showAddFormLocal && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-primary">Deployment Methods</h2>
            <p className="text-sm text-secondary">Manage your deployment method connections</p>
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
            <span>Add Deployment Method</span>
          </button>
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
                <h2 className="text-lg font-medium text-primary">Create Deployment Method</h2>
                <p className="text-sm text-secondary">Add a new deployment method connection</p>
              </div>
            </div>
          </div>
          <AddDeploymentMethodForm
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            onSuccess={async (responseData?: any) => {
              // If the API returned all deployment methods, use them directly
              if (responseData?.environmentDeploymentMethods) {
                setEnvironmentDeploymentMethods(responseData.environmentDeploymentMethods);
              } else {
                // Fallback: reload deployment methods
                await loadDeploymentMethods();
              }

              handleBack();
            }}
          />
        </div>
      )}

      {showEditForm && selectedEnvironmentDeploymentMethod && (
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
                <h2 className="text-lg font-medium text-primary">Edit Deployment Method</h2>
                <p className="text-sm text-secondary">Modify your deployment method connection settings</p>
              </div>
            </div>
          </div>

          <EditDeploymentMethodForm
            selectedDeploymentMethod={selectedEnvironmentDeploymentMethod}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            onSuccess={async () => {
              // Reload deployment methods
              await loadDeploymentMethods();
              handleBack();
            }}
            onDelete={handleDeleteClick}
          />
        </div>
      )}

      {!showEditForm && !showAddFormLocal && (
        <div className="space-y-4">
          {environmentDeploymentMethods.length === 0 ? (
            <div className="text-center py-12">
              <Rocket className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Deployment Methods</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Get started by adding your first deployment method.
              </p>
            </div>
          ) : (
            environmentDeploymentMethods.map((environmentDeploymentMethod) => (
              <motion.div
                key={`${environmentDeploymentMethod.environmentId}-${environmentDeploymentMethod.id}`}
                className="border-b border-gray-200 dark:border-gray-700"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleEdit(environmentDeploymentMethod)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleEdit(environmentDeploymentMethod);
                    }
                  }}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Rocket className="w-5 h-5 text-accent-500" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{environmentDeploymentMethod.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {environmentDeploymentMethod.provider} • {environmentDeploymentMethod.environment.name}
                      </p>
                    </div>
                  </div>
                  <div className={classNames('flex items-center gap-2 transition-transform duration-200')}>
                    <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
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
                    <DialogTitle title="Delete Deployment Method" />
                    <p className="text-sm text-secondary">This action cannot be undone</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-secondary">
                  Are you sure you want to delete the deployment method "{selectedEnvironmentDeploymentMethod?.name}"?
                  This will remove all associated data and cannot be undone.
                </p>

                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <div className="text-sm">
                      <p className="text-amber-600 dark:text-amber-400 font-medium">
                        Warning: This will permanently delete the deployment method!
                      </p>
                      <p className="text-amber-600 dark:text-amber-400 mt-1">
                        All deployment method data will be permanently deleted and cannot be recovered.
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
