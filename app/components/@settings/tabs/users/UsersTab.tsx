import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Check, Search, Filter, X, Plus, ChevronRight } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
import { toast } from 'sonner';
import { useUserStore } from '~/lib/stores/user';
import UsersDetails from './UsersDetails';

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
  const [isLoading, setIsLoading] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
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

    fetchUsers();
    fetchRoles();
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

    setShowFilterDropdown(false);
  };

  const removeFilter = (filter: string) => {
    setActiveFilters(activeFilters.filter((f) => f !== filter));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
  };

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const matchesSearch =
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesFilters =
          activeFilters.length === 0 ||
          activeFilters.some((filter) => {
            return user.roleName === filter;
          });

        return matchesSearch && matchesFilters;
      }),
    [users, searchQuery, activeFilters],
  );

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
            <span className="text-lg text-gray-400">{filteredUsers.length}</span>
          </div>
          <button
            onClick={() => setShowDetails(true)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
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

            <DropdownMenu.Root open={showFilterDropdown} onOpenChange={setShowFilterDropdown}>
              <DropdownMenu.Trigger asChild>
                <button className="px-3 py-2 rounded-lg bg-gray-600/70 text-white hover:bg-gray-600 transition-colors flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filter
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="min-w-[140px] bg-[#2A2A2A] rounded-lg p-1 shadow-xl z-[9999]"
                  sideOffset={5}
                  align="end"
                >
                  {roles.map((role) => (
                    <DropdownMenu.Item
                      key={role.id}
                      className="text-sm text-white px-3 py-2 rounded hover:bg-gray-600/50 cursor-pointer outline-none"
                      onSelect={() => addFilter(role.name)}
                    >
                      {role.name}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="px-2 flex items-center gap-2">
            {activeFilters.map((filter) => (
              <span
                key={filter}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-600/70 text-white text-sm"
              >
                {filter}
                <button onClick={() => removeFilter(filter)} className="ml-1 hover:bg-gray-500/50 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button onClick={clearAllFilters} className="text-sm text-gray-400 hover:text-white transition-colors">
              Clear Filters
            </button>
          </div>
        )}

        <div className="px-2">
          <div className="flex justify-between text-sm text-gray-400 px-4 py-2 border-b border-gray-700">
            <span>User</span>
            <span>Permission</span>
          </div>

          <div className="overflow-y-auto h-89 space-y-px">
            {filteredUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border-b border-gray-700/50">
                <div className="space-y-1">
                  <div className="text-sm text-white">{user.name}</div>
                  <div className="text-sm text-gray-400">{user.email}</div>
                </div>
                <div>
                  {user.id !== currentUserId ? (
                    <RoleDropdown
                      value={user.roleId}
                      onChange={(newRoleId) => handleRoleChange(user.id, newRoleId)}
                      roles={roles}
                      triggerClassName={
                        updatingUserId === user.id
                          ? 'px-3 py-1.5 text-sm rounded-lg bg-gray-600/70 text-white hover:bg-gray-600 transition-colors flex items-center gap-2 min-w-[102px] justify-between opacity-50 cursor-not-allowed'
                          : undefined
                      }
                    />
                  ) : (
                    <span className="text-sm text-gray-400">{user.roleName}</span>
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
