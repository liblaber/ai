import { useEffect, useState } from 'react';
import { ArrowLeft, User } from 'lucide-react';
import { toast } from 'sonner';
import { RoleScope } from '@prisma/client';
import { classNames } from '~/utils/classNames';
import type { ResourceRoleScope } from '~/lib/services/roleService';
import type { EligibleMember } from '~/lib/utils/resource-utils';
import { BaseSelect, type SelectOption } from '~/components/ui/Select';
import { Label } from '~/components/ui/Label';
import { logger } from '~/utils/logger';

export const permissionOptions: SelectOption[] = [
  { value: 'manage', label: 'Full Access' },
  { value: 'viewer', label: 'Viewer' },
];

type ResourceAccessMembersProps = {
  resourceScope: ResourceRoleScope;
  resource: { id: string; name?: string; site_name?: string };
  onBack: () => void;
};

export default function AddResourceAccess({ resourceScope, resource, onBack }: ResourceAccessMembersProps) {
  const [eligibleMemberOptions, setEligibleMemberOptions] = useState<SelectOption[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<readonly SelectOption[]>([]);
  const [permissionOption, setPermissionOption] = useState<SelectOption>(permissionOptions[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingAccess, setIsAddingAccess] = useState(false);

  let resourceType: string;
  let resourceLabel: string;

  switch (resourceScope) {
    case RoleScope.ENVIRONMENT:
      resourceType = 'environments';
      resourceLabel = 'Environment';
      break;
    case RoleScope.DATA_SOURCE:
      resourceType = 'data-sources';
      resourceLabel = 'Data Source';
      break;
    case RoleScope.WEBSITE:
      resourceType = 'websites';
      resourceLabel = 'App';
      break;
    default:
      resourceType = 'unknown';
      resourceLabel = 'Resource';
  }

  useEffect(() => {
    const fetchResourceEligibleMembers = async () => {
      try {
        setIsLoading(true);

        const response = await fetch(`/api/${resourceType}/${resource.id}/eligible-members`);
        const data: { eligibleMembers: EligibleMember[] } = await response.json();
        const eligibleMemberOptions = data.eligibleMembers.map((member) => ({
          value: member.id,
          label: `${member.name} (${member.email})`,
          icon: member.image ? (
            <img
              src={member.image}
              alt="User"
              crossOrigin="anonymous"
              className="w-8 h-8 rounded-full"
              referrerPolicy={'no-referrer'}
            />
          ) : (
            <User className="text-gray h-6 w-6" />
          ),
        }));
        setEligibleMemberOptions(eligibleMemberOptions);
      } catch (error) {
        logger.error(`Error fetching ${resourceType} eligible members:`, error);
        toast.error(`Failed to fetch ${resourceType} eligible members`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResourceEligibleMembers();
  }, [resourceType, resource.id]);

  const resourceName = resource.name || resource.site_name || '';

  const handleAddingAccess = async () => {
    setIsAddingAccess(true);

    try {
      await Promise.all(
        selectedMembers.map((member) =>
          fetch(`/api/${resourceType}/${resource.id}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: member.value, permissionLevel: permissionOption.value }),
          }).then(async (res) => {
            if (!res.ok) {
              logger.error(`Failed to add "${member.label}"`);
              toast.error(`Failed to add "${member.label}"`);
            }
          }),
        ),
      );
    } finally {
      setIsAddingAccess(false);
      onBack();
    }
  };

  return (
    <div>
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className={classNames(
                'inline-flex items-center gap-2 p-2 text-sm font-medium rounded-lg transition-colors',
                'dark:bg-gray-900 dark:text-gray-300',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
              )}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-lg font-medium text-primary">{`Add to "${resourceName}" ${resourceLabel}`}</h2>
              <p className="text-sm text-secondary">Add members to share access</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <div>
          <Label className="mb-3 block text-gray-300">Eligible Members</Label>
          <BaseSelect
            value={selectedMembers}
            onChange={(options) => setSelectedMembers(options)}
            options={eligibleMemberOptions}
            width="100%"
            minWidth="100%"
            isSearchable={true}
            isLoading={isLoading}
            isMulti={true}
            placeholder="Select members to share access"
            menuPlacement="bottom"
          />
        </div>

        <div>
          <Label className="mb-3 block text-gray-300">Permission</Label>
          <BaseSelect
            value={permissionOption}
            onChange={(option: SelectOption | null) => {
              if (option) {
                setPermissionOption(option);
              }
            }}
            options={permissionOptions}
            width="100%"
            minWidth="100%"
            isSearchable={false}
            menuPlacement="bottom"
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleAddingAccess}
            disabled={isAddingAccess || selectedMembers.length === 0}
            className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-gray-950 dark:text-gray-950 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAddingAccess
              ? 'Adding Members...'
              : `Add ${selectedMembers.length > 0 ? selectedMembers.length : ''} member${selectedMembers.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
