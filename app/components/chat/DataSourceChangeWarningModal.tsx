import React from 'react';
import { AlertTriangle, Database } from 'lucide-react';
import { classNames } from '~/utils/classNames';

interface DataSourceChangeWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  newDataSourceName: string;
  newEnvironmentName: string;
  isLoading?: boolean;
}

export const DataSourceChangeWarningModal: React.FC<DataSourceChangeWarningModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  newDataSourceName,
  newEnvironmentName,
  isLoading = false,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary">Change Data Source?</h3>
            <p className="text-sm text-secondary">This action may break your application</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Switching to: {newDataSourceName}
              </span>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400">Environment: {newEnvironmentName}</p>
          </div>

          <div className="text-sm text-secondary space-y-2">
            <p>
              <strong>Warning:</strong> Changing data sources can break your application if the database schemas don't
              match.
            </p>
            <p>This will:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>Update the DATABASE_URL in your .env file</li>
              <li>Potentially cause runtime errors if schemas are incompatible</li>
              <li>Require you to restart your application</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={classNames(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              'bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500',
              'text-gray-700 dark:text-gray-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={classNames(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              'bg-amber-500 hover:bg-amber-600',
              'text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {isLoading ? 'Updating...' : 'Change Data Source'}
          </button>
        </div>
      </div>
    </div>
  );
};
