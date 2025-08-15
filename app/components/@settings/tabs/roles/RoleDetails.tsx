import { useEffect, useState } from 'react';
import { resetControlPanelHeader, setControlPanelHeader } from '~/lib/stores/settings';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { toast } from 'sonner';
import type { Role } from './types';
import RoleMembers from './RoleMembers';
import { classNames } from '~/utils/classNames';

const ROLE_TABS = ['Members', 'Environments', 'Data Sources', 'Apps'];
interface RoleDetailsProps {
  role: Role;
  onBack(): void;
  onRoleUpdate: (updatedRole: Role) => void;
}

export default function RoleDetails({ role, onBack, onRoleUpdate }: RoleDetailsProps) {
  const [roleName, setRoleName] = useState(role.name);
  const [roleDescription, setRoleDescription] = useState(role.description);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('Members');

  useEffect(() => {
    setControlPanelHeader({
      title: `Edit "${role.name}"`,
      onBack,
    });

    // clear the header when the component unmounts
    return () => {
      resetControlPanelHeader();
    };
  }, [role.name]);

  const getTabComponent = (tab: string) => {
    switch (tab) {
      case 'Members':
        return <RoleMembers role={role} onRoleUpdate={onRoleUpdate} />;
      case 'Environments':
      case 'Data Sources':
      case 'Apps':
        return <div className="p-4 text-gray-400">This feature is coming soon!</div>;
      default:
        return null;
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const response = await fetch(`/api/roles/${role.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: roleName, description: roleDescription || null }),
      });

      const data: { success: boolean; role: Role; error?: string } = await response.json();
      setIsSaving(false);

      if (data.success) {
        onRoleUpdate({ ...role, name: data.role.name, description: data.role.description });
        toast.success('Role updated successfully');
      } else {
        toast.error(data.error || 'Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    } finally {
      setIsSaving(false);
    }
  };

  const isSaveDisabled =
    isSaving || roleName.trim() === '' || (role.name === roleName && role.description === roleDescription);

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="roleName" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
          Name
        </label>
        <input
          id="roleName"
          type="text"
          value={roleName}
          onChange={(e) => setRoleName(e.target.value)}
          className="w-full px-2 py-1 rounded-lg bg-gray-700 border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter role name"
        />
      </div>
      <div>
        <label htmlFor="roleDescription" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
          Description
        </label>
        <input
          id="roleDescription"
          type="text"
          value={roleDescription}
          onChange={(e) => setRoleDescription(e.target.value)}
          className="w-full px-2 py-1 rounded-lg bg-gray-700 border border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter role description"
        />
      </div>
      <div className="mt-6">
        <ToggleGroup.Root
          type="single"
          className="flex items-center space-x-2"
          value={activeTab}
          onValueChange={(value) => {
            if (value) {
              setActiveTab(value);
            }
          }}
          aria-label="Role tabs"
        >
          {ROLE_TABS.map((tab) => (
            <ToggleGroup.Item
              key={tab}
              value={tab}
              className={classNames(
                'data-[state=on]:bg-gray-600',
                'data-[state=on]:text-white',
                'data-[state=off]:text-gray-300',
                'data-[state=off]:hover:bg-gray-700/50',
                'cursor-pointer flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              )}
              data-state={activeTab === tab ? 'on' : 'off'}
            >
              {tab}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
      </div>
      <div className="mt-4 min-h-74">{getTabComponent(activeTab)}</div>

      <div className="sticky bottom-0 left-0 right-0 -m-6 border-t border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="flex justify-end p-4">
          <button
            onClick={handleSave}
            disabled={isSaveDisabled}
            className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-gray-950 dark:text-gray-950 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
