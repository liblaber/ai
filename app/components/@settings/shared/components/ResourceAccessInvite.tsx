import { useState } from 'react';
import { ArrowLeft, CircleX } from 'lucide-react';
import { toast } from 'sonner';
import { RoleScope } from '@prisma/client';
import { classNames } from '~/utils/classNames';
import type { ResourceRoleScope } from '~/lib/services/roleService';
import { isValidEmail } from '~/lib/utils/invite-utils';
import { Badge } from '~/components/ui/Badge';
import { BaseSelect, type SelectOption } from '~/components/ui/Select';
import { Input } from '~/components/ui/Input';
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

export default function ResourceAccessInvite({ resourceScope, resource, onBack }: ResourceAccessMembersProps) {
  const [inviteEmails, setInviteEmails] = useState(new Set<string>());
  const [email, setEmail] = useState('');
  const [addEmailMessage, setAddEmailMessage] = useState('');
  const [permissionOption, setPermissionOption] = useState<SelectOption>(permissionOptions[0]);
  const [isInviting, setIsInviting] = useState(false);

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

  const resourceName = resource.name || resource.site_name || '';

  const handleAddEmail = () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setAddEmailMessage('Please enter a valid email address.');
      return;
    }

    setInviteEmails((prev) => new Set(prev).add(trimmedEmail));
    setEmail('');
    setAddEmailMessage('');
  };

  const handleInvite = async () => {
    setIsInviting(true);

    try {
      await Promise.all(
        Array.from(inviteEmails).map((email) =>
          fetch(`/api/${resourceType}/${resource.id}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, permissionLevel: permissionOption.value }),
          }).then(async (res) => {
            if (!res.ok) {
              logger.error(`Failed to invite "${email}"`);
              toast.error(`Failed to invite "${email}"`);
            }
          }),
        ),
      );
    } finally {
      setIsInviting(false);
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
              <h2 className="text-lg font-medium text-primary">{`Invite to "${resourceName}" ${resourceLabel}`}</h2>
              <p className="text-sm text-secondary">Invite members to share access</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <div>
          <Label htmlFor="invite-email-input" className="mb-3 block text-gray-300">
            Emails
          </Label>
          <Input
            id="invite-email-input"
            autoComplete="off"
            type="text"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setEmail(e.target.value);

              if (addEmailMessage) {
                setAddEmailMessage('');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddEmail();
              }
            }}
            placeholder="Enter email and press enter..."
          />
          {addEmailMessage && <p className="text-sm text-red-500">{addEmailMessage}</p>}
        </div>

        <div>
          {Array.from(inviteEmails).map((inviteEmail) => (
            <Badge key={inviteEmail} className="bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
              {inviteEmail}
              <CircleX
                className="pl-2 cursor-pointer"
                onClick={() => {
                  setInviteEmails((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(inviteEmail);

                    return newSet;
                  });
                }}
              />
            </Badge>
          ))}
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
            onClick={handleInvite}
            disabled={isInviting || inviteEmails.size === 0}
            className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-gray-950 dark:text-gray-950 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isInviting
              ? 'Inviting Members...'
              : `Send ${inviteEmails.size > 0 ? inviteEmails.size : ''} invite${inviteEmails.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
