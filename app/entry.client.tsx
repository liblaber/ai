import { RemixBrowser } from '@remix-run/react';
import { startTransition, useEffect } from 'react';
import { hydrateRoot } from 'react-dom/client';
import posthog from 'posthog-js';
import { logger } from '~/utils/logger';

function PosthogInit() {
  useEffect(() => {
    if (!window.__ENV__.VITE_PUBLIC_POSTHOG_KEY || !window.__ENV__.VITE_PUBLIC_POSTHOG_HOST) {
      logger.warn('No keys set for Posthog. Skipping initialization.');
      return;
    }

    posthog.init(window.__ENV__.VITE_PUBLIC_POSTHOG_KEY, {
      api_host: window.__ENV__.VITE_PUBLIC_POSTHOG_HOST,
    });
  }, []);

  return null;
}

startTransition(() => {
  hydrateRoot(
    document.getElementById('root')!,
    <>
      <RemixBrowser />
      <PosthogInit />
    </>,
  );
});
