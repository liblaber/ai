import { useEffect, useState } from 'react';
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
  const [organizationName, setOrganizationName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        setIsLoading(true);

        const response = await fetch('/api/organization');
        const data: OrganizationResponse = await response.json();

        if (data.success && data.organization) {
          setOrganizationName(data.organization.name);
        } else if (data.error) {
          toast.error('Failed to fetch organization');
        }
      } catch (error) {
        console.error('Error fetching organization:', error);
        toast.error('Failed to fetch organization');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganization();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const response = await fetch('/api/organization', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: organizationName }),
      });

      const data: OrganizationResponse = await response.json();

      if (data.success) {
        toast.success('Organization updated successfully');
      } else {
        toast.error(data.error || 'Failed to update organization');
      }
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error('Failed to update organization');
    } finally {
      setIsSaving(false);
    }
  };

  const isDisabled = isLoading || isSaving;

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
            disabled={isDisabled}
          />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isDisabled}
            className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-gray-950 dark:text-gray-950 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
