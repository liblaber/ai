import React from 'react';
import { useStore } from '@nanostores/react';
import { classNames } from '~/utils/classNames';
import { ArrowLeft } from 'lucide-react';
import { CloseCircle } from 'iconsax-reactjs';
import { closeSettingsPanel, settingsPanelStore } from '~/lib/stores/settings';

export const ControlPanelHeader = () => {
  const { header } = useStore(settingsPanelStore);

  return (
    <div
      className={classNames(
        'flex items-center justify-between h-16 px-6 bg-gray-50 dark:bg-gray-900 flex-shrink-0',
        header.onBack || header.title ? 'border-b border-gray-700/50' : '',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {header.onBack && (
            <button
              onClick={header.onBack}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          {header.title && (
            <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">{header.title}</h2>
          )}
        </div>
      </div>
      <div className="pl-4">
        <CloseCircle
          variant="Bold"
          className="w-6 h-6 text-gray-500 dark:text-white hover:text-gray-700 dark:hover:text-gray-400 transition-colors cursor-pointer"
          onClick={closeSettingsPanel}
        />
      </div>
    </div>
  );
};
