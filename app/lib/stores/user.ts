import { create } from 'zustand';
import { UserRole } from '@prisma/client';

interface UserState {
  id: string | null;
  role: UserRole | null;
  setUser: (data: { id: string; role: UserRole }) => void;
}

export const useUserStore = create<UserState>((set) => ({
  id: null,
  role: null,

  setUser: ({ id, role }) =>
    set(() => ({
      id,
      role,
    })),
}));
