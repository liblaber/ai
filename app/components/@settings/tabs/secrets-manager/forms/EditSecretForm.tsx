import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Lock } from 'lucide-react';
import { Eye, EyeSlash } from 'iconsax-reactjs';
import { classNames } from '~/utils/classNames';
import { toast } from 'sonner';
import type { EnvironmentVariableWithDetails } from '~/lib/stores/environmentVariables';
import type { EnvironmentVariableType } from '@prisma/client';

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
  const [value, setValue] = useState('');
  const [type, setType] = useState<EnvironmentVariableType>(environmentVariable.type);
  const [description, setDescription] = useState(environmentVariable.description || '');
  const [showValue, setShowValue] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

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

    // Check if any changes were made
    const hasChanges =
      key.trim().toUpperCase() !== environmentVariable.key ||
      (value.trim() && value.trim() !== environmentVariable.value) ||
      type !== environmentVariable.type ||
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
          value: value.trim() || environmentVariable.value, // Use new value or keep current
          type,
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

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(environmentVariable.value);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
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
          value={environmentVariable.environment.name}
          disabled
          className={classNames(
            'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
            'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
            'cursor-not-allowed',
          )}
        />
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
            value={value || environmentVariable.value}
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={copyToClipboard}
            className={classNames(
              'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
              'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700',
              'text-gray-700 dark:text-gray-300',
            )}
          >
            {hasCopied ? (
              'Copied to clipboard'
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>
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
      <div className="flex justify-end">
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
