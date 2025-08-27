import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
import { toast } from 'sonner';
import { useUserStore } from '~/lib/stores/user';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MEMBER';
}

type LoaderData = {
  users: User[];
};

interface RoleDropdownProps {
  value: 'ADMIN' | 'MEMBER';
  onChange: (role: 'ADMIN' | 'MEMBER') => void;
  triggerClassName?: string;
}

function RoleDropdown({ value, onChange, triggerClassName }: RoleDropdownProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={
            triggerClassName ||
            'px-3 py-1.5 text-sm rounded-lg bg-gray-600/70 text-white hover:bg-gray-600 transition-colors flex items-center gap-2 min-w-[102px] justify-between'
          }
        >
          {value === 'ADMIN' ? 'Admin' : 'Member'}
          <ChevronDown className="w-4 h-4" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[140px] bg-[#2A2A2A] rounded-lg p-1 shadow-xl z-[9999]"
          sideOffset={5}
          align="end"
        >
          <div className="relative">
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <DropdownMenu.Item
                  className="text-sm text-white px-3 py-2 rounded hover:bg-gray-600/50 cursor-pointer outline-none flex items-center justify-between group"
                  onSelect={() => onChange('ADMIN')}
                >
                  Admin
                  {value === 'ADMIN' && <Check className="w-4 h-4" />}
                </DropdownMenu.Item>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="bg-[#1A1A1A] p-2 rounded-lg text-xs text-gray-300 w-[190px] border border-[#333333] z-[99999] select-none animate-in fade-in-0 zoom-in-95"
                  side="left"
                  sideOffset={5}
                >
                  Admin – manages team, billing, and access
                  <Tooltip.Arrow className="fill-[#333333]" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>

            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <DropdownMenu.Item
                  className="text-sm text-white px-3 py-2 rounded hover:bg-gray-600/50 cursor-pointer outline-none flex items-center justify-between group"
                  onSelect={() => onChange('MEMBER')}
                >
                  Member
                  {value === 'MEMBER' && <Check className="w-4 h-4" />}
                </DropdownMenu.Item>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="bg-[#1A1A1A] p-2 rounded-lg text-xs text-gray-300 w-[190px] border border-[#333333] z-[99999] select-none animate-in fade-in-0 zoom-in-95"
                  side="left"
                  sideOffset={5}
                >
                  Member – views and uses apps
                  <Tooltip.Arrow className="fill-[#333333]" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export default function UsersTab() {
  const { user } = useUserStore();
  const currentUserId = user?.id;
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setIsLoading(true);

        const response = await fetch('/api/user');
        const data: LoaderData = await response.json();
        console.log(data);

        if (data.users) {
          setMembers(data.users);
        }
      } catch (error) {
        console.error('Error fetching members:', error);
        toast.error('Failed to fetch members');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, []);

  const handleRoleChange = async (memberId: string, newRole: 'ADMIN' | 'MEMBER') => {
    try {
      setUpdatingMemberId(memberId);

      const response = await fetch('/api/user', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ memberId, role: newRole }),
      });

      const data = (await response.json()) as { success: boolean; error?: string };

      if (data.success) {
        // Update the member's role in the local state
        setMembers((prevMembers) =>
          prevMembers.map((member) => (member.id === memberId ? { ...member, role: newRole } : member)),
        );
        toast.success('Member role updated successfully');
      } else {
        toast.error(data.error || 'Failed to update member role');
      }
    } catch (error) {
      console.error('Error updating member role:', error);
      toast.error('Failed to update member role');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const filteredMembers = useMemo(
    () =>
      members.filter(
        (member) =>
          member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.email.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [members, searchQuery],
  );

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
        <div className="flex items-center gap-2 p-2">
          <h2 className="text-lg text-white">Members</h2>
          <span className="text-lg text-gray-400">{filteredMembers.length}</span>
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

        <div className="px-2">
          <div className="flex justify-between text-sm text-gray-400 px-4 py-2 border-b border-gray-700">
            <span>Member</span>
            <span>Permission</span>
          </div>

          <div className="overflow-y-auto h-89 space-y-px">
            {filteredMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 border-b border-gray-700/50">
                <div className="space-y-1">
                  <div className="text-sm text-white">{member.name}</div>
                  <div className="text-sm text-gray-400">{member.email}</div>
                </div>
                <div>
                  {member.id !== currentUserId ? (
                    <RoleDropdown
                      value={member.role}
                      onChange={(newRole) => handleRoleChange(member.id, newRole)}
                      triggerClassName={
                        updatingMemberId === member.id
                          ? 'px-3 py-1.5 text-sm rounded-lg bg-gray-600/70 text-white hover:bg-gray-600 transition-colors flex items-center gap-2 min-w-[102px] justify-between opacity-50 cursor-not-allowed'
                          : undefined
                      }
                    />
                  ) : (
                    <span className="text-sm text-gray-400">{member.role === 'ADMIN' ? 'Admin' : 'Member'}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
