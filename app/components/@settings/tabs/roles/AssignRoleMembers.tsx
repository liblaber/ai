import { useState, useEffect, useMemo } from 'react';
import { setControlPanelHeader } from '~/lib/stores/settings';
import { Circle, CircleCheck, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { Role, User } from './types';

type AssignRoleMembersProps = {
  role: Role;
  onRoleUpdate: (updatedRole: Role) => void;
  closeAssignMembers: () => void;
};

export default function AssignRoleMembers({ role, onRoleUpdate, closeAssignMembers }: AssignRoleMembersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [membersNotInRole, setMembersNotInRole] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Map<string, User>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setControlPanelHeader({
      title: `Assign members to "${role.name}" role`,
      onBack: closeAssignMembers,
    });

    const fetchMembersNotInRole = async () => {
      try {
        setIsLoading(true);

        const response = await fetch('/api/organization/member');
        const data: { members: User[] } = await response.json();

        if (data.members) {
          const membersNotInRole: User[] = data.members
            .map((member) => {
              if (!role.users?.some((user) => user.id === member.id)) {
                return { id: member.id, name: member.name, email: member.email };
              }

              return null;
            })
            .filter((member) => member !== null);

          setMembersNotInRole(membersNotInRole);
        }
      } catch (error) {
        console.error('Error fetching organization members:', error);
        toast.error('Failed to fetch organization members');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembersNotInRole();
  }, []);

  const handleAssignMembers = async () => {
    if (selectedUsers.size === 0) {
      return;
    }

    setIsSaving(true);

    const newRoleUsers = new Map(selectedUsers);

    try {
      await Promise.all(
        Array.from(selectedUsers.values()).map((user) =>
          fetch(`/api/roles/${role.id}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id }),
          }).then((res) => {
            if (!res.ok) {
              const failedUser = membersNotInRole.find((m) => m.id === user.id);
              toast.error(`Failed to assign member "${failedUser?.email || 'Unknown'}"`);
              newRoleUsers.delete(user.id);
            }
          }),
        ),
      );

      const updatedRole = {
        ...role,
        users: [...(role.users || []), ...Array.from(newRoleUsers.values())],
      };
      onRoleUpdate(updatedRole);
      closeAssignMembers();
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSelectUser = (user: User) => {
    if (!user?.id) {
      return;
    }

    setSelectedUsers((prev) => {
      const newSelected = new Map(prev);

      if (newSelected.has(user.id)) {
        newSelected.delete(user.id);
      } else {
        newSelected.set(user.id, user);
      }

      return newSelected;
    });
  };

  const filteredMembers = useMemo(
    () =>
      membersNotInRole.filter(
        (member) =>
          member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.email.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [membersNotInRole, searchQuery],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-400">Loading members...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="relative flex-1 mb-3">
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-9 pl-7 pr-2.5 py-2 rounded-[50px] bg-gray-600/50 text-sm text-white placeholder-gray-400 focus:outline-none"
          placeholder="Search members..."
        />
      </div>

      <div className="text-sm text-gray-400 px-4 py-2 border-b border-gray-700">Assign members</div>

      <div className="min-h-106">
        {filteredMembers.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-6 p-4 border-b border-gray-700/50 cursor-pointer"
            onClick={() => toggleSelectUser(member)}
          >
            {selectedUsers.has(member.id) ? (
              <CircleCheck className="w-5 h-5 text-accent-500" />
            ) : (
              <Circle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
            <div className="space-y-1">
              <div className="text-sm text-white">{member.name}</div>
              <div className="text-sm text-gray-400">{member.email}</div>
            </div>
          </div>
        ))}

        {filteredMembers.length === 0 && !isLoading && (
          <div className="p-4 text-sm text-gray-400">No members found</div>
        )}
      </div>

      <div className="sticky bottom-0 left-0 right-0 -m-6 border-t border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="flex justify-end p-4">
          <button
            onClick={handleAssignMembers}
            disabled={isSaving || selectedUsers.size === 0}
            className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-gray-950 dark:text-gray-950 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving
              ? 'Assigning Members...'
              : `Assign ${selectedUsers.size ? selectedUsers.size : ''} Member${selectedUsers.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
