import { useState, useMemo } from 'react';
import { CircleMinus, Search, Trash2 } from 'lucide-react';
import { Dialog, DialogClose, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import { classNames } from '~/utils/classNames';
import { toast } from 'sonner';
import { useUserStore } from '~/lib/stores/user';
import type { Role, User } from './types';

type RoleMembersProps = {
  role: Role;
  onRoleUpdate: (updatedRole: Role) => void;
};

export default function RoleMembers({ role, onRoleUpdate }: RoleMembersProps) {
  const { user } = useUserStore();
  const currentUserId = user?.id;
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);

  const members = role.users || [];

  const handleDeleteMember = async (roleId: string, memberId: string | undefined) => {
    if (!memberId) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/roles/${roleId}/users/${memberId}`, {
        method: 'DELETE',
      });
      const data: { success: boolean; error?: string } = await response.json();

      if (data.success) {
        onRoleUpdate({
          ...role,
          users: members.filter((member) => member.id !== memberId),
        });
      } else {
        toast.error(data.error || 'Failed to remove member from role');
      }
    } catch (error) {
      console.error('Error removing member from role:', error);
      toast.error('Failed to remove member from role');
    } finally {
      setShowDeleteConfirm(false);
      setSelectedMember(null);
      setIsDeleting(false);
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

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-[566px] h-9 pl-7 pr-2.5 py-2 rounded-[50px] bg-gray-600/50 text-sm text-white placeholder-gray-400 focus:outline-none"
          placeholder="Search..."
        />
      </div>

      <div>
        <div className="flex justify-between text-sm text-gray-400 px-4 py-2 border-b border-gray-700">
          <span>Assigned Member</span>
        </div>

        <div className="space-y-px">
          {filteredMembers.map((member) => (
            <div key={member.id} className="group flex items-center justify-between p-4 border-b border-gray-700/50">
              <div className="space-y-1">
                <div className="text-sm text-white">{member.name}</div>
                <div className="text-sm text-gray-400">{member.email}</div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                {member.id !== currentUserId && (
                  <button
                    onClick={() => {
                      setSelectedMember(member);
                      setShowDeleteConfirm(true);
                    }}
                  >
                    <CircleMinus className="w-5 h-5 text-red-500 hover:text-red-400 cursor-pointer" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

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
                    <DialogTitle title={`Remove "${role.name}" role from ${selectedMember?.name}`} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-secondary">
                  They will lose access to all resources associated with this role. Are you sure you want to remove
                  them?
                </p>
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
                  onClick={() => handleDeleteMember(role.id, selectedMember?.id)}
                  className={classNames(
                    'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    'bg-red-500 hover:bg-red-600',
                    'text-white',
                  )}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      </DialogRoot>
    </div>
  );
}
