import { useState } from 'react';
import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import { toast } from 'sonner';
import type { CreateEnvironmentResponse } from '~/api/environments/route';

interface AddEnvironmentFormProps {
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  onSuccess: () => void;
}

export default function AddEnvironmentForm({ isSubmitting, setIsSubmitting, onSuccess }: AddEnvironmentFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Environment name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/environments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });

      const data = await response.json<CreateEnvironmentResponse>();

      if (data.success) {
        toast.success('Environment created successfully');
        onSuccess();
      } else {
        toast.error(data.error || 'Failed to create environment');
      }
    } catch (error) {
      console.error('Failed to create environment:', error);
      toast.error('Failed to create environment');
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
            data-testid="environment-name-input"
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
            data-testid="environment-description-input"
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

      <div className="flex items-center justify-end gap-3 pt-4">
        <button
          type="submit"
          data-testid="create-environment-submit"
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
              <span>Creating...</span>
            </>
          ) : (
            <span>Create Environment</span>
          )}
        </button>
      </div>
    </motion.form>
  );
}
