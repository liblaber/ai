import { useCallback, useEffect, useState } from 'react';
import { useFetcher } from '@remix-run/react';

interface PluginMetadata {
  id: string;
  name: string;
  description: string;
  icon: string;
  theme: {
    primary: string;
    background: string;
    hover: string;
  };
}

interface PluginManagerProps {
  plugins: PluginMetadata[];
}

interface UploadResponse {
  success?: boolean;
  plugin?: PluginMetadata;
  error?: string;
}

export function PluginManager({ plugins: initialPlugins }: PluginManagerProps) {
  const [plugins, setPlugins] = useState(initialPlugins);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadFetcher = useFetcher<UploadResponse>();

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      setUploadError(null);

      const formData = new FormData();
      formData.append('plugin', file);

      uploadFetcher.submit(formData, {
        method: 'POST',
        action: '/api/plugins/upload',
        encType: 'multipart/form-data',
      });
    },
    [uploadFetcher],
  );

  // Handle response updates
  useEffect(() => {
    if (uploadFetcher.data) {
      if (uploadFetcher.data.success && uploadFetcher.data.plugin) {
        const newPlugin: PluginMetadata = uploadFetcher.data.plugin;
        setPlugins((prev) => [...prev, newPlugin]);
        setUploadError(null);
      } else if (uploadFetcher.data.error) {
        setUploadError(uploadFetcher.data.error);
      }
    }
  }, [uploadFetcher.data]);

  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Deployment Plugins</h2>
        <div className="flex items-center gap-4">
          <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
            Upload Plugin
            <input
              type="file"
              accept=".zip"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploadFetcher.state === 'submitting'}
            />
          </label>
          {uploadFetcher.state === 'submitting' && <span className="text-gray-500">Uploading...</span>}
          {uploadError && <span className="text-red-500">{uploadError}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plugins.map((plugin) => (
          <div
            key={plugin.id}
            className={`p-4 rounded-lg border ${plugin.theme.background} ${plugin.theme.primary} border-current`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`text-2xl ${plugin.theme.primary}`}>
                <i className={plugin.icon} />
              </div>
              <h3 className="text-lg font-semibold">{plugin.name}</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{plugin.description}</p>
            <div className="flex justify-end">
              <button
                className={`px-3 py-1 rounded text-sm ${plugin.theme.hover} ${plugin.theme.primary}`}
                onClick={() => {
                  // TODO: Implement plugin removal
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
