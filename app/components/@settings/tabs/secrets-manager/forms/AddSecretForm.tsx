import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { classNames } from '~/utils/classNames';
import { toast } from 'sonner';
import { EnvironmentVariableType } from '@prisma/client';

interface AddSecretFormProps {
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
  onSuccess: () => void;
  selectedEnvironmentId: string;
  showEnvironmentSelector?: boolean;
  availableEnvironments?: Array<{ id: string; name: string }>;
}

export default function AddSecretForm({
  isSubmitting,
  setIsSubmitting,
  onSuccess,
  selectedEnvironmentId,
  availableEnvironments = [],
}: AddSecretFormProps) {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [showValue, setShowValue] = useState(false);
  const [environmentId, setEnvironmentId] = useState(selectedEnvironmentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!key.trim() || !value.trim() || !environmentId) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate a key format (alphanumeric and underscores only)
    if (!/^[A-Z0-9_]+$/.test(key.trim())) {
      toast.error('Secret key can only contain uppercase letters, numbers, and underscores');
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
          type: EnvironmentVariableType.GLOBAL,
          environmentId,
          description: description.trim() || undefined,
        }),
      });

      const data = (await response.json()) as { success: boolean; error?: string; environmentVariable?: any };

      if (data.success) {
        toast.success('Secret created successfully');
        onSuccess();
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

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Environment */}
      <div className="space-y-2">
        <label htmlFor="environment" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Environment <span className="text-red-500">*</span>
        </label>
        <select
          id="environment"
          value={environmentId}
          onChange={(e) => setEnvironmentId(e.target.value)}
          className={classNames(
            'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',
            'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
            'focus:ring-2 focus:ring-accent-500 focus:border-transparent',
          )}
          required
        >
          {availableEnvironments.map((env) => (
            <option key={env.id} value={env.id}>
              {env.name}
            </option>
          ))}
        </select>
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
            {showValue ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
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
