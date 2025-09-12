import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit, Monitor, Trash2 } from 'lucide-react';
import { Dialog, DialogClose, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import EditDeployedAppForm from './forms/EditDeployedAppForm';
import AddResourceAccess from '~/components/@settings/shared/components/AddResourceAccess';
import { classNames } from '~/utils/classNames';
import { toast } from 'sonner';
import type { Website } from '~/lib/services/websiteService';
import { useWebsitesStore } from '~/lib/stores/websites';
import { logger } from '~/utils/logger';

interface WebsitesResponse {
  success: boolean;
  websites: Website[];
}

export default function DeployedAppsTab() {
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAddAccessForm, setShowAddAccessForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { websites, setWebsites } = useWebsitesStore();

  // Load websites on mount
  useEffect(() => {
    const loadWebsites = async () => {
      try {
        const response = await fetch('/api/websites');
        const data = (await response.json()) as WebsitesResponse;

        if (data.success) {
          setWebsites(data.websites);
        }
      } catch (error) {
        logger.error('Failed to load apps:', error);
      }
    };

    loadWebsites();
  }, [setWebsites]);

  const handleDelete = async () => {
    if (!selectedWebsite) {
      return;
    }

    try {
      const response = await fetch(`/api/websites/${selectedWebsite.id}`, {
        method: 'DELETE',
      });

      const data = (await response.json()) as { success: boolean; error?: string };

      if (data.success) {
        toast.success('App deleted successfully');

        // Reload websites
        const reloadResponse = await fetch('/api/websites');
        const reloadData = (await reloadResponse.json()) as WebsitesResponse;

        if (reloadData.success) {
          setWebsites(reloadData.websites);
        }

        setShowDeleteConfirm(false);
        setShowEditForm(false);
        setSelectedWebsite(null);
      } else {
        toast.error(data.error || 'Failed to delete app');
      }
    } catch (error) {
      logger.error('Failed to delete app:', JSON.stringify(error));
      toast.error('Failed to delete app');
    }
  };

  const handleEdit = (website: Website) => {
    setSelectedWebsite(website);
    setShowEditForm(true);
  };

  const handleDeleteClick = (website: Website) => {
    setSelectedWebsite(website);
    setShowDeleteConfirm(true);
  };

  const handleBack = () => {
    setShowEditForm(false);
    setSelectedWebsite(null);
  };

  if (showEditForm && selectedWebsite) {
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
              <h2 className="text-lg font-medium text-primary">Edit App</h2>
              <p className="text-sm text-secondary">Modify your app settings</p>
            </div>
          </div>
        </div>
        <EditDeployedAppForm
          website={selectedWebsite}
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
          onSuccess={() => {
            // Reload websites
            const reloadResponse = fetch('/api/websites');
            reloadResponse
              .then((response) => response.json())
              .then((data: unknown) => {
                const typedData = data as WebsitesResponse;

                if (typedData.success) {
                  setWebsites(typedData.websites);
                }
              })
              .catch((error) => logger.error('Failed to reload apps after edit:', error));
            handleBack();
          }}
          onDelete={() => handleDeleteClick(selectedWebsite)}
          onAddMembers={() => {
            setShowEditForm(false);
            setShowAddAccessForm(true);
          }}
        />
      </div>
    );
  }

  if (showAddAccessForm && selectedWebsite) {
    return (
      <AddResourceAccess
        resourceScope="WEBSITE"
        resource={selectedWebsite}
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
          <h2 className="text-lg font-medium text-primary">Apps</h2>
          <p className="text-sm text-secondary">Manage your apps</p>
        </div>
      </div>

      <div className="space-y-4">
        {websites.length === 0 ? (
          <div className="text-center py-12">
            <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Apps</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Get started by adding your first app.</p>
          </div>
        ) : (
          websites.map((website) => (
            <motion.div
              key={website.id}
              className="border-b border-gray-200 dark:border-gray-700"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-full flex items-center justify-between p-4">
                <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => handleEdit(website)}>
                  <Monitor className="w-5 h-5 text-accent-500" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{website.siteName}</h4>
                    {website.siteUrl && (
                      <a
                        href={website.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-accent-500 hover:text-accent-600 dark:text-accent-400 dark:hover:text-accent-300 mt-2"
                      >
                        {website.siteUrl}
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(website)}
                    className={classNames(
                      'inline-flex items-center gap-2 p-2 text-sm font-medium rounded-lg transition-colors',
                      'text-gray-500 hover:text-accent-500',
                      'hover:bg-accent-50 dark:hover:bg-accent-950/20',
                    )}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(website)}
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
                    <DialogTitle title="Delete App" />
                    <p className="text-sm text-secondary">This action cannot be undone</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-secondary">
                  Are you sure you want to delete the app "{selectedWebsite?.siteName}"? This will remove all associated
                  data and cannot be undone.
                </p>
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
