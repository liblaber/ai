import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Database, Key, Monitor } from 'lucide-react';
import { classNames } from '~/utils/classNames';
import { toast } from 'sonner';
import type { EnvironmentWithRelations } from '~/lib/services/environmentService';
import ResourceAccessMembers from '~/components/@settings/shared/components/ResourceAccessMembers';

interface EditEnvironmentFormProps {
  environment: EnvironmentWithRelations;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  onSuccess: () => void;
  onDelete: () => void;
  onAddMembers: () => void;
}

export default function EditEnvironmentForm({
  environment,
  isSubmitting,
  setIsSubmitting,
  onSuccess,
  onDelete,
  onAddMembers,
}: EditEnvironmentFormProps) {
  const [name, setName] = useState(environment.name);
  const [description, setDescription] = useState(environment.description || '');

  useEffect(() => {
    setName(environment.name);
    setDescription(environment.description || '');
  }, [environment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Environment name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/environments/${environment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });

      const data = (await response.json()) as { success: boolean; environment?: any; error?: string };

      if (data.success) {
        toast.success('Environment updated successfully');
        onSuccess();
      } else {
        toast.error(data.error || 'Failed to update environment');
      }
    } catch (error) {
      console.error('Failed to update environment:', error);
      toast.error('Failed to update environment');
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
            Environment Name *
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
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={classNames(
              'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
              'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent',
              'placeholder-gray-500 dark:placeholder-gray-400',
              'resize-none',
            )}
            placeholder="Optional description of this environment"
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Connected Entities Sections */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Connected Entities</h3>

        {/* Secrets Section */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Secrets</span>
            </div>
          </div>
          <div className="p-4">
            {environment.environmentVariables && environment.environmentVariables.length > 0 ? (
              <div className="space-y-2">
                {environment.environmentVariables.map((envVar) => (
                  <div
                    key={envVar.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors cursor-pointer"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">{envVar.key}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No secrets configured</p>
            )}
          </div>
        </div>

        {/* Data Sources Section */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Data Sources</span>
            </div>
          </div>
          <div className="p-4">
            {environment.dataSources && environment.dataSources.length > 0 ? (
              <div className="space-y-2">
                {environment.dataSources.map((dataSource) => (
                  <div
                    key={dataSource.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors cursor-pointer"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">{dataSource.name}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No data sources connected</p>
            )}
          </div>
        </div>

        {/* Apps Section */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Apps</span>
            </div>
          </div>
          <div className="p-4">
            {environment.websites && environment.websites.length > 0 ? (
              <div className="space-y-2">
                {environment.websites.map((website) => (
                  <div
                    key={website.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors cursor-pointer"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {website.siteName || website.siteUrl || `Website ${website.id.slice(0, 8)}`}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No apps deployed</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <ResourceAccessMembers resourceScope="ENVIRONMENT" resourceId={environment.id} onAddMembers={onAddMembers} />
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
          Delete Environment
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
            <span>Update Environment</span>
          )}
        </button>
      </div>
    </motion.form>
  );
}
