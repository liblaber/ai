'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ExternalLink, Globe, Loader2, Maximize2, Minimize2, RefreshCw, Settings } from 'lucide-react';
import { classNames } from '~/utils/classNames';

type Website = any; // TODO

interface AppViewerProps {
  website: Website;
}

export default function AppViewer({ website }: AppViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setHasError(false);
    setLastRefresh(new Date());

    // Force iframe reload by updating the src
    const iframe = document.getElementById('app-iframe') as HTMLIFrameElement;

    if (iframe) {
      const currentSrc = iframe.src;
      iframe.src = '';
      setTimeout(() => {
        iframe.src = currentSrc;
      }, 100);
    }
  };

  const handleOpenExternal = () => {
    if (website.siteUrl) {
      window.open(website.siteUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!website.siteUrl) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">App Not Deployed</h1>
          <p className="text-gray-600 dark:text-gray-400">This app hasn't been deployed yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={classNames(
        'bg-gray-50 dark:bg-gray-900 transition-all duration-300',
        isFullscreen ? 'fixed inset-0 z-50' : 'min-h-screen',
      )}
    >
      {/* Header */}
      {/* TODO: remove whole header? */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent-500 rounded-lg flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {website.siteName || 'Untitled App'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInfo(!showInfo)}
              className={classNames(
                'p-2 rounded-lg transition-colors',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'text-gray-500 dark:text-gray-400',
              )}
              title="App Information"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className={classNames(
                'p-2 rounded-lg transition-colors',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'text-gray-500 dark:text-gray-400',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
              title="Refresh App"
            >
              <RefreshCw className={classNames('w-4 h-4', { 'animate-spin': isLoading })} />
            </button>

            <button
              onClick={handleOpenExternal}
              className={classNames(
                'p-2 rounded-lg transition-colors',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'text-gray-500 dark:text-gray-400',
              )}
              title="Open in New Tab"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            <button
              onClick={toggleFullscreen}
              className={classNames(
                'p-2 rounded-lg transition-colors',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'text-gray-500 dark:text-gray-400',
              )}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* App Information Panel */}
      {showInfo && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-900 dark:text-white">Created by:</span>
              <p className="text-gray-600 dark:text-gray-400">{website.createdBy.name}</p>
            </div>
            <div>
              <span className="font-medium text-gray-900 dark:text-white">Created:</span>
              <p className="text-gray-600 dark:text-gray-400">{new Date(website.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="font-medium text-gray-900 dark:text-white">Last refreshed:</span>
              <p className="text-gray-600 dark:text-gray-400">{lastRefresh.toLocaleTimeString()}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-10">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-accent-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading app...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-10">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Failed to Load App</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The deployed app couldn't be loaded. It might be offline or the URL is incorrect.
            </p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* App Container */}
      <div className={classNames('relative', isFullscreen ? 'h-screen' : 'h-[calc(100vh-80px)]')}>
        <iframe
          id="app-iframe"
          src={website.siteUrl}
          className="w-full h-full border-0"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title={website.siteName || 'Deployed App'}
        />
      </div>
    </div>
  );
}
