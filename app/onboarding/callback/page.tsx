'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '~/auth/auth-client';

export default function OnboardingCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const handleCallback = async () => {
      if (isPending) {
        return;
      } // Wait for session to load

      const step = searchParams.get('step') || 'auth-config';
      const authMethod = searchParams.get('authMethod') || 'google';

      if (session?.user) {
        // User is signed in, redirect back to onboarding with preserved state
        setIsRedirecting(true);
        router.push(`/onboarding?step=${step}&authMethod=${authMethod}&signedIn=true`);
      } else {
        // No session, redirect to onboarding without preserved state
        setIsRedirecting(true);
        router.push('/onboarding');
      }
    };

    handleCallback();
  }, [session, isPending, searchParams, router]);

  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-[#0A0D1A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#3BCEFF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#C6C9D1]">Completing sign-in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D1A] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#3BCEFF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[#C6C9D1]">Loading...</p>
      </div>
    </div>
  );
}
