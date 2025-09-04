import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import { toast } from 'sonner';
import type { Website } from '~/lib/services/websiteService';
import ResourceAccessMembers from '~/components/@settings/shared/components/ResourceAccessMembers';
import { logger } from '~/utils/logger';

interface EditDeployedAppFormProps {
  website: Website;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  onSuccess: () => void;
  onDelete: () => void;
  onInvite: () => void;
}

export default function EditDeployedAppForm({
  website,
  isSubmitting,
  setIsSubmitting,
  onSuccess,
  onDelete,
  onInvite,
}: EditDeployedAppFormProps) {
  const [name, setName] = useState(website.siteName || '');

  useEffect(() => {
    setName(website.siteName || '');
  }, [website]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('App name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/websites/${website.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteName: name.trim(),
        }),
      });

      const data = (await response.json()) as { success: boolean; website?: any; error?: string };

      if (data.success) {
        toast.success('App updated successfully');
        onSuccess();
      } else {
        toast.error(data.error || 'Failed to update app');
      }
    } catch (error) {
      logger.error('Failed to update app:', error);
      toast.error('Failed to update app');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            App Name *
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={classNames(
              'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
              'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent',
              'placeholder-gray-500 dark:placeholder-gray-400',
            )}
            placeholder="e.g., Development, Staging, Production"
            disabled={isSubmitting}
            required
          />
        </div>
      </div>

      <div>
        <ResourceAccessMembers resourceScope="WEBSITE" resourceId={website.id} onInvite={onInvite} />
      </div>

      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onDelete}
          className={classNames(
            'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
            'text-red-600 hover:text-red-700',
            'hover:bg-red-50 dark:hover:bg-red-950/20',
          )}
        >
          Delete App
        </button>

        <button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          className={classNames(
            'inline-flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-lg transition-colors',
            'bg-accent-500 hover:bg-accent-600 disabled:bg-accent-300',
            'text-gray-950 dark:text-gray-950 disabled:text-gray-600',
            'disabled:cursor-not-allowed',
          )}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
              <span>Updating...</span>
            </>
          ) : (
            <span>Update App</span>
          )}
        </button>
      </div>
    </motion.form>
  );
}
