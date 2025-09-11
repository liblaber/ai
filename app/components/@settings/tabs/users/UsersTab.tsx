import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Clock, Mail, Plus, Search, Trash2 } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
import { toast } from 'sonner';
import { useUserStore } from '~/lib/stores/user';
import UsersDetails from './UsersDetails';
import { classNames } from '~/utils/classNames';
import { FilterButton } from '~/components/@settings/shared/components/FilterButton';
import ActiveFilters from '~/components/@settings/shared/components/ActiveFilters';

interface Role {
  id: string;
  name: string;
  description: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  roleId: string;
  roleName: string;
}

interface PendingInvite {
  id: string;
  email: string;
  roleId: string;
  roleName: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string | null;
  invitedBy: string;
}

type LoaderData = {
  users: User[];
  usersWithoutRoles: User[];
};

interface RoleDropdownProps {
  value: string;
  onChange: (roleId: string) => void;
  triggerClassName?: string;
  roles: Role[];
}

function RoleDropdown({ value, onChange, triggerClassName, roles }: RoleDropdownProps) {
  const currentRole = roles.find((role) => role.id === value);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={
            triggerClassName ||
            'px-3 py-1.5 text-sm rounded-lg bg-gray-600/70 text-white hover:bg-gray-600 transition-colors flex items-center gap-2 min-w-[102px] justify-between'
          }
        >
          {currentRole?.name || 'Select Role'}
          <ChevronDown className="w-4 h-4" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[140px] bg-[#2A2A2A] rounded-lg p-1 shadow-xl z-[9999]"
          sideOffset={5}
          align="end"
        >
          {roles.map((role) => (
            <Tooltip.Root key={role.id}>
              <Tooltip.Trigger asChild>
                <DropdownMenu.Item
                  className="text-sm text-white px-3 py-2 rounded hover:bg-gray-600/50 cursor-pointer outline-none flex items-center justify-between group"
                  onSelect={() => onChange(role.id)}
                >
                  {role.name}
                  {value === role.id && <Check className="w-4 h-4" />}
                </DropdownMenu.Item>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="bg-[#1A1A1A] p-2 rounded-lg text-xs text-gray-300 w-[190px] border border-[#333333] z-[99999] select-none animate-in fade-in-0 zoom-in-95"
                  side="left"
                  sideOffset={5}
                >
                  {role.description || `${role.name} role`}
                  <Tooltip.Arrow className="fill-[#333333]" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export default function UsersTab() {
  const { user } = useUserStore();
  const currentUserId = user?.id;
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [usersWithoutRoles, setUsersWithoutRoles] = useState<User[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [showUsersWithoutRoles, setShowUsersWithoutRoles] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);

        const response = await fetch('/api/user');
        const data: LoaderData = await response.json();

        if (data.users) {
          setUsers(data.users);
        }

        if (data.usersWithoutRoles) {
          setUsersWithoutRoles(data.usersWithoutRoles);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to fetch users');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchRoles = async () => {
      try {
        const response = await fetch('/api/roles');
        const data = (await response.json()) as { success: boolean; roles?: Role[] };

        if (data.success && data.roles) {
          setRoles(data.roles);
        }
      } catch (error) {
        console.error('Error fetching roles:', error);
        toast.error('Failed to fetch roles');
      }
    };

    const fetchPendingInvites = async () => {
      try {
        const response = await fetch('/api/invites?status=PENDING');
        const data = (await response.json()) as { success: boolean; invites?: PendingInvite[] };

        if (data.success && data.invites) {
          setPendingInvites(data.invites);
        }
      } catch (error) {
        console.error('Error fetching pending invites:', error);
        toast.error('Failed to fetch pending invites');
      }
    };

    fetchUsers();
    fetchRoles();
    fetchPendingInvites();
  }, []);

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    try {
      setUpdatingUserId(userId);

      const response = await fetch('/api/user', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, roleId: newRoleId }),
      });

      const data = (await response.json()) as { success: boolean; error?: string };

      if (data.success) {
        // Update the user's role in the local state
        const newRole = roles.find((role) => role.id === newRoleId);

        // Check if user was in the "without roles" list
        const userWithoutRole = usersWithoutRoles.find((user) => user.id === userId);

        if (userWithoutRole) {
          // Move user from "without roles" to "with roles" list
          setUsersWithoutRoles((prev) => prev.filter((user) => user.id !== userId));
          setUsers((prev) => [
            ...prev,
            { ...userWithoutRole, roleId: newRoleId, roleName: newRole?.name || 'Unknown Role' },
          ]);
        } else {
          // Update existing user in "with roles" list
          setUsers((prevUsers) =>
            prevUsers.map((user) =>
              user.id === userId ? { ...user, roleId: newRoleId, roleName: newRole?.name || 'Unknown Role' } : user,
            ),
          );
        }

        toast.success('User role updated successfully');
      } else {
        toast.error(data.error || 'Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const addFilter = (filter: string) => {
    if (!activeFilters.includes(filter)) {
      setActiveFilters([...activeFilters, filter]);
    }
  };

  const removeFilter = (filter: string) => {
    setActiveFilters(activeFilters.filter((f) => f !== filter));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
  };

  const handleDeleteInvite = async (inviteId: string) => {
    try {
      const response = await fetch(`/api/invites/${inviteId}`, {
        method: 'DELETE',
      });

      const data = (await response.json()) as { success: boolean; error?: string };

      if (data.success) {
        setPendingInvites((prev) => prev.filter((invite) => invite.id !== inviteId));
        toast.success('Invite removed successfully');
      } else {
        toast.error(data.error || 'Failed to remove invite');
      }
    } catch (error) {
      console.error('Error deleting invite:', error);
      toast.error('Failed to remove invite');
    }
  };

  const formatExpirationDate = (expiresAt: string) => {
    const date = new Date(expiresAt);
    const now = new Date();
    const diffInHours = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (diffInHours <= 0) {
      return 'Expired';
    } else if (diffInHours < 24) {
      return `${diffInHours}h left`;
    } else {
      const diffInDays = Math.ceil(diffInHours / 24);
      return `${diffInDays}d left`;
    }
  };

  const filteredUsers = useMemo(() => {
    // Combine users and pending invites into a single list
    const allMembers = [
      ...users.map((user) => ({ ...user, type: 'user' as const })),
      ...pendingInvites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        name: invite.email, // Use email as name for invites
        roleId: invite.roleId,
        roleName: invite.roleName,
        type: 'invite' as const,
        expiresAt: invite.expiresAt,
      })),
    ];

    return allMembers.filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilters =
        activeFilters.length === 0 ||
        activeFilters.some((filter) => {
          return member.roleName === filter;
        });

      return matchesSearch && matchesFilters;
    });
  }, [users, pendingInvites, searchQuery, activeFilters]);

  const handleBack = useCallback(() => {
    setShowDetails(false);
  }, []);

  if (showDetails) {
    return <UsersDetails onBack={handleBack} />;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-2">
          <h2 className="text-lg text-white">Members</h2>
          <span className="text-lg text-gray-400">Loading...</span>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="text-gray-400">Loading members...</div>
        </div>
      </div>
    );
  }

  return (
    <Tooltip.Provider delayDuration={50}>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg text-white">Members</h2>
            <span className="text-lg text-gray-400">
              {filteredUsers.length}
              {pendingInvites.length > 0 && (
                <span className="text-sm text-blue-400 ml-1">({pendingInvites.length} pending)</span>
              )}
            </span>
          </div>
          <button
            onClick={() => setShowDetails(true)}
            className={classNames(
              'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              'bg-accent-500 hover:bg-accent-600',
              'text-gray-950 dark:text-gray-950',
            )}
          >
            <Plus className="w-4 h-4" />
            Add member
          </button>
        </div>

        <div className="relative px-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-10 pr-2.5 py-2 rounded-[50px] bg-gray-600/50 text-white placeholder-gray-400 focus:outline-none"
                placeholder="Search..."
              />
            </div>

            <FilterButton
              options={roles}
              getOptionLabel={(option) => option.name}
              onSelect={(option) => addFilter(option.name)}
            />
          </div>
        </div>

        <ActiveFilters filters={activeFilters} onRemove={removeFilter} onClearAll={clearAllFilters} />

        <div className="px-2">
          <div className="flex justify-between text-sm text-gray-400 px-4 py-2 border-b border-gray-700">
            <span>User</span>
            <span>Permission</span>
          </div>

          <div className="overflow-y-auto h-89 space-y-px">
            {filteredUsers.map((member) => (
              <div
                key={member.id}
                className={`flex items-center justify-between p-4 border-b border-gray-700/50 ${
                  member.type === 'invite' ? 'bg-blue-900/10' : ''
                }`}
              >
                <div className="space-y-1">
                  <div className="text-sm text-white flex items-center gap-2">
                    {member.type === 'invite' && <Mail className="w-3 h-3 text-blue-400" />}
                    {member.name}
                  </div>
                  <div className="text-sm text-gray-400 flex items-center gap-2">
                    {member.type === 'invite' && (
                      <>
                        <Clock className="w-3 h-3" />
                        {formatExpirationDate(member.expiresAt)}
                      </>
                    )}
                    {member.type === 'user' && member.email}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {member.type === 'invite' ? (
                    <>
                      <span className="px-2 py-1 text-xs rounded bg-blue-500/20 text-blue-300">{member.roleName}</span>
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <button
                            onClick={() => handleDeleteInvite(member.id)}
                            className="p-1.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content
                            className="bg-[#1A1A1A] p-2 rounded-lg text-xs text-gray-300 border border-[#333333] z-[99999] select-none animate-in fade-in-0 zoom-in-95"
                            side="left"
                            sideOffset={5}
                          >
                            Remove invite
                            <Tooltip.Arrow className="fill-[#333333]" />
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    </>
                  ) : (
                    <>
                      {member.id !== currentUserId ? (
                        <RoleDropdown
                          value={member.roleId}
                          onChange={(newRoleId) => handleRoleChange(member.id, newRoleId)}
                          roles={roles}
                          triggerClassName={
                            updatingUserId === member.id
                              ? 'px-3 py-1.5 text-sm rounded-lg bg-gray-600/70 text-white hover:bg-gray-600 transition-colors flex items-center gap-2 min-w-[102px] justify-between opacity-50 cursor-not-allowed'
                              : undefined
                          }
                        />
                      ) : (
                        <span className="text-sm text-gray-400">{member.roleName}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Users Without Roles - Collapsible Section */}
            {usersWithoutRoles.length > 0 && (
              <div className="px-2 mt-2">
                <button
                  onClick={() => setShowUsersWithoutRoles(!showUsersWithoutRoles)}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-2"
                >
                  {showUsersWithoutRoles ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  Users without roles ({usersWithoutRoles.length})
                </button>

                {showUsersWithoutRoles && (
                  <div className="space-y-px">
                    {usersWithoutRoles.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 border-b border-gray-700/50 bg-gray-800/20"
                      >
                        <div className="space-y-1">
                          <div className="text-sm text-white">{user.name}</div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                        </div>
                        <div>
                          {user.id !== currentUserId ? (
                            <RoleDropdown
                              value=""
                              onChange={(newRoleId) => handleRoleChange(user.id, newRoleId)}
                              roles={roles}
                              triggerClassName={
                                updatingUserId === user.id
                                  ? 'px-3 py-1.5 text-sm rounded-lg bg-gray-600/70 text-white hover:bg-gray-600 transition-colors flex items-center gap-2 min-w-[102px] justify-between opacity-50 cursor-not-allowed'
                                  : 'px-3 py-1.5 text-sm rounded-lg bg-orange-500/70 text-white hover:bg-orange-500 transition-colors flex items-center gap-2 min-w-[102px] justify-between'
                              }
                            />
                          ) : (
                            <span className="text-sm text-gray-400">No Role</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
