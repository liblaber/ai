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
  onAddMembers: () => void;
}

export default function EditDeployedAppForm({
  website,
  isSubmitting,
  setIsSubmitting,
  onSuccess,
  onDelete,
  onAddMembers,
}: EditDeployedAppFormProps) {
  const [name, setName] = useState(website.siteName || '');
  const [slug, setSlug] = useState((website as any).slug || '');
  const [initialSlug] = useState((website as any).slug || '');
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [slugError, setSlugError] = useState('');

  useEffect(() => {
    setName(website.siteName || '');
    setSlug((website as any).slug || '');
  }, [website]);

  const checkSlugAvailability = async (slugToCheck: string) => {
    if (!slugToCheck.trim()) {
      setSlugError('');
      return true;
    }

    // If slug hasn't changed from initial, it's always valid
    if (slugToCheck === initialSlug) {
      setSlugError('');
      return true;
    }

    setIsCheckingSlug(true);
    setSlugError('');

    try {
      const response = await fetch(`/api/slugs?slug=${encodeURIComponent(slugToCheck)}`);
      const data = await response.json<{ isValid: boolean; isAvailable: boolean; message?: string }>();

      if (data.isValid && data.isAvailable) {
        return true;
      } else if (!data.isValid) {
        setSlugError('Invalid slug format');
        return false;
      } else {
        setSlugError(data.message || 'This slug is already taken');
        return false;
      }
    } catch (error) {
      logger.error('Failed to check slug availability:', error);
      setSlugError('Failed to check slug availability');

      return false;
    } finally {
      setIsCheckingSlug(false);
    }
  };

  // eslint-disable-next-line consistent-return
  const handleSlugChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSlug = e.target.value;
    setSlug(newSlug);

    if (newSlug.trim() && newSlug !== initialSlug) {
      // Debounce the check
      const timeoutId = setTimeout(() => {
        checkSlugAvailability(newSlug);
      }, 500);

      return () => clearTimeout(timeoutId);
    } else {
      setSlugError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('App name is required');
      return;
    }

    if (slug.trim() && slugError) {
      toast.error('Please fix the slug error before saving');
      return;
    }

    // Final slug availability check (only if slug has changed)
    if (slug.trim() && slug !== initialSlug) {
      const isSlugAvailable = await checkSlugAvailability(slug);

      if (!isSlugAvailable) {
        return;
      }
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
          slug: slug.trim() || null,
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

        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            App Slug
          </label>
          <div className="relative">
            <input
              type="text"
              id="slug"
              value={slug}
              onChange={handleSlugChange}
              className={classNames(
                'w-full px-3 py-2 border rounded-lg',
                'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
                'focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent',
                'placeholder-gray-500 dark:placeholder-gray-400',
                slugError ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600',
              )}
              placeholder="e.g., my-awesome-app"
              disabled={isSubmitting}
            />
            {isCheckingSlug && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          {slugError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{slugError}</p>}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            App will be accessible at /apps/{slug || 'auto-generated-slug'}
          </p>
        </div>
      </div>

      <ResourceAccessMembers
        resourceScope="WEBSITE"
        resourceId={website.id}
        resource={website}
        onAddMembers={onAddMembers}
      />

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
          disabled={
            isSubmitting ||
            !name.trim() ||
            !!slugError ||
            isCheckingSlug ||
            (name === website.siteName && slug === initialSlug)
          }
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
