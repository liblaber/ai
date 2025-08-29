import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Trash2 } from 'lucide-react';
import { classNames } from '~/utils/classNames';
import { toast } from 'sonner';
import type { EnvironmentVariableType } from '@prisma/client';
import type { EnvironmentVariableWithDetails } from '~/lib/stores/environmentVariables';

interface EditSecretFormProps {
  selectedSecret: EnvironmentVariableWithDetails;
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
  onSuccess: () => void;
  onDelete: () => void;
}

export default function EditSecretForm({
  selectedSecret,
  isSubmitting,
  setIsSubmitting,
  onSuccess,
  onDelete,
}: EditSecretFormProps) {
  const [key, setKey] = useState(selectedSecret.key);
  const [value, setValue] = useState('');
  const [type, setType] = useState<EnvironmentVariableType>(selectedSecret.type);
  const [description, setDescription] = useState(selectedSecret.description || '');
  const [showValue, setShowValue] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setKey(selectedSecret.key);
    setType(selectedSecret.type);
    setDescription(selectedSecret.description || '');
    setValue(selectedSecret.value);
  }, [selectedSecret]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!key.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate key format (alphanumeric and underscores only)
    if (!/^[A-Za-z0-9_]+$/.test(key.trim())) {
      toast.error('Key can only contain letters, numbers, and underscores');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/environment-variables/${selectedSecret.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: key.trim().toUpperCase(),
          value: value.trim() || selectedSecret.value, // Use existing value if no new value provided
          type,
          description: description.trim() || undefined,
        }),
      });

      const data = await response.json<{ success: boolean; error: string }>();

      if (data.success) {
        toast.success('Secret updated successfully');
        onSuccess();
      } else {
        toast.error(data.error || 'Failed to update secret');
      }
    } catch (error) {
      console.error('Failed to update secret:', error);
      toast.error('Failed to update secret');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleShowValue = () => {
    setShowValue(!showValue);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    onDelete();
  };

  return (
    <>
      <motion.form
        onSubmit={handleSubmit}
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Key */}
          <div className="space-y-2">
            <label htmlFor="key" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Key <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="DATABASE_URL"
              className={classNames(
                'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
                'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
                'focus:ring-2 focus:ring-accent-500 focus:border-transparent',
                'placeholder-gray-500 dark:placeholder-gray-400',
              )}
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Use uppercase letters, numbers, and underscores only
            </p>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as EnvironmentVariableType)}
              className={classNames(
                'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
                'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
                'focus:ring-2 focus:ring-accent-500 focus:border-transparent',
              )}
              required
            >
              <option value="GLOBAL">Global</option>
              <option value="DATA_SOURCE">Data Source</option>
            </select>
          </div>
        </div>

        {/* Environment (Read-only) */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Environment</label>
          <input
            type="text"
            value={selectedSecret.environment.name}
            disabled
            className={classNames(
              'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
              'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
              'cursor-not-allowed',
            )}
          />
        </div>

        {/* Value */}
        <div className="space-y-2">
          <label htmlFor="value" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            New Value
          </label>
          <div className="relative">
            <input
              type={showValue ? 'text' : 'password'}
              id="value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Leave blank to keep current value"
              className={classNames(
                'w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg',
                'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
                'focus:ring-2 focus:ring-accent-500 focus:border-transparent',
                'placeholder-gray-500 dark:placeholder-gray-400',
              )}
            />
            <button
              type="button"
              onClick={toggleShowValue}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showValue ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {value ? 'This value will be encrypted before storage' : 'Current value will be preserved'}
          </p>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description of what this secret is used for"
            rows={3}
            className={classNames(
              'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
              'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
              'focus:ring-2 focus:ring-accent-500 focus:border-transparent',
              'placeholder-gray-500 dark:placeholder-gray-400',
              'resize-none',
            )}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleDeleteClick}
            className={classNames(
              'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              'bg-red-500 hover:bg-red-600',
              'text-white',
            )}
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Secret</span>
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className={classNames(
              'inline-flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-lg transition-colors',
              'bg-accent-500 hover:bg-accent-600 disabled:bg-accent-300',
              'text-gray-950 dark:text-gray-950 disabled:text-gray-600',
              'focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2',
            )}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Update Secret</span>
              </>
            )}
          </button>
        </div>
      </motion.form>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Confirm Deletion</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete the secret "{selectedSecret.key}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={classNames(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600',
                  'text-gray-700 dark:text-gray-300',
                )}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className={classNames(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  'bg-red-500 hover:bg-red-600',
                  'text-white',
                )}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
