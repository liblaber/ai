import { useEffect, useState } from 'react';
import { Link, useFetcher } from '@remix-run/react';
import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import { toast } from 'sonner';
import { Trash } from 'iconsax-reactjs';

interface Website {
  id: string;
  siteId: string;
  siteName: string;
  siteUrl: string;
  chatId: string;
  chatTitle?: string;
  createdAt: string;
}

interface FetcherData {
  websites: Website[];
}

interface Response {
  success: boolean;
  error?: string;
}

function AppItem({ website, onDelete }: { website: Website; onDelete: () => void }) {
  return (
    <motion.div
      className="flex flex-col p-4 border border-gray-700 rounded-lg"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between">
        <Link
          to={`/chat/${website.chatId}`}
          className="text-lg font-medium text-gray-900 dark:text-white hover:text-accent-500 dark:hover:text-accent-400"
        >
          {website.siteName}
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={onDelete}
            className={classNames(
              'bg-gray-50 dark:bg-gray-900',
              'text-gray-700 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400',
              'transition-colors',
            )}
          >
            <Trash variant="Bold" className="w-6 h-6" />
          </button>
        </div>
      </div>
      <a
        href={website.siteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-accent-500 hover:text-accent-600 dark:text-accent-400 dark:hover:text-accent-300 mt-2"
      >
        {website.siteUrl}
      </a>
    </motion.div>
  );
}

function LoadingState() {
  return (
    <div className="text-center py-12">
      <div className="i-ph:circle-notch w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Loading apps...</h4>
      <p className="text-sm text-gray-600 dark:text-gray-400">Please wait while we fetch your deployed apps.</p>
    </div>
  );
}

function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="i-ph:globe-duotone w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Deployed Apps</h4>
      <p className="text-sm text-gray-600 dark:text-gray-400">Deploy your first app from any chat to see it here.</p>
    </div>
  );
}

export default function DeployedAppsTab() {
  const fetcher = useFetcher<FetcherData>();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [websiteToDelete, setWebsiteToDelete] = useState<Website | null>(null);

  useEffect(() => {
    fetcher.load('/api/websites');
  }, []);

  useEffect(() => {
    if (fetcher.data?.websites) {
      setWebsites(fetcher.data.websites);
      setIsLoading(false);
    }
  }, [fetcher.data]);

  const handleDelete = async (websiteId: string) => {
    const response = await fetch(`/api/websites?websiteId=${websiteId}`, {
      method: 'DELETE',
    });

    const data = (await response.json()) as Response;

    if (data.success) {
      toast.success('App deleted successfully');
      fetcher.load('/api/websites');
    } else {
      toast.error('Failed to delete app');
    }

    setWebsiteToDelete(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-2">
        <h2 className="text-lg font-medium text-liblab-elements-textPrimary">Deployed Apps</h2>
      </div>

      <motion.div
        className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {isLoading ? (
          <LoadingState />
        ) : websites.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {websites.map((website) => (
              <AppItem key={website.id} website={website} onDelete={() => setWebsiteToDelete(website)} />
            ))}
          </div>
        )}
      </motion.div>

      <ConfirmationModal
        isOpen={!!websiteToDelete}
        onClose={() => setWebsiteToDelete(null)}
        onConfirm={() => websiteToDelete && handleDelete(websiteToDelete.id)}
        title="Delete App"
        message="Are you sure you want to delete this app? This action cannot be undone and all associated data will be permanently lost."
      />
    </div>
  );
}
