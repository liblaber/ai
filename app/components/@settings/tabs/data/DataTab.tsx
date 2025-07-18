import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogClose, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import AddDataSourceForm from './forms/AddDataSourceForm';
import EditDataSourceForm from './forms/EditDataSourceForm';
import { classNames } from '~/utils/classNames';
import { toast } from 'sonner';
import { useDataSourcesStore } from '~/lib/stores/dataSources';
import { settingsPanelStore, useSettingsStore } from '~/lib/stores/settings';
import { useStore } from '@nanostores/react';

export interface DataSource {
  id: string;
  name: string;
  connectionString: string;
  createdAt: string;
  updatedAt: string;
}

interface DataSourcesResponse {
  success: boolean;
  dataSources: DataSource[];
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
}

export default function DataTab() {
  const { showAddForm } = useStore(settingsPanelStore);
  const [showAddFormLocal, setShowAddFormLocal] = useState(showAddForm);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conversationCount, setConversationCount] = useState<number>(0);
  const { dataSources, setDataSources } = useDataSourcesStore();
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
        const data = (await response.json()) as DataSourcesResponse;

        if (data.success) {
          setDataSources(data.dataSources);
        }
      } catch (error) {
        console.error('Failed to load data sources:', error);
      }
    };

    loadDataSources();
  }, [setDataSources]);

  const handleDelete = async () => {
    if (!selectedDataSource) {
      return;
    }

    const response = await fetch(`/api/data-sources/${selectedDataSource.id}`, {
      method: 'DELETE',
    });

    const data = (await response.json()) as { success: boolean; error?: string };

    if (data.success) {
      toast.success('Data source deleted successfully');

      // Reload data sources
      const reloadResponse = await fetch('/api/data-sources');
      const reloadData = (await reloadResponse.json()) as DataSourcesResponse;

      if (reloadData.success) {
        setDataSources(reloadData.dataSources);
      }

      setShowDeleteConfirm(false);
      setShowEditForm(false);
      setSelectedDataSource(null);
    } else {
      toast.error(data.error || 'Failed to delete data source');
    }
  };

  const handleEdit = (dataSource: DataSource) => {
    setSelectedDataSource(dataSource);
    setShowEditForm(true);
    setShowAddFormLocal(false);
  };

  const handleDeleteClick = async () => {
    if (!selectedDataSource) {
      return;
    }

    try {
      const response = await fetch(`/api/data-sources/${selectedDataSource.id}`);
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
    setSelectedDataSource(null);
  };

  const handleAdd = () => {
    setShowAddFormLocal(true);
    setShowEditForm(false);
    setSelectedDataSource(null);
  };

  return (
    <div className="space-y-6">
      {!showEditForm && !showAddFormLocal && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-liblab-elements-textPrimary">Data Sources</h2>
            <p className="text-sm text-liblab-elements-textSecondary">Manage your data sources connections</p>
          </div>
          <button
            onClick={handleAdd}
            className={classNames(
              'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              'bg-accent-500 hover:bg-accent-600',
              'text-gray-950 dark:text-gray-950',
            )}
          >
            <div className="i-ph:plus" />
            <span>Add Data Source</span>
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
                <div className="i-ph:arrow-left" />
              </button>
              <div>
                <h2 className="text-lg font-medium text-liblab-elements-textPrimary">Create Data Source</h2>
                <p className="text-sm text-liblab-elements-textSecondary">Add a new database connection</p>
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
                  const typedData = data as DataSourcesResponse;

                  if (typedData.success) {
                    setDataSources(typedData.dataSources);
                  }
                })
                .catch((error) => console.error('Failed to reload data sources after add:', error));
              handleBack();
            }}
          />
        </div>
      )}

      {showEditForm && selectedDataSource && (
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
                <div className="i-ph:arrow-left" />
              </button>
              <div>
                <h2 className="text-lg font-medium text-liblab-elements-textPrimary">Edit Data Source</h2>
                <p className="text-sm text-liblab-elements-textSecondary">Modify your database connection settings</p>
              </div>
            </div>
          </div>
          <EditDataSourceForm
            selectedDataSource={selectedDataSource}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            onSuccess={() => {
              // Reload data sources
              const reloadResponse = fetch('/api/data-sources');
              reloadResponse
                .then((response) => response.json())
                .then((data: unknown) => {
                  const typedData = data as DataSourcesResponse;

                  if (typedData.success) {
                    setDataSources(typedData.dataSources);
                  }
                })
                .catch((error) => console.error('Failed to reload data sources after edit:', error));
              handleBack();
            }}
            onDelete={handleDeleteClick}
          />
        </div>
      )}

      {!showEditForm && !showAddFormLocal && (
        <div className="space-y-4">
          {dataSources.length === 0 ? (
            <div className="text-center py-12">
              <div className="i-ph:database-duotone w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Data Sources</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Get started by adding your first data source.
              </p>
            </div>
          ) : (
            dataSources.map((dataSource) => (
              <motion.div
                key={dataSource.id}
                className="border-b border-gray-200 dark:border-gray-700"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleEdit(dataSource)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleEdit(dataSource);
                    }
                  }}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="i-ph:database-duotone w-5 h-5 text-accent-500" />
                    <h4 className="font-medium text-gray-900 dark:text-white">{dataSource.name}</h4>
                  </div>
                  <div className={classNames('flex items-center gap-2 transition-transform duration-200')}>
                    <div className="i-ph:caret-right w-4 h-4 text-gray-500 dark:text-gray-400" />
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
                    <div className="i-ph:trash-duotone text-liblab-elements-textTertiary" />
                  </div>
                  <div>
                    <DialogTitle>Delete Data Source</DialogTitle>
                    <p className="text-sm text-liblab-elements-textSecondary">This action cannot be undone</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-liblab-elements-textSecondary">
                  Are you sure you want to delete the data source "{selectedDataSource?.name}"? This will remove all
                  associated data and cannot be undone.
                </p>

                {conversationCount > 0 && (
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center gap-2">
                      <div className="i-ph:warning-circle w-5 h-5 text-amber-500" />
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
                      'text-liblab-elements-textPrimary',
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
                  <div className="i-ph:trash" />
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
