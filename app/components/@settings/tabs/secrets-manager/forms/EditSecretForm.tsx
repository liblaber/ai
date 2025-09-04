import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { Eye, EyeSlash } from 'iconsax-reactjs';
import { classNames } from '~/utils/classNames';
import { toast } from 'sonner';
import type { EnvironmentVariableWithDetails } from '~/lib/stores/environmentVariables';
import { EnvironmentVariableType } from '@prisma/client';

interface EditSecretFormProps {
  environmentVariable: EnvironmentVariableWithDetails;
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
  onSuccess: () => void;
  onDelete: () => void;
}

export default function EditSecretForm({
  environmentVariable,
  isSubmitting,
  setIsSubmitting,
  onSuccess,
  onDelete,
}: EditSecretFormProps) {
  const [key, setKey] = useState(environmentVariable.key);
  const [value, setValue] = useState(environmentVariable.value);
  const [description, setDescription] = useState(environmentVariable.description || '');
  const [showValue, setShowValue] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!key.trim() || !value.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate key format (alphanumeric and underscores only)
    if (!/^[A-Z0-9_]+$/.test(key.trim())) {
      toast.error('Secret key can only contain uppercase letters, numbers, and underscores');
      return;
    }

    // Check if any changes were made
    const hasChanges =
      key.trim().toUpperCase() !== environmentVariable.key ||
      value.trim() !== environmentVariable.value ||
      description.trim() !== (environmentVariable.description || '');

    if (!hasChanges) {
      toast.info('No changes were made');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/environment-variables/${environmentVariable.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: key.trim().toUpperCase(),
          value: value.trim(),
          type: EnvironmentVariableType.GLOBAL,
          description: description.trim() || undefined,
        }),
      });

      const data = (await response.json()) as { success: boolean; error?: string };

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

  const handleDelete = async () => {
    // Prevent deletion of DATA_SOURCE type environment variables
    if (environmentVariable.type === EnvironmentVariableType.DATA_SOURCE) {
      toast.error('Cannot delete data source secrets from here. Please manage them in the Data Sources tab.');
      setShowDeleteConfirm(false);

      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/environment-variables/${environmentVariable.id}`, {
        method: 'DELETE',
      });

      const data = (await response.json()) as { success: boolean; error?: string };

      if (data.success) {
        toast.success('Secret deleted successfully');
        onDelete();
      } else {
        toast.error(data.error || 'Failed to delete secret');
      }
    } catch (error) {
      console.error('Failed to delete secret:', error);
      toast.error('Failed to delete secret');
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  const toggleShowValue = () => {
    setShowValue(!showValue);
  };

  if (showDeleteConfirm) {
    return (
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="text-center">
          <h2 className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">Delete Secret</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete the secret "{environmentVariable.key}"? This action cannot be undone.
          </p>
        </div>

        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(false)}
            disabled={isSubmitting}
            className={classNames(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700',
              'text-gray-700 dark:text-gray-300',
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
            className={classNames(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              'bg-red-600 hover:bg-red-700 disabled:bg-red-400',
              'text-white',
            )}
          >
            {isSubmitting ? 'Deleting...' : 'Delete Secret'}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Environment (Read-only) */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Environment</label>
        <input
          type="text"
          value={environmentVariable.environment.name}
          disabled
          className={classNames(
            'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
            'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
            'cursor-not-allowed',
          )}
        />
      </div>

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
          placeholder="MY_SECRET_KEY"
          className={classNames(
            'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
            'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
            'focus:ring-2 focus:ring-accent-500 focus:border-transparent',
            'placeholder-gray-500 dark:placeholder-gray-400',
          )}
          required
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">Use uppercase letters, numbers, and underscores only</p>
      </div>

      {/* Value Input */}
      <div className="space-y-2">
        <label htmlFor="value" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Value <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type={showValue ? 'text' : 'password'}
            id="value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter secret value"
            className={classNames(
              'w-full px-4 py-2.5 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg',
              'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
              'focus:ring-2 focus:ring-accent-500 focus:border-transparent',
              'placeholder-gray-500 dark:placeholder-gray-400',
            )}
            required
          />
          <button
            type="button"
            onClick={toggleShowValue}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded group"
            tabIndex={-1}
          >
            <span className="text-gray-400 group-hover:text-white transition-colors">
              {showValue ? <EyeSlash variant="Bold" size={20} /> : <Eye variant="Bold" size={20} />}
            </span>
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">This value will be encrypted before storage</p>
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

      {/* Submit Button */}
      <div className="flex items-center justify-between">
        {/* Delete Button - Only show for non-DATA_SOURCE types */}
        {environmentVariable.type !== 'DATA_SOURCE' && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isSubmitting}
            className={classNames(
              'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              'text-red-600 hover:text-red-700',
              'hover:bg-red-50 dark:hover:bg-red-950/20',
            )}
          >
            Delete Secret
          </button>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !key.trim()}
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
  );
}
