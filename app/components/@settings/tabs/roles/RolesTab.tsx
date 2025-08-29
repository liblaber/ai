import { useState, useEffect, useMemo } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import { toast } from 'sonner';
import RoleDetails from './RoleDetails';
import type { Role } from './types';

type LoaderData = {
  roles: Role[];
};

export default function RolesTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/roles');
      const data: LoaderData = await response.json();

      if (data.roles) {
        setRoles(data.roles);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to fetch roles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleUpdate = (updatedRole: Role) => {
    setRoles((prevRoles) => prevRoles.map((role) => (role.id === updatedRole.id ? { ...role, ...updatedRole } : role)));

    if (selectedRole && selectedRole.id === updatedRole.id) {
      setSelectedRole(updatedRole);
    }
  };

  const filteredRoles = useMemo(
    () => roles.filter((role) => role.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [roles, searchQuery],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-2">
          <h2 className="text-lg text-white">Roles</h2>
          <span className="text-lg text-gray-400">Loading...</span>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="text-gray-400">Loading roles...</div>
        </div>
      </div>
    );
  }

  if (selectedRole) {
    return (
      <RoleDetails
        role={selectedRole}
        onBack={() => setSelectedRole(null)}
        onRoleUpdate={handleRoleUpdate}
        onRoleDelete={(roleId: string) => {
          setRoles((prevRoles) => prevRoles.filter((role) => role.id !== roleId));
          setSelectedRole(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-2">
        <h2 className="text-lg text-white">Roles</h2>
        <span className="text-lg text-gray-400">{filteredRoles.length}</span>
      </div>

      <div className="relative px-2">
        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-[566px] h-9 pl-10 pr-2.5 py-2 rounded-[50px] bg-gray-600/50 text-white placeholder-gray-400 focus:outline-none"
          placeholder="Search..."
        />
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-gray-400 border-b border-gray-700/50">
            <th className="px-4 py-2 font-normal">Role</th>
            <th className="px-4 py-2 font-normal">Members</th>
            <th className="px-4 py-2 font-normal"></th>
          </tr>
        </thead>
        <tbody>
          {filteredRoles.map((role) => (
            <tr
              key={role.id}
              className="border-b border-gray-700/50 cursor-pointer"
              onClick={() => setSelectedRole(role)}
            >
              <td className="px-4 py-2">
                <div>{role.name}</div>
                {role.description && <div className="mt-1 text-xs text-gray-500">{role.description}</div>}
              </td>
              <td className="px-4 py-2">{role.users.length}</td>
              <td className="px-4 py-2">
                <div className="flex items-center justify-end">
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
