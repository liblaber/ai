import { DataSourcePropertyType } from '@liblab/data-access/utils/types';
import { classNames } from '~/utils/classNames';

interface GoogleSheetsConfig {
  googleSheetsUrl: string;
  appsScriptUrl: string;
}

type Props = {
  config: GoogleSheetsConfig;
  onChange: (config: GoogleSheetsConfig) => void;
  onPropertyChange: (type: string, value: string) => void;
  disabled?: boolean;
};

export default function GoogleSheetsForm({ config, onChange, onPropertyChange, disabled = false }: Props) {
  const createGoogleSheetsConnectionString = (config: GoogleSheetsConfig): string => {
    let connectionString = config.googleSheetsUrl;

    if (config.appsScriptUrl) {
      connectionString += `${connectionString.includes('?') ? '&' : '?'}appsScript=${encodeURIComponent(config.appsScriptUrl)}`;
    }

    return connectionString;
  };

  const handleConfigChange = (newConfig: GoogleSheetsConfig) => {
    onChange(newConfig);

    const connectionString = createGoogleSheetsConnectionString(newConfig);
    onPropertyChange(DataSourcePropertyType.CONNECTION_URL, connectionString);
  };

  return (
    <>
      <div>
        <label className="mb-3 block text-sm font-medium text-secondary">Google Sheets URL</label>
        <div className="relative">
          <input
            type="text"
            value={config.googleSheetsUrl}
            onChange={(e) =>
              handleConfigChange({
                ...config,
                googleSheetsUrl: e.target.value,
              })
            }
            disabled={disabled}
            className={classNames(
              'w-full px-4 py-2.5 bg-[#F5F5F5] dark:bg-gray-700 border rounded-lg',
              'text-primary placeholder-tertiary text-base',
              'border-[#E5E5E5] dark:border-[#1A1A1A] rounded-lg',
              'focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500',
              'transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
            placeholder="https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit"
          />
        </div>
        <label className="mb-3 block !text-[11px] text-secondary mt-1">
          For read operations. e.g. https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
        </label>
      </div>

      <div>
        <label className="mb-3 block text-sm font-medium text-secondary">Apps Script Web App URL (Optional)</label>
        <div className="relative">
          <input
            type="text"
            value={config.appsScriptUrl}
            onChange={(e) =>
              handleConfigChange({
                ...config,
                appsScriptUrl: e.target.value,
              })
            }
            disabled={disabled}
            className={classNames(
              'w-full px-4 py-2.5 bg-[#F5F5F5] dark:bg-gray-700 border rounded-lg',
              'text-primary placeholder-tertiary text-base',
              'border-[#E5E5E5] dark:border-[#1A1A1A] rounded-lg',
              'focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500',
              'transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
            placeholder="https://script.google.com/macros/s/SCRIPT_ID/exec"
          />
        </div>
        <label className="mb-3 block !text-[11px] text-secondary mt-1">
          For write operations. e.g. https://script.google.com/macros/s/SCRIPT_ID/exec
        </label>
      </div>
    </>
  );
}

export { type GoogleSheetsConfig, GoogleSheetsForm };
