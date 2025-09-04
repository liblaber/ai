import { useEffect, useState } from 'react';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { Mail, Globe, UserPlus, Trash2, CircleX } from 'lucide-react';
import { toast } from 'sonner';
import { resetControlPanelHeader, setControlPanelHeader } from '~/lib/stores/settings';
import { Dialog, DialogClose, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import { classNames } from '~/utils/classNames';
import { format } from 'date-fns';
import { isValidEmail } from '~/lib/utils/invite-utils';
import { Badge } from '~/components/ui/Badge';
import { Input } from '~/components/ui/Input';
import { Label } from '~/components/ui/Label';

interface Role {
  id: string;
  name: string;
  description: string;
}

interface MemberInvite {
  id: string;
  email: string;
  roleId: string;
  roleName: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  createdAt: string;
}

interface DomainInvite {
  id: string;
  domain: string;
  defaultRoleId: string;
  defaultRoleName: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

const USER_TABS = ['Invite Members', 'Domain Invites', 'Pending Invites'];

interface MembersDetailsProps {
  onBack(): void;
}

export default function MembersDetails({ onBack }: MembersDetailsProps) {
  const [activeTab, setActiveTab] = useState('Invite Members');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [inviteToDelete, setInviteToDelete] = useState<MemberInvite | DomainInvite | null>(null);

  // Roles state
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);

  // Invite specific users state
  const [inviteEmails, setInviteEmails] = useState(new Set<string>());
  const [inviteEmail, setInviteEmail] = useState('');
  const [addEmailMessage, setAddEmailMessage] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState<string>('');
  const [isInviting, setIsInviting] = useState(false);

  // Domain invite state
  // const [domainEmail, setDomainEmail] = useState('');
  // const [domainDefaultRoleId, setDomainDefaultRoleId] = useState<string>('');
  // const [setIsAddingDomain] = useState(false);

  // Real data from API
  const [pendingInvites, setPendingInvites] = useState<MemberInvite[]>([]);
  const [domainInvites, setDomainInvites] = useState<DomainInvite[]>([]);

  useEffect(() => {
    setControlPanelHeader({
      title: 'Invite Members',
      onBack,
    });

    // Fetch available roles and invites
    fetchRoles();
    fetchInvites();
    fetchDomainInvites();

    return () => {
      resetControlPanelHeader();
    };
  }, []); // Remove onBack dependency to prevent infinite loop

  const fetchRoles = async () => {
    try {
      setIsLoadingRoles(true);

      const response = await fetch('/api/roles');
      const data = (await response.json()) as { success: boolean; roles?: Role[] };

      if (data.success && data.roles) {
        setRoles(data.roles);

        // Set default role if available
        if (data.roles.length > 0) {
          setInviteRoleId(data.roles[0].id);
          //setDomainDefaultRoleId(data.roles[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to fetch roles');
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const fetchInvites = async () => {
    try {
      const response = await fetch('/api/invites?status=PENDING');
      const data = (await response.json()) as { success: boolean; invites?: MemberInvite[] };

      if (data.success && data.invites) {
        setPendingInvites(data.invites);
      }
    } catch (error) {
      console.error('Error fetching invites:', error);
      toast.error('Failed to fetch invites');
    }
  };

  const fetchDomainInvites = async () => {
    try {
      const response = await fetch('/api/domain-invites');
      const data = (await response.json()) as { success: boolean; domainInvites?: DomainInvite[] };

      if (data.success && data.domainInvites) {
        setDomainInvites(data.domainInvites);
      }
    } catch (error) {
      console.error('Error fetching domain invites:', error);
      toast.error('Failed to fetch domain invites');
    }
  };

  const handleAddEmail = () => {
    const trimmedEmail = inviteEmail.trim();

    if (!trimmedEmail) {
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setAddEmailMessage('Please enter a valid email address.');
      return;
    }

    setInviteEmails((prev) => new Set(prev).add(trimmedEmail));
    setInviteEmail('');
    setAddEmailMessage('');
  };

  const getTabComponent = (tab: string) => {
    switch (tab) {
      case 'Invite Members':
        return (
          <div className="space-y-6">
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <h3 className="text-sm font-medium text-white mb-3">Invite Specific Members</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="invite-email-input" className="mb-3 block text-gray-300">
                    Emails
                  </Label>
                  <Input
                    id="invite-email-input"
                    autoComplete="off"
                    type="text"
                    value={inviteEmail}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setInviteEmail(e.target.value);

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
                  {Array.from(inviteEmails).map((email) => (
                    <Badge
                      key={email}
                      className="bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 mr-2 mb-2"
                    >
                      {email}
                      <CircleX
                        className="pl-2 cursor-pointer"
                        onClick={() => {
                          setInviteEmails((prev) => {
                            const newSet = new Set(prev);
                            newSet.delete(email);

                            return newSet;
                          });
                        }}
                      />
                    </Badge>
                  ))}
                </div>

                <div>
                  <Label htmlFor="inviteRole" className="mb-3 block text-gray-300">
                    Role
                  </Label>
                  <select
                    id="inviteRole"
                    value={inviteRoleId}
                    onChange={(e) => setInviteRoleId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoadingRoles}
                  >
                    {isLoadingRoles ? (
                      <option>Loading roles...</option>
                    ) : (
                      roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    onClick={handleInviteMember}
                    disabled={inviteEmails.size === 0 || isInviting}
                    className={classNames(
                      'inline-flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-lg transition-colors',
                      'bg-accent-500 hover:bg-accent-600 disabled:bg-accent-300',
                      'text-gray-950 dark:text-gray-950 disabled:text-gray-600',
                      'disabled:cursor-not-allowed',
                    )}
                  >
                    {isInviting
                      ? 'Inviting...'
                      : `Create ${inviteEmails.size > 0 ? inviteEmails.size : ''} member${inviteEmails.size !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'Domain Invites':
        return (
          <div className="space-y-4">
            <div className="p-8 bg-gray-800/50 rounded-lg border border-gray-700 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="p-3 bg-gray-700 rounded-full">
                  <Globe className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">Domain Invites</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Invite users by domain to automatically grant access to anyone with an email from your organization.
                  </p>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium">
                    Coming Soon
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'Pending Invites':
        return (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-white">Pending Member Invites</h3>
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-sm text-white">{invite.email}</div>
                    <div className="text-xs text-gray-400">
                      Role: {invite.roleName} • Sent {format(new Date(invite.createdAt), 'PP')}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteInvite(invite)}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  const handleInviteMember = async () => {
    if (inviteEmails.size === 0 || !inviteRoleId) {
      return;
    }

    try {
      setIsInviting(true);

      // Send invites for all emails
      const invitePromises = Array.from(inviteEmails).map((email) =>
        fetch('/api/invites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            roleId: inviteRoleId,
          }),
        })
          .then(async (response) => {
            const data = (await response.json()) as { success: boolean; message?: string; error?: string };

            if (!data.success) {
              throw new Error(data.error || `Failed to invite ${email}`);
            }

            return { email, success: true };
          })
          .catch((error) => {
            console.error(`Error inviting ${email}:`, error);
            return { email, success: false, error: error.message };
          }),
      );

      const results = await Promise.all(invitePromises);

      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      if (successful.length > 0) {
        setInviteEmails(new Set());
        toast.success(`${successful.length} invitation${successful.length !== 1 ? 's' : ''} sent successfully`);
        // Refresh the invites list
        fetchInvites();
      }

      if (failed.length > 0) {
        toast.error(`${failed.length} invitation${failed.length !== 1 ? 's' : ''} failed to send`);
      }
    } catch (error) {
      console.error('Error sending invites:', error);
      toast.error('Failed to send invites');
    } finally {
      setIsInviting(false);
    }
  };

  // const handleAddDomain = async () => {
  //   if (!domainEmail.trim() || !domainDefaultRoleId) {
  //     return;
  //   }

  //   try {
  //     setIsAddingDomain(true);

  //     const response = await fetch('/api/domain-invites', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         domain: domainEmail,
  //         defaultRoleId: domainDefaultRoleId,
  //       }),
  //     });

  //     const data = (await response.json()) as { success: boolean; message?: string; error?: string };

  //     if (data.success) {
  //       setDomainEmail('');
  //       toast.success(data.message || 'Domain invite created successfully');
  //       // Refresh the domain invites list
  //       fetchDomainInvites();
  //     } else {
  //       toast.error(data.error || 'Failed to add domain');
  //     }
  //   } catch (error) {
  //     console.error('Error adding domain:', error);
  //     toast.error('Failed to add domain');
  //   } finally {
  //     setIsAddingDomain(false);
  //   }
  // };

  const handleDeleteInvite = (invite: MemberInvite | DomainInvite) => {
    setInviteToDelete(invite);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!inviteToDelete) {
      return;
    }

    try {
      if ('domain' in inviteToDelete) {
        // Delete domain invite
        const response = await fetch(`/api/domain-invites/${inviteToDelete.id}`, {
          method: 'DELETE',
        });

        const data = (await response.json()) as { success: boolean; message?: string; error?: string };

        if (data.success) {
          setDomainInvites(domainInvites.filter((d) => d.id !== inviteToDelete.id));
          toast.success(data.message || 'Domain invite removed successfully');
        } else {
          toast.error(data.error || 'Failed to remove domain invite');
        }
      } else {
        // Delete user invite
        const response = await fetch(`/api/invites/${inviteToDelete.id}`, {
          method: 'DELETE',
        });

        const data = (await response.json()) as { success: boolean; message?: string; error?: string };

        if (data.success) {
          setPendingInvites(pendingInvites.filter((i) => i.id !== inviteToDelete.id));
          toast.success(data.message || 'Member invite removed successfully');
        } else {
          toast.error(data.error || 'Failed to remove user invite');
        }
      }
    } catch (error) {
      console.error('Error removing invite:', error);
      toast.error('Failed to remove invite');
    } finally {
      setShowDeleteConfirm(false);
      setInviteToDelete(null);
    }
  };

  return (
    <div className="space-y-3">
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
          aria-label="Member management tabs"
        >
          {USER_TABS.map((tab) => (
            <ToggleGroup.Item
              key={tab}
              value={tab}
              className={classNames(
                'data-[state=on]:bg-gray-600',
                'data-[state=on]:text-white',
                'data-[state=off]:text-gray-300',
                'data-[state=off]:hover:bg-gray-700/50',
                'cursor-pointer flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              )}
              data-state={activeTab === tab ? 'on' : 'off'}
            >
              {tab === 'Invite Members' && <UserPlus className="w-4 h-4" />}
              {tab === 'Domain Invites' && <Globe className="w-4 h-4" />}
              {tab === 'Pending Invites' && <Mail className="w-4 h-4" />}
              {tab}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
      </div>

      <div className="mt-4 min-h-74">{getTabComponent(activeTab)}</div>

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
                    <DialogTitle title="Remove Invite" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-secondary">
                  Are you sure you want to remove this invite? This action cannot be undone.
                </p>
                {inviteToDelete && (
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {'domain' in inviteToDelete
                        ? `Domain: ${inviteToDelete.domain}`
                        : `Email: ${inviteToDelete.email}`}
                    </p>
                  </div>
                )}
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
                  onClick={confirmDelete}
                  className={classNames(
                    'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    'bg-red-500 hover:bg-red-600',
                    'text-white',
                  )}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      </DialogRoot>
    </div>
  );
}
