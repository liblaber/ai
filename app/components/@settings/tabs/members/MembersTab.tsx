import * as Tooltip from '@radix-ui/react-tooltip';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { UserRole } from '@prisma/client';
import { useEffect, useMemo, useState } from 'react';
import { useFetcher } from '@remix-run/react';
import { useUserStore } from '~/lib/stores/user';

interface Member {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

type LoaderData = {
  members: Member[];
};

interface RoleDropdownProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
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
          {value === UserRole.ADMIN ? 'Admin' : 'Member'}
          <div className="i-ph:caret-down w-4 h-4" />
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
                  onSelect={() => onChange(UserRole.ADMIN)}
                >
                  Admin
                  {value === UserRole.ADMIN && <div className="i-ph:check w-4 h-4" />}
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
                  onSelect={() => onChange(UserRole.MEMBER)}
                >
                  Member
                  {value === UserRole.MEMBER && <div className="i-ph:check w-4 h-4" />}
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

export default function MembersTab() {
  const fetcher = useFetcher<LoaderData>();
  const updateRoleFetcher = useFetcher();
  const { id: currentUserId } = useUserStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    fetcher.load('/api/organization/member');
  }, []);

  useEffect(() => {
    if (fetcher.data) {
      setMembers(fetcher.data.members || []);
    }
  }, [fetcher.data]);

  const handleRoleChange = (memberId: string, newRole: UserRole) => {
    updateRoleFetcher.submit(
      { memberId, role: newRole },
      {
        method: 'PATCH',
        action: '/api/organization/member',
        encType: 'application/json',
      },
    );
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

  return (
    <Tooltip.Provider delayDuration={50}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-2">
          <h2 className="text-lg text-white">Members</h2>
          <span className="text-lg text-gray-400">{filteredMembers.length}</span>
        </div>

        <div className="relative px-2">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <div className="i-ph:magnifying-glass w-4 h-4 text-gray-400" />
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
                    <RoleDropdown value={member.role} onChange={(newRole) => handleRoleChange(member.id, newRole)} />
                  ) : (
                    <span className="text-sm text-gray-400">{member.role === UserRole.ADMIN ? 'Admin' : 'Member'}</span>
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
