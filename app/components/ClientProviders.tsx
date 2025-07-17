'use client';

import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Toaster } from 'sonner';
import { AuthProvider } from './auth/AuthContext';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DndProvider backend={HTML5Backend}>
        {children}
        <Toaster richColors />
      </DndProvider>
    </AuthProvider>
  );
}
