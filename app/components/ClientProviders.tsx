'use client';

import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Toaster } from 'sonner';
import { AuthProvider } from './auth/AuthContext';
import { DataLoader, type RootData } from './DataLoader';

interface ClientProvidersProps {
  children: React.ReactNode;
  rootData: RootData;
}

export function ClientProviders({ children, rootData }: ClientProvidersProps) {
  return (
    <AuthProvider>
      <DndProvider backend={HTML5Backend}>
        <DataLoader rootData={rootData}>
          {children}
          <Toaster richColors />
        </DataLoader>
      </DndProvider>
    </AuthProvider>
  );
}
