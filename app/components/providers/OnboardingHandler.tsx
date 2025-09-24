'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { DATA_SOURCE_CONNECTION_ROUTE, TELEMETRY_CONSENT_ROUTE } from '~/lib/constants/routes';
import { initializeClientTelemetry } from '~/lib/telemetry/telemetry-client';
import type { RootData } from '~/components/DataLoader';

interface OnboardingHandlerProps {
  children: React.ReactNode;
  rootData: RootData;
}

export function OnboardingHandler({ children, rootData }: OnboardingHandlerProps) {
  const { authState } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authState.status === 'AUTHENTICATED' && rootData.user) {
      const { user, environmentDataSources } = rootData;

      // Redirect to telemetry consent if user hasn't decided
      if (user.telemetryEnabled === null) {
        router.push(TELEMETRY_CONSENT_ROUTE);
        return;
      }

      // Initialize telemetry if enabled
      if (user.telemetryEnabled) {
        initializeClientTelemetry(user);
      }

      // Redirect to data source connection if no data sources exist
      if (environmentDataSources.length === 0) {
        router.push(DATA_SOURCE_CONNECTION_ROUTE);
        return;
      }
    }
  }, [authState.status, rootData.user, rootData.environmentDataSources, router]);

  // Handle permission check - redirect if authenticated but no user data from server
  useEffect(() => {
    if (authState.status === 'AUTHENTICATED' && !rootData.user) {
      // If we're authenticated but have no user data from server,
      // it likely means permissions failed server-side
      router.push('/access-denied');
    }
  }, [authState.status, rootData.user, router]);

  return <>{children}</>;
}
