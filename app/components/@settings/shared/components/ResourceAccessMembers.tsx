import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { RoleScope } from '@prisma/client';
import { classNames } from '~/utils/classNames';
import type { ResourceRoleScope } from '~/lib/services/roleService';
import type { PermissionLevel } from '~/lib/services/permissionService';
import type { ResourceMember } from '~/lib/utils/resource-utils';
import { BaseSelect, type SelectOption } from '~/components/ui/Select';
import WithTooltip from '~/components/ui/Tooltip';
import { Dialog, DialogClose, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import { logger } from '~/utils/logger';

export const permissionOptions: SelectOption[] = [
  { value: 'manage', label: 'Full Access' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'remove', label: 'Remove Access' },
];

type ResourceAccessMembersProps = {
  resourceScope: ResourceRoleScope;
  resourceId: string;
  onInvite: () => void;
};

export default function ResourceAccessMembers({ resourceScope, resourceId, onInvite }: ResourceAccessMembersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resourceMembers, setResourceMembers] = useState<ResourceMember[]>([]);
  const [removeMember, setRemoveMember] = useState<ResourceMember | null>(null);

  let resourceType: string;

  switch (resourceScope) {
    case RoleScope.ENVIRONMENT:
      resourceType = 'environments';
      break;
    case RoleScope.DATA_SOURCE:
      resourceType = 'data-sources';
      break;
    case RoleScope.WEBSITE:
      resourceType = 'websites';
      break;
    default:
      resourceType = 'unknown';
  }

  useEffect(() => {
    const fetchResourceAccessMembers = async () => {
      try {
        setIsLoading(true);

        const response = await fetch(`/api/${resourceType}/${resourceId}/members`);
        const data: { members: ResourceMember[] } = await response.json();
        setResourceMembers(data.members);
      } catch (error) {
        logger.error(`Error fetching ${resourceType} members:`, error);
        toast.error(`Failed to fetch ${resourceType} members`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResourceAccessMembers();
  }, [resourceType, resourceId]);

  const filteredMembers = useMemo(
    () =>
      resourceMembers.filter(
        (member) =>
          member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.email.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [resourceMembers, searchQuery],
  );

  const handlePermissionChange = async (memberId: string, newPermissionLevel: PermissionLevel) => {
    try {
      const response = await fetch(`/api/${resourceType}/${resourceId}/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissionLevel: newPermissionLevel }),
      });

      if (!response.ok) {
        throw new Error('Failed to update permission');
      }

      setResourceMembers((prev) =>
        prev.map((member) =>
          member.id === memberId ? { ...member, role: { ...member.role, type: newPermissionLevel } } : member,
        ),
      );
    } catch (error) {
      logger.error(`Error updating permission for member ${memberId}:`, error);
      toast.error(`Failed to update permission for member ${memberId}`);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeMember) {
      return;
    }

    try {
      const response = await fetch(`/api/${resourceType}/${resourceId}/members/${removeMember.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to remove member');
      }

      setResourceMembers((prev) => prev.filter((member) => member.id !== removeMember.id));
    } catch (error) {
      logger.error(`Error removing member ${removeMember.id}:`, error);
      toast.error(`Failed to remove member ${removeMember.id}`);
    } finally {
      setRemoveMember(null);
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center gap-2 p-2">
          <Users className="w-4 h-4 text-gray-500" />
          Members with access
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="text-gray-400">Loading members with access...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 p-2">
        <Users className="w-4 h-4 text-gray-500" />
        Members with access
        <span className="text-sm text-gray-500 dark:text-gray-400">{resourceMembers.length}</span>
      </div>
      <div className="flex mb-3 items-center gap-3">
        <div className="relative flex-1">
          <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={classNames(
              'w-full h-9 pl-7 pr-2.5 py-2 rounded-lg',
              'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
              'focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent',
              'placeholder-gray-500 dark:placeholder-gray-400',
            )}
            placeholder="Search members..."
          />
        </div>
        <button
          onClick={onInvite}
          className={classNames(
            'inline-flex items-center gap-1 pl-2 pr-3 py-1.75 text-sm rounded-lg transition-colors',
            'border border-gray-600',
            'bg-gray-100 hover:bg-gray-200',
            'dark:bg-gray-900 dark:hover:bg-gray-800',
            'text-gray-800 dark:text-gray-200',
            'cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <Plus className="w-3 h-3 text-white" />
          Invite
        </button>
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-gray-400 border-b border-gray-700/50">
            <th className="px-4 py-2 font-normal">Member</th>
            <th className="px-4 py-2 font-normal">Permission</th>
          </tr>
        </thead>
        <tbody>
          {filteredMembers.map((member) => {
            let inheritedPermission = false;
            let selectedOption: SelectOption | undefined = undefined;

            if (member.role.type === 'general') {
              inheritedPermission = true;
            } else {
              selectedOption = permissionOptions.find((option) => option.value === member.role.type);
            }

            return (
              <tr key={member.id} className="border-b border-gray-700/50">
                <td className="px-4 py-2">
                  <div className="space-y-1">
                    <div className="text-sm">{member.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{member.email}</div>
                  </div>
                </td>
                <td className="w-[50px] px-4 py-2">
                  {inheritedPermission ? (
                    <WithTooltip tooltip={`This user has permissions inherited from the "${member.role.name}" role`}>
                      <span className="text-gray-500 dark:text-gray-400 cursor-default">Inherited</span>
                    </WithTooltip>
                  ) : (
                    <BaseSelect
                      value={selectedOption}
                      onChange={(option) => {
                        if (option?.value && option.value !== member.role.type) {
                          if (option.value === 'remove') {
                            setRemoveMember(member);
                          } else {
                            handlePermissionChange(member.id, option.value as PermissionLevel);
                          }
                        }
                      }}
                      options={permissionOptions}
                      width="150px"
                      minWidth="150px"
                      isSearchable={false}
                      menuPlacement="bottom"
                    />
                  )}
                </td>
              </tr>
            );
          })}
          {filteredMembers.length === 0 && (
            <tr>
              <td colSpan={2} className="px-4 py-2 text-gray-400">
                No members found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <DialogRoot open={Boolean(removeMember)} onOpenChange={(open) => !open && setRemoveMember(null)}>
        <Dialog>
          <div className="rounded-xl bg-white dark:bg-[#0A0A0A] border border-[#E5E5E5] dark:border-[#1A1A1A] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#F5F5F5] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#1A1A1A]">
                    <Trash2 className="w-5 h-5 text-tertiary" />
                  </div>
                  <div>
                    <DialogTitle title="Remove Access" />
                    <p className="text-sm text-secondary">This action cannot be undone</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-secondary">
                  Are you sure you want to remove access for {removeMember?.email}?
                </p>
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
                  onClick={handleRemoveMember}
                  className={classNames(
                    'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    'bg-red-500 hover:bg-red-600',
                    'text-white',
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      </DialogRoot>
    </div>
  );
}
