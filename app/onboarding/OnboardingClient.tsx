'use client';

import { AdminOnboarding } from '~/components/onboarding/AdminOnboarding';
import { useRouter } from 'next/navigation';
import { clearOnboardingStatusCache } from '~/lib/api/onboarding';
import { useEffect, useState } from 'react';
import { onboardingApi } from '~/lib/api/onboarding';

interface OnboardingPageProps {
  envVars?: {
    // Non-sensitive configuration
    defaultLlmProvider?: string;
    defaultLlmModel?: string;
    ollamaApiBaseUrl?: string;
    disableTelemetry?: boolean;

    // Existence flags only
    hasGoogleOAuth?: boolean;
    hasOidcSso?: boolean;
    hasOidcDomain?: boolean;

    // API Key existence flags
    hasAnthropicApiKey?: boolean;
    hasOpenaiApiKey?: boolean;
    hasGoogleGenerativeAiApiKey?: boolean;
    hasOpenRouterApiKey?: boolean;
    hasGroqApiKey?: boolean;
    hasMistralApiKey?: boolean;
    hasCohereApiKey?: boolean;
    hasPerplexityApiKey?: boolean;
    hasTogetherApiKey?: boolean;
    hasDeepseekApiKey?: boolean;
    hasXaiApiKey?: boolean;
    hasGithubApiKey?: boolean;
    hasHyperbolicApiKey?: boolean;
    hasHuggingfaceApiKey?: boolean;
    hasOpenaiLikeApiKey?: boolean;
  };
}

export default function OnboardingClient({ envVars }: OnboardingPageProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const status = await onboardingApi.checkStatus();

        if (status.isSetUp) {
          // Application is already set up, redirect to home
          router.push('/');
          return;
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkOnboardingStatus();
  }, [router]);

  const handleOnboardingComplete = () => {
    // Clear the cache since onboarding is now complete
    clearOnboardingStatusCache();
    // Redirect to home page after onboarding is complete
    router.push('/');
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#0A0D1A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#3BCEFF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#C6C9D1]">Checking setup status...</p>
        </div>
      </div>
    );
  }

  return <AdminOnboarding onComplete={handleOnboardingComplete} envVars={envVars} />;
}
