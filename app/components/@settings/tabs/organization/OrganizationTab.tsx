import { useState, useEffect } from 'react';
import { useFetcher } from '@remix-run/react';
import { toast } from 'sonner';

interface OrganizationResponse {
  success: boolean;
  organization: {
    id: string;
    name: string;
  };
  error?: string;
}

export default function OrganizationTab() {
  const fetcher = useFetcher<OrganizationResponse>();
  const [organizationName, setOrganizationName] = useState('');

  useEffect(() => {
    fetcher.load('/api/organization');
  }, []);

  useEffect(() => {
    if (fetcher.data?.success && fetcher.data.organization) {
      setOrganizationName(fetcher.data.organization.name);
    } else if (fetcher.data?.error) {
      toast.error('Failed to fetch organization');
    }
  }, [fetcher.data]);

  const handleSave = () => {
    fetcher.submit(
      { name: organizationName },
      {
        method: 'PUT',
        action: '/api/organization',
        encType: 'application/json',
      },
    );
  };

  const isLoading = fetcher.state !== 'idle';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-2">
        <h2 className="text-lg font-medium text-liblab-elements-textPrimary">Organization</h2>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="orgName" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
            Name
          </label>
          <input
            id="orgName"
            type="text"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter organization name"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-gray-950 dark:text-gray-950 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
