import { useEffect, useState } from 'react';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { resetControlPanelHeader, setControlPanelHeader } from '~/lib/stores/settings';
import { Dialog, DialogClose, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import type { Role } from './types';
import RoleMembers from './RoleMembers';
import AssignRoleMembers from './AssignRoleMembers';
import { classNames } from '~/utils/classNames';

const ROLE_TABS = ['Members', 'Environments', 'Data Sources', 'Apps'];
interface RoleDetailsProps {
  role: Role;
  onBack(): void;
  onRoleUpdate: (updatedRole: Role) => void;
  onRoleDelete: () => void;
}

export default function RoleDetails({ role, onBack, onRoleUpdate, onRoleDelete }: RoleDetailsProps) {
  const [roleName, setRoleName] = useState(role.name);
  const [roleDescription, setRoleDescription] = useState(role.description);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('Members');
  const [showAssignedMembers, setShowAssignedMembers] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
        return (
          <RoleMembers role={role} onRoleUpdate={onRoleUpdate} onAssignMembers={() => setShowAssignedMembers(true)} />
        );
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

  const handleDelete = async () => {
    try {
      setIsDeleting(true);

      const response = await fetch(`/api/roles/${role.id}`, {
        method: 'DELETE',
      });

      const data: { success: boolean; error?: string } = await response.json();

      if (data.success) {
        toast.success('Role deleted successfully');
        onRoleDelete();
      } else {
        toast.error(data.error || 'Failed to delete role');
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete role');
    } finally {
      setIsDeleting(false);
    }
  };

  const isSaveDisabled =
    isSaving || roleName.trim() === '' || (role.name === roleName && role.description === roleDescription);

  if (showAssignedMembers) {
    return (
      <AssignRoleMembers
        role={role}
        onRoleUpdate={onRoleUpdate}
        closeAssignMembers={() => {
          setShowAssignedMembers(false);
          setControlPanelHeader({
            title: `Edit "${role.name}"`,
            onBack,
          });
        }}
      />
    );
  }

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
        <div className="flex justify-between p-4">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className={classNames(
              'inline-flex items-center gap-2 px-3 py-1.75 text-sm rounded-lg transition-colors',
              'border border-gray-600',
              'bg-gray-100 hover:bg-gray-200',
              'dark:bg-gray-900 dark:hover:bg-gray-800',
              'text-gray-800 dark:text-gray-200',
              'cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaveDisabled}
            className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-gray-950 dark:text-gray-950 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <DialogRoot open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <Dialog>
          <div className="rounded-xl bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#F5F5F5] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#1A1A1A]">
                    <Trash2 className="w-5 h-5 text-tertiary" />
                  </div>
                  <div>
                    <DialogTitle title={`Delete "${role.name}" role`} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-secondary">
                  This action cannot be undone. All permissions associated with this role will be removed from the
                  members.
                </p>
                {role.users.length > 0 && (
                  <p className="text-sm text-secondary">
                    This role is currently assigned to {role.users.length} member(s).
                  </p>
                )}
                <p className="text-sm text-secondary">Are you sure you want to delete the role "{role.name}"?</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-[#E5E5E5] dark:border-[#1A1A1A]">
                <DialogClose asChild>
                  <button
                    className={classNames(
                      'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                      'bg-[#F5F5F5] hover:bg-[#E5E5E5]',
                      'dark:bg-[#1A1A1A] dark:hover:bg-[#2A2A2A]',
                      'text-primary',
                    )}
                  >
                    Cancel
                  </button>
                </DialogClose>
                <button
                  onClick={handleDelete}
                  className={classNames(
                    'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    'bg-red-500 hover:bg-red-600',
                    'text-white',
                  )}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      </DialogRoot>
    </div>
  );
}
