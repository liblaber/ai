'use client';

import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Toaster } from 'sonner';
import { AuthProvider } from './auth/AuthContext';
import { DataLoader, type RootData } from './DataLoader';
import { AbilityProvider } from './ability/AbilityProvider';
import { TooltipProvider } from '@radix-ui/react-tooltip';

interface ClientProvidersProps {
  children: React.ReactNode;
  rootData: RootData;
}

export function ClientProviders({ children, rootData }: ClientProvidersProps) {
  return (
    <AuthProvider>
      <DndProvider backend={HTML5Backend}>
        <DataLoader rootData={rootData}>
          <TooltipProvider>
            <AbilityProvider>
              {children}
              <Toaster richColors />
            </AbilityProvider>
          </TooltipProvider>
        </DataLoader>
      </DndProvider>
    </AuthProvider>
  );
}
