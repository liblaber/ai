'use client';

import { createContext } from 'react';
import { createPrismaAbility } from '@casl/prisma';
import { useEffect, useMemo, useState } from 'react';
import { useUserStore } from '~/lib/stores/user';
import type { RawRule } from '@casl/ability';
import type { AppAbility } from '~/lib/casl/user-ability';
import { logger } from '~/utils/logger';

export const AbilityContext = createContext<AppAbility>(createPrismaAbility([]));

interface AbilityProviderProps {
  children: React.ReactNode;
}

export function AbilityProvider({ children }: AbilityProviderProps) {
  const { user } = useUserStore();
  const [rules, setRules] = useState<RawRule[]>([]);

  useEffect(() => {
    if (!user?.id) {
      setRules([]);
      return;
    }

    const fetchAbility = async () => {
      try {
        const response = await fetch('/api/me/ability');

        if (!response.ok) {
          throw new Error('Failed to fetch ability rules');
        }

        const data: { success: boolean; rules: RawRule[] } = await response.json();
        setRules(data.rules || []);
      } catch (error) {
        logger.error('Error fetching ability:', error);
        setRules([]);
      }
    };

    fetchAbility();
  }, [user]);

  const ability = useMemo(() => createPrismaAbility(rules), [rules]);

  return <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>;
}
