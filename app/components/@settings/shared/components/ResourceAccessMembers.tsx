import { useState, useEffect, useMemo } from 'react';
import { Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { RoleScope } from '@prisma/client';
import { classNames } from '~/utils/classNames';
import type { ResourceRoleScope } from '~/lib/services/roleService';
import type { PermissionLevel } from '~/lib/services/permissionService';
import type { ResourceMember } from '~/lib/utils/resource-utils';
import { BaseSelect, type SelectOption } from '~/components/ui/Select';
import WithTooltip from '~/components/ui/Tooltip';

const permissionOptions: SelectOption[] = [
  { value: 'manage', label: 'Full Access' },
  { value: 'viewer', label: 'Viewer' },
];

type ResourceAccessMembersProps = {
  resourceScope: ResourceRoleScope;
  resourceId: string;
};

export default function ResourceAccessMembers({ resourceScope, resourceId }: ResourceAccessMembersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resourceMembers, setResourceMembers] = useState<ResourceMember[]>([]);

  const resourceType = useMemo(() => {
    switch (resourceScope) {
      case RoleScope.ENVIRONMENT:
        return 'environments';
      case RoleScope.DATA_SOURCE:
        return 'data-sources';
      case RoleScope.WEBSITE:
        return 'websites';
      default:
        return 'unknown';
    }
  }, [resourceScope]);

  useEffect(() => {
    const fetchResourceAccessMembers = async () => {
      try {
        setIsLoading(true);

        const response = await fetch(`/api/${resourceType}/${resourceId}/members`);
        const data: { members: ResourceMember[] } = await response.json();
        setResourceMembers(data.members);
      } catch (error) {
        console.error(`Error fetching ${resourceType} members:`, error);
        toast.error(`Failed to fetch ${resourceType} members`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResourceAccessMembers();
  }, []);

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
      console.error(`Error updating permission for member ${memberId}:`, error);
      toast.error(`Failed to update permission for member ${memberId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-400">Loading members with access...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 p-2">
        <Users className="w-4 h-4 text-gray-500" />
        Members with access
        <span className="text-sm text-gray-500 dark:text-gray-400">{resourceMembers.length}</span>
      </div>
      <div className="relative flex-1 mb-3">
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={classNames(
            'w-full h-9 pl-7 pr-2.5 py-2 rounded-[50px]',
            'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
            'focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent',
            'placeholder-gray-500 dark:placeholder-gray-400',
          )}
          placeholder="Search members..."
        />
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

            console.log('member.role.type:', member.role.type);
            console.log('selectedOption:', selectedOption);

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
                          handlePermissionChange(member.id, option.value as PermissionLevel);
                        }
                      }}
                      options={[
                        { value: 'manage', label: 'Full Access' },
                        { value: 'viewer', label: 'Viewer' },
                      ]}
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
    </div>
  );
}
