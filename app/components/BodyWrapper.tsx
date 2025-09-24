'use client';

import { useEffect } from 'react';

export function BodyWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Handle browser extension modifications that might cause hydration issues
    const body = document.body;

    // Remove any attributes that might be added by browser extensions
    // that could cause hydration mismatches
    const attributesToRemove = ['data-ryu-obtrusive-scrollbars', 'data-ryu-scrollbars', 'data-ryu-scrollbars-visible'];

    attributesToRemove.forEach((attr) => {
      if (body.hasAttribute(attr)) {
        body.removeAttribute(attr);
      }
    });
  }, []);

  return <>{children}</>;
}
