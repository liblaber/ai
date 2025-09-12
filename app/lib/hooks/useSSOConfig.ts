'use client';
import { useState, useEffect } from 'react';

interface SSOConfig {
  configured: boolean;
  providers: {
    oidc: {
      configured: boolean;
      friendlyName?: string;
      missing: Record<string, string>;
      providerId: string;
    };
    google: {
      configured: boolean;
      missing: Record<string, string>;
    };
  };
  success?: boolean;
  error?: string;
}

export function useSSOConfig() {
  const [config, setConfig] = useState<SSOConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/auth/sso/config');
        const data = (await response.json()) as SSOConfig;

        if (data.success) {
          setConfig(data);
        } else {
          setError(data.error || 'Failed to fetch SSO configuration');
        }
      } catch {
        setError('Failed to fetch SSO configuration');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, loading, error };
}
