import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { classNames } from '~/utils/classNames';
import { toast } from 'sonner';
import type { EnvironmentVariableType } from '@prisma/client';

interface AddSecretFormProps {
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
  onSuccess: () => void;
  selectedEnvironmentId: string;
}

export default function AddSecretForm({
  isSubmitting,
  setIsSubmitting,
  onSuccess,
  selectedEnvironmentId,
}: AddSecretFormProps) {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [type, setType] = useState<EnvironmentVariableType>('GLOBAL');
  const [description, setDescription] = useState('');
  const [showValue, setShowValue] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<{
    key: string;
    value: string;
    type: EnvironmentVariableType;
    description?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!key.trim() || !value.trim() || !selectedEnvironmentId) {
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
      const response = await fetch('/api/environment-variables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: key.trim().toUpperCase(),
          value: value.trim(),
          type,
          environmentId: selectedEnvironmentId,
          description: description.trim() || undefined,
        }),
      });

      const data = (await response.json()) as { success: boolean; error?: string; environmentVariable?: any };

      if (data.success) {
        toast.success('Secret created successfully');

        // Store the created secret to show it
        setCreatedSecret({
          key: key.trim().toUpperCase(),
          value: value.trim(),
          type,
          description: description.trim() || undefined,
        });

        // Clear the form
        setKey('');
        setValue('');
        setDescription('');
        setShowValue(false);
      } else {
        toast.error(data.error || 'Failed to create secret');
      }
    } catch (error) {
      console.error('Failed to create secret:', error);
      toast.error('Failed to create secret');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleShowValue = () => {
    setShowValue(!showValue);
  };

  const handleBack = () => {
    onSuccess();
  };

  // Show the created secret if available
  if (createdSecret) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-primary">Secret Created Successfully</h2>
            <p className="text-sm text-secondary">Your new environment variable has been created</p>
          </div>
          <button
            onClick={handleBack}
            className={classNames(
              'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              'bg-accent-500 hover:bg-accent-600',
              'text-gray-950 dark:text-gray-950',
            )}
          >
            <span>Continue</span>
          </button>
        </div>

        {/* Display the created secret */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Key</label>
              <input
                type="text"
                value={createdSecret.key}
                readOnly
                className={classNames(
                  'w-full px-4 py-2.5 bg-[#F5F5F5] dark:bg-gray-700 border rounded-lg',
                  'text-primary border-[#E5E5E5] dark:border-[#1A1A1A]',
                  'cursor-default',
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
              <input
                type="text"
                value={createdSecret.type}
                readOnly
                className={classNames(
                  'w-full px-4 py-2.5 bg-[#F5F5F5] dark:bg-gray-700 border rounded-lg',
                  'text-primary border-[#E5E5E5] dark:border-[#1A1A1A]',
                  'cursor-default',
                )}
              />
            </div>

            {createdSecret.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <input
                  type="text"
                  value={createdSecret.description}
                  readOnly
                  className={classNames(
                    'w-full px-4 py-2.5 bg-[#F5F5F5] dark:bg-gray-700 border rounded-lg',
                    'text-primary border-[#E5E5E5] dark:border-[#1A1A1A]',
                    'cursor-default',
                  )}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Value</label>
              <div className="relative">
                <input
                  type={showValue ? 'text' : 'password'}
                  value={createdSecret.value}
                  readOnly
                  className={classNames(
                    'w-full px-4 py-2.5 pr-12 bg-[#F5F5F5] dark:bg-gray-700 border rounded-lg',
                    'text-primary border-[#E5E5E5] dark:border-[#1A1A1A]',
                    'cursor-default',
                  )}
                />
                <button
                  type="button"
                  onClick={toggleShowValue}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#4b4f5a] rounded group"
                  tabIndex={-1}
                >
                  <span className="text-gray-400 group-hover:text-white transition-colors">
                    {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </span>
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This value has been encrypted and stored securely
              </p>
            </div>
          </div>
        </div>
      </div>
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
          value={selectedEnvironmentId}
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
          Value <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type={showValue ? 'text' : 'password'}
            id="value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter your secret value"
            className={classNames(
              'w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg',
              'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
              'focus:ring-2 focus:ring-accent-500 focus:border-transparent',
              'placeholder-gray-500 dark:placeholder-gray-400',
            )}
            required
          />
          <button type="button" onClick={toggleShowValue} className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {showValue ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
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
      <div className="flex justify-end">
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
              <span>Creating...</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>Create Secret</span>
            </>
          )}
        </button>
      </div>
    </motion.form>
  );
}
