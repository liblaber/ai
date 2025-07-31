'use client';

import { useEffect, useRef } from 'react';

export default function PageReadyLogger() {
  const hasSentSignal = useRef(false);

  useEffect(() => {
    if (hasSentSignal.current) {
      return;
    }

    setTimeout(() => {
      // Post message to parent window (iframe parent)
      if (window.parent && window.parent !== window) {
        window.parent.postMessage('LOADED SIGNAL', '*');
      }
      hasSentSignal.current = true;
    }, 2500);
  }, []); // Empty dependency array ensures this runs only once

  return null; // This component doesn't render anything
} 