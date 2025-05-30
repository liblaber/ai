import { classNames } from '~/utils/classNames';
import { useRef, useState } from 'react';
import type { TestConnectionResponse } from '~/components/@settings/tabs/data/DataTab';
import { getFormData } from '~/utils/form';
import { toast } from 'sonner';

interface DataSource {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  username: string;
  database: string;
  sslMode: string;
  createdAt: string;
  updatedAt: string;
}

interface DataSourceResponse {
  success: boolean;
  message?: string;
}

interface EditDataSourceFormProps {
  selectedDataSource: DataSource | null;
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
  onSuccess: () => void;
  onDelete: () => void;
}

export default function EditDataSourceForm({
  selectedDataSource,
  isSubmitting,
  setIsSubmitting,
  onSuccess,
  onDelete,
}: EditDataSourceFormProps) {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<DataSourceResponse | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const handleTestConnection = async () => {
    if (!formRef.current) {
      return;
    }

    const formData = getFormData(formRef.current);

    // Validate all required fields except name and password
    const requiredFields = ['type', 'host', 'port', 'database', 'username'];
    const missingFields = requiredFields.filter((field) => !formData.get(field));

    if (missingFields.length > 0) {
      const message = `Please fill in all required fields: ${missingFields.join(', ')}`;

      toast.error(message);

      return;
    }

    setIsTestingConnection(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/data-sources/edit/testing', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json<TestConnectionResponse>();
      setTestResult(data);
    } catch (error) {
      setTestResult({
        success: false,
        message:
          error instanceof Error ? error.message : String(error) || 'Failed to test connection. Please try again.',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!formRef.current) {
      return;
    }

    const formData = getFormData(formRef.current);

    // Validate all required fields except password
    const requiredFields = ['name', 'type', 'host', 'port', 'database', 'username'];
    const missingFields = requiredFields.filter((field) => !formData.get(field));

    if (missingFields.length > 0) {
      const message = `Please fill in all required fields: ${missingFields.join(', ')}`;

      toast.error(message);

      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/data-sources/${selectedDataSource?.id}`, {
        method: 'PUT',
        body: formData,
      });

      const data = await response.json<DataSourceResponse>();

      if (data.success) {
        const message = 'Data source updated successfully';

        toast.success(message);

        onSuccess();
      } else {
        const message = data.message || 'Failed to update data source';

        toast.error(message);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error) || 'Failed to test connection. Please try again.';

      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedDataSource) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div ref={formRef} className="space-y-4">
        <input hidden type="hidden" name="id" defaultValue={selectedDataSource.id} />
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-liblab-elements-textSecondary mb-2">Name</label>
            <input
              type="text"
              name="name"
              required
              defaultValue={selectedDataSource.name}
              disabled={isSubmitting}
              className={classNames(
                'w-full px-4 py-2.5 bg-[#F5F5F5] dark:bg-gray-700 border rounded-lg',
                'text-liblab-elements-textPrimary placeholder-liblab-elements-textTertiary text-base',
                'border-[#E5E5E5] dark:border-[#1A1A1A] rounded-lg',
                'focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500',
                'transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
              placeholder="Enter a name for your data source"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-liblab-elements-textSecondary mb-2">Type</label>
            <select
              name="type"
              required
              defaultValue={selectedDataSource.type}
              disabled={isSubmitting}
              className={classNames(
                'w-full px-4 py-2.5 bg-[#F5F5F5] dark:bg-gray-700 border rounded-lg',
                'text-liblab-elements-textPrimary placeholder-liblab-elements-textTertiary text-base',
                'border-[#E5E5E5] dark:border-[#1A1A1A] rounded-lg',
                'focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500',
                'transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              <option value="postgres">PostgreSQL</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-liblab-elements-textSecondary mb-2">Host</label>
            <input
              type="text"
              name="host"
              required
              defaultValue={selectedDataSource.host}
              disabled={isSubmitting}
              className={classNames(
                'w-full px-4 py-2.5 bg-[#F5F5F5] dark:bg-gray-700 border rounded-lg',
                'text-liblab-elements-textPrimary placeholder-liblab-elements-textTertiary text-base',
                'border-[#E5E5E5] dark:border-[#1A1A1A] rounded-lg',
                'focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500',
                'transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
              placeholder="Enter the database host"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-liblab-elements-textSecondary mb-2">Port</label>
            <input
              type="number"
              name="port"
              required
              defaultValue={selectedDataSource.port}
              disabled={isSubmitting}
              className={classNames(
                'w-full px-4 py-2.5 bg-[#F5F5F5] dark:bg-gray-700 border rounded-lg',
                'text-liblab-elements-textPrimary placeholder-liblab-elements-textTertiary text-base',
                'border-[#E5E5E5] dark:border-[#1A1A1A] rounded-lg',
                'focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500',
                'transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
              placeholder="Enter the database port"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-liblab-elements-textSecondary mb-2">Database</label>
            <input
              type="text"
              name="database"
              required
              defaultValue={selectedDataSource.database}
              disabled={isSubmitting}
              className={classNames(
                'w-full px-4 py-2.5 bg-[#F5F5F5] dark:bg-gray-700 border rounded-lg',
                'text-liblab-elements-textPrimary placeholder-liblab-elements-textTertiary text-base',
                'border-[#E5E5E5] dark:border-[#1A1A1A] rounded-lg',
                'focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500',
                'transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
              placeholder="Enter the database name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-liblab-elements-textSecondary mb-2">Username</label>
            <input
              type="text"
              name="username"
              required
              defaultValue={selectedDataSource.username}
              disabled={isSubmitting}
              className={classNames(
                'w-full px-4 py-2.5 bg-[#F5F5F5] dark:bg-gray-700 border rounded-lg',
                'text-liblab-elements-textPrimary placeholder-liblab-elements-textTertiary text-base',
                'border-[#E5E5E5] dark:border-[#1A1A1A] rounded-lg',
                'focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500',
                'transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
              placeholder="Enter the database username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-liblab-elements-textSecondary mb-2">Password</label>
            <input
              type="password"
              name="password"
              placeholder="Leave blank to keep current password"
              disabled={isSubmitting}
              className={classNames(
                'w-full px-4 py-2.5 bg-[#F5F5F5] dark:bg-gray-700 border rounded-lg',
                'text-liblab-elements-textPrimary placeholder-liblab-elements-textTertiary text-base',
                'border-[#E5E5E5] dark:border-[#1A1A1A] rounded-lg',
                'focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500',
                'transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-liblab-elements-textSecondary mb-2">SSL Mode</label>
            <select
              name="sslMode"
              required
              defaultValue={selectedDataSource.sslMode}
              disabled={isSubmitting}
              className={classNames(
                'w-full px-4 py-2.5 bg-[#F5F5F5] dark:bg-gray-700 border rounded-lg',
                'text-liblab-elements-textPrimary placeholder-liblab-elements-textTertiary text-base',
                'border-[#E5E5E5] dark:border-[#1A1A1A] rounded-lg',
                'focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500',
                'transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              <option value="DISABLE">Disable</option>
              <option value="ALLOW">Allow</option>
              <option value="PREFER">Prefer</option>
              <option value="REQUIRE">Require</option>
              <option value="VERIFY_CA" disabled>
                Verify CA (Coming Soon)
              </option>
              <option value="VERIFY_FULL" disabled>
                Verify Full (Coming Soon)
              </option>
            </select>
          </div>
          {testResult && (
            <div
              className={`p-3 rounded-lg ${
                testResult.success
                  ? 'bg-green-500/5 border border-green-500/20'
                  : 'bg-red-500/5 border border-red-500/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`i-ph:${
                    testResult.success ? 'check-circle' : 'x-circle'
                  } w-5 h-5 ${testResult.success ? 'text-green-500' : 'text-red-500'}`}
                />
                <p
                  className={`text-sm ${
                    testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {testResult.message}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[#E5E5E5] dark:border-[#1A1A1A]">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={async (e) => {
                e.preventDefault();
                await handleTestConnection();
              }}
              disabled={isTestingConnection || isSubmitting}
              className={classNames(
                'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                'bg-blue-500 hover:bg-blue-600',
                'text-white dark:text-gray-950',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {isTestingConnection ? (
                <>
                  <div className="i-ph:spinner animate-spin" />
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <div className="i-ph:plug-fill" />
                  <span>Test Connection</span>
                </>
              )}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onDelete}
              disabled={isSubmitting}
              className={classNames(
                'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                'bg-red-500 hover:bg-red-600',
                'text-white',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              <div className="i-ph:trash-bold" />
              <span>Delete</span>
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={classNames(
                'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                'bg-accent-500 hover:bg-accent-600',
                'text-white dark:text-gray-950',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              {isSubmitting ? (
                <>
                  <div className="i-ph:spinner animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <div className="i-ph:floppy-disk" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
