'use client';

import { useState } from 'react';
import { Button } from '~/components/ui/Button';
import { Header } from '~/components/header/Header';
import { useSession } from '~/auth/auth-client';
import { useUserStore } from '~/lib/stores/user';
import { initializeClientTelemetry } from '~/lib/telemetry/telemetry-client';
import { useDataSourceTypesStore } from '~/lib/stores/dataSourceTypes';
import { DATA_SOURCE_CONNECTION_ROUTE } from '~/lib/constants/routes';

interface TelemetryConsentApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export default function TelemetryConsentPage() {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const { user, setUser } = useUserStore();
  const { dataSourceTypes } = useDataSourceTypesStore();

  const handleTelemetryConsent = async (telemetryEnabled: boolean) => {
    if (!session?.user) {
      setError('User session not found');
      return;
    }

    // Set the appropriate loading state
    if (telemetryEnabled) {
      setIsAccepting(true);
    } else {
      setIsDeclining(true);
    }

    setError(null);

    try {
      const response = await fetch('/api/telemetry-consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telemetryEnabled }),
      });

      const result = (await response.json()) as TelemetryConsentApiResponse;

      if (result.success) {
        // Update the user in the store with the new telemetry consent
        if (user) {
          const updatedUser = {
            ...user,
            telemetryEnabled,
          };
          setUser(updatedUser);

          // Initialize telemetry immediately if user consented
          if (telemetryEnabled) {
            initializeClientTelemetry(updatedUser);
          }
        }

        if (dataSourceTypes && dataSourceTypes.length === 0) {
          window.location.replace(DATA_SOURCE_CONNECTION_ROUTE);
        } else {
          window.location.replace('/');
        }
      } else {
        setError(result.message || result.error || 'Failed to update telemetry consent');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      // Clear the appropriate loading state
      if (telemetryEnabled) {
        setIsAccepting(false);
      } else {
        setIsDeclining(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-liblab-elements-bg-depth-1">
      <Header showMenuIcon={false} />
      <div className="h-full bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-[620px] h-[560px]">
          <h1 className="text-2xl text-liblab-elements-textPrimary mb-6 text-center">Help us improve liblab AI</h1>
          <div className="mb-6">
            <p className="text-center text-base font-light text-liblab-elements-textPrimary mb-4">
              We collect anonymous usage data to help make liblab AI better for everyone. This includes:
            </p>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex items-start gap-3">
                <span className="i-ph:check-circle-fill text-green-400 mt-0.5 flex-shrink-0" />
                <span>Error reports to identify bugs and improve stability</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="i-ph:check-circle-fill text-green-400 mt-0.5 flex-shrink-0" />
                <span>Usage patterns to understand how features are used</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="i-ph:check-circle-fill text-green-400 mt-0.5 flex-shrink-0" />
                <span>Performance metrics to optimize speed and responsiveness</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="i-ph:check-circle-fill text-green-400 mt-0.5 flex-shrink-0" />
                <span>
                  Prompts sent to the LLM to enhance the quality of generated outputs and improve prompt understanding
                </span>
              </div>
            </div>
            <div className="mt-6 p-4 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="i-ph:shield-check-fill text-blue-400 text-lg" />
                <span className="font-medium text-[var(--liblab-elements-textPrimary)] text-sm">
                  Your privacy is protected
                </span>
              </div>
              <div className="text-gray-400 text-[13px] leading-snug">
                We do not collect any personal information, built app code, user data, or chat responses from the LLM,
                only the prompts you send. All data is anonymized and used solely to improve the product.
              </div>
            </div>
          </div>
          {error && <div className="text-red-500 text-sm mb-4 text-center">{error}</div>}
          <div className="flex gap-4 justify-center">
            <Button
              type="button"
              variant="secondary"
              className="min-w-[120px]"
              onClick={() => handleTelemetryConsent(false)}
              disabled={isAccepting || isDeclining}
            >
              {isDeclining ? 'Declining...' : 'Decline'}
            </Button>
            <Button
              type="button"
              variant="primary"
              className="min-w-[120px]"
              onClick={() => handleTelemetryConsent(true)}
              disabled={isAccepting || isDeclining}
            >
              {isAccepting ? 'Accepting...' : 'Accept'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
