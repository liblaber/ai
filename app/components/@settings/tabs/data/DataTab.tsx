import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, ChevronRight, Database, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogClose, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import AddDataSourceForm from './forms/AddDataSourceForm';
import EditDataSourceForm from './forms/EditDataSourceForm';
import AddResourceAccess from '~/components/@settings/shared/components/AddResourceAccess';
import { classNames } from '~/utils/classNames';
import { toast } from 'sonner';
import { type EnvironmentDataSource, useEnvironmentDataSourcesStore } from '~/lib/stores/environmentDataSources';
import { settingsPanelStore, useSettingsStore } from '~/lib/stores/settings';
import { useStore } from '@nanostores/react';

interface EnvironmentDataSourcesResponse {
  success: boolean;
  environmentDataSources: EnvironmentDataSource[];
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
}

export default function DataTab() {
  const { showAddForm } = useStore(settingsPanelStore);
  const [showAddFormLocal, setShowAddFormLocal] = useState(showAddForm);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAddAccessForm, setShowAddAccessForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedEnvironmentDataSource, setSelectedEnvironmentDataSource] = useState<EnvironmentDataSource | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conversationCount, setConversationCount] = useState<number>(0);
  const { environmentDataSources, setEnvironmentDataSources } = useEnvironmentDataSourcesStore();
  const { selectedTab } = useSettingsStore();

  // Update local state when store changes
  useEffect(() => {
    setShowAddFormLocal(showAddForm);
  }, [showAddForm]);

  // Show add form when opened from chat
  useEffect(() => {
    if (selectedTab === 'data') {
      setShowAddFormLocal(true);
    }
  }, [selectedTab]);

  // Load data sources on mount
  useEffect(() => {
    const loadDataSources = async () => {
      try {
        const response = await fetch('/api/data-sources');
        const data = (await response.json()) as EnvironmentDataSourcesResponse;

        if (data.success) {
          setEnvironmentDataSources(data.environmentDataSources);
        }
      } catch (error) {
        console.error('Failed to load data sources:', error);
      }
    };

    loadDataSources();
  }, [setEnvironmentDataSources]);

  const handleDelete = async () => {
    if (!selectedEnvironmentDataSource) {
      return;
    }

    const response = await fetch(
      `/api/data-sources/${selectedEnvironmentDataSource.dataSourceId}?environmentId=${selectedEnvironmentDataSource.environmentId}`,
      {
        method: 'DELETE',
      },
    );

    const data = (await response.json()) as { success: boolean; error?: string };

    if (data.success) {
      toast.success('Data source deleted successfully');

      // Reload data sources
      const reloadResponse = await fetch('/api/data-sources');
      const reloadData = (await reloadResponse.json()) as EnvironmentDataSourcesResponse;

      if (reloadData.success) {
        setEnvironmentDataSources(reloadData.environmentDataSources);
      }

      setShowDeleteConfirm(false);
      setShowEditForm(false);
      setSelectedEnvironmentDataSource(null);
    } else {
      toast.error(data.error || 'Failed to delete data source');
    }
  };

  const handleEdit = (environmentDataSource: EnvironmentDataSource) => {
    setSelectedEnvironmentDataSource(environmentDataSource);
    setShowEditForm(true);
    setShowAddFormLocal(false);
  };

  const handleDeleteClick = async () => {
    if (!selectedEnvironmentDataSource) {
      return;
    }

    try {
      const response = await fetch(
        `/api/data-sources/${selectedEnvironmentDataSource.dataSourceId}?environmentId=${selectedEnvironmentDataSource.environmentId}`,
      );
      const data = await response.json<{ success: boolean; conversationCount?: number }>();

      if (data.success) {
        setConversationCount(data.conversationCount || 0);
        setShowDeleteConfirm(true);
      } else {
        setConversationCount(0);
        setShowDeleteConfirm(true);
      }
    } catch (error) {
      console.error('Failed to fetch conversation count:', error);
      setConversationCount(0);
      setShowDeleteConfirm(true);
    }
  };

  const handleBack = () => {
    setShowEditForm(false);
    setShowAddFormLocal(false);
    setSelectedEnvironmentDataSource(null);
  };

  const handleAdd = () => {
    setShowAddFormLocal(true);
    setShowEditForm(false);
    setSelectedEnvironmentDataSource(null);
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
              <h2 className="text-lg font-medium text-primary">Create Data Source</h2>
              <p className="text-sm text-secondary">Add a new database connection</p>
            </div>
          </div>
        </div>
        <AddDataSourceForm
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
          onSuccess={() => {
            // Reload data sources
            const reloadResponse = fetch('/api/data-sources');
            reloadResponse
              .then((response) => response.json())
              .then((data: unknown) => {
                const typedData = data as EnvironmentDataSourcesResponse;

                if (typedData.success) {
                  setEnvironmentDataSources(typedData.environmentDataSources);
                }
              })
              .catch((error) => console.error('Failed to reload data sources after add:', error));
            handleBack();
          }}
        />
      </div>
    );
  }

  if (showEditForm && selectedEnvironmentDataSource) {
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
              <h2 className="text-lg font-medium text-primary">Edit Data Source</h2>
              <p className="text-sm text-secondary">Modify your database connection settings</p>
            </div>
          </div>
        </div>
        <EditDataSourceForm
          selectedDataSource={selectedEnvironmentDataSource}
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
          onSuccess={() => {
            // Reload data sources
            const reloadResponse = fetch('/api/data-sources');
            reloadResponse
              .then((response) => response.json())
              .then((data: unknown) => {
                const typedData = data as EnvironmentDataSourcesResponse;

                if (typedData.success) {
                  setEnvironmentDataSources(typedData.environmentDataSources);
                }
              })
              .catch((error) => console.error('Failed to reload data sources after edit:', error));
            handleBack();
          }}
          onDelete={handleDeleteClick}
          onAddMembers={() => {
            setShowEditForm(false);
            setShowAddAccessForm(true);
          }}
        />
      </div>
    );
  }

  if (showAddAccessForm && selectedEnvironmentDataSource?.dataSource) {
    return (
      <AddResourceAccess
        resourceScope="DATA_SOURCE"
        resource={selectedEnvironmentDataSource.dataSource}
        onBack={() => {
          setShowEditForm(true);
          setShowAddAccessForm(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-primary">Data Sources</h2>
          <p className="text-sm text-secondary">Manage your data sources connections</p>
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
          <span>Add Data Source</span>
        </button>
      </div>

      <div className="space-y-4">
        {environmentDataSources.length === 0 ? (
          <div className="text-center py-12">
            <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Data Sources</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Get started by adding your first data source.
            </p>
          </div>
        ) : (
          environmentDataSources.map((environmentDataSource) => (
            <motion.div
              key={`${environmentDataSource.environmentId}-${environmentDataSource.dataSourceId}`}
              className="border-b border-gray-200 dark:border-gray-700"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleEdit(environmentDataSource)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleEdit(environmentDataSource);
                  }
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-accent-500" />
                  <h4 className="font-medium text-gray-900 dark:text-white">{environmentDataSource.dataSource.name}</h4>
                </div>
                <div className={classNames('flex items-center gap-2 transition-transform duration-200')}>
                  <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
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
                    <DialogTitle title="Delete Data Source" />
                    <p className="text-sm text-secondary">This action cannot be undone</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-secondary">
                  Are you sure you want to delete the data source "{selectedEnvironmentDataSource?.dataSource.name}"?
                  This will This will remove all associated data and cannot be undone.
                </p>

                {conversationCount > 0 && (
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      <div className="text-sm">
                        <p className="text-amber-600 dark:text-amber-400 font-medium">
                          Warning: This will also delete {conversationCount} conversation
                          {conversationCount === 1 ? '' : 's'}!
                        </p>
                        <p className="text-amber-600 dark:text-amber-400 mt-1">
                          All conversations associated with this data source will be permanently deleted and cannot be
                          recovered.
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
