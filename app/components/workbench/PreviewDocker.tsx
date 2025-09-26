'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ExternalLink,
  Laptop,
  Maximize2,
  Minimize2,
  Monitor,
  Monitor as DesktopIcon,
  RotateCcw,
  Smartphone,
  SquareDashed,
  Tablet,
} from 'lucide-react';
import { IconButton } from '~/components/ui/IconButton';
import { ScreenshotSelector } from './ScreenshotSelector';
import { dockerClient } from '~/lib/docker/docker-client';
import type { DockerContainerResponse } from '~/types/docker';

type ResizeSide = 'left' | 'right' | null;

interface WindowSize {
  name: string;
  width: number;
  height: number;
  icon: React.ComponentType<{ className?: string }>;
}

const WINDOW_SIZES: WindowSize[] = [
  { name: 'Mobile', width: 375, height: 667, icon: Smartphone },
  { name: 'Tablet', width: 768, height: 1024, icon: Tablet },
  { name: 'Laptop', width: 1366, height: 768, icon: Laptop },
  { name: 'Desktop', width: 1920, height: 1080, icon: DesktopIcon },
];

type Props = {
  containerId: string;
};

export const PreviewDocker = memo(({ containerId }: Props) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(true);

  const [containerData, setContainerData] = useState<DockerContainerResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState('Starting container...');
  const [url, setUrl] = useState('');
  const [iframeUrl, setIframeUrl] = useState<string | undefined>();
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Toggle between responsive mode and device mode
  const [isDeviceModeOn, setIsDeviceModeOn] = useState(false);

  // Use percentage for width
  const [widthPercent, setWidthPercent] = useState<number>(37.5);

  const resizingState = useRef({
    isResizing: false,
    side: null as ResizeSide,
    startX: 0,
    startWidthPercent: 37.5,
    windowWidth: typeof window !== 'undefined' ? window.innerWidth : 1920,
  });

  const SCALING_FACTOR = 2;

  const [isWindowSizeDropdownOpen, setIsWindowSizeDropdownOpen] = useState(false);
  const [selectedWindowSize, setSelectedWindowSize] = useState<WindowSize>(WINDOW_SIZES[0]);

  // Poll Docker container for baseUrl
  const pollContainer = useCallback(async () => {
    try {
      const response = await dockerClient.getContainer(containerId);
      setContainerData(response);

      if (response.baseUrl) {
        // Stop polling once we have a baseUrl
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }

        setIsLoading(false);
        setLoadingText('');
      } else {
        // Update loading text based on container status
        const status = response.container.status;

        switch (status) {
          case 'creating':
            setLoadingText('Creating container...');
            break;
          case 'running':
            setLoadingText('Container starting up...');
            break;
          case 'stopped':
            setLoadingText('Container stopped');
            break;
          case 'error':
            setLoadingText('Container error');
            break;
          default:
            setLoadingText('Loading...');
        }
      }
    } catch (error) {
      console.error('Failed to poll container:', error);
      setLoadingText('Failed to load container');
    }
  }, [containerId]);

  // Start polling on mount
  useEffect(() => {
    pollContainer(); // Initial poll

    pollingIntervalRef.current = setInterval(pollContainer, 3000); // Poll every 3 seconds

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [pollContainer]);

  // Update URL when containerData changes
  useEffect(() => {
    if (!containerData?.baseUrl) {
      setUrl('');
      setIframeUrl(undefined);

      return;
    }

    const { baseUrl } = containerData;
    setUrl(baseUrl);
    setIframeUrl(baseUrl);
  }, [containerData]);

  const validateUrl = useCallback(
    (value: string) => {
      if (!containerData?.baseUrl) {
        return false;
      }

      const { baseUrl } = containerData;

      if (value === baseUrl) {
        return true;
      } else if (value.startsWith(baseUrl)) {
        return ['/', '?', '#'].includes(value.charAt(baseUrl.length));
      }

      return false;
    },
    [containerData],
  );

  const reloadPreview = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const toggleFullscreen = async () => {
    if (!isFullscreen && containerRef.current) {
      await containerRef.current.requestFullscreen();
    } else if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleDeviceMode = () => {
    setIsDeviceModeOn((prev) => !prev);
  };

  const startResizing = (e: React.MouseEvent, side: ResizeSide) => {
    if (!isDeviceModeOn) {
      return;
    }

    document.body.style.userSelect = 'none';

    resizingState.current.isResizing = true;
    resizingState.current.side = side;
    resizingState.current.startX = e.clientX;
    resizingState.current.startWidthPercent = widthPercent;
    resizingState.current.windowWidth = window.innerWidth;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    e.preventDefault();
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!resizingState.current.isResizing) {
      return;
    }

    const dx = e.clientX - resizingState.current.startX;
    const windowWidth = resizingState.current.windowWidth;

    const dxPercent = (dx / windowWidth) * 100 * SCALING_FACTOR;

    let newWidthPercent = resizingState.current.startWidthPercent;

    if (resizingState.current.side === 'right') {
      newWidthPercent = resizingState.current.startWidthPercent + dxPercent;
    } else if (resizingState.current.side === 'left') {
      newWidthPercent = resizingState.current.startWidthPercent - dxPercent;
    }

    newWidthPercent = Math.max(10, Math.min(newWidthPercent, 90));

    setWidthPercent(newWidthPercent);
  };

  const onMouseUp = () => {
    resizingState.current.isResizing = false;
    resizingState.current.side = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);

    document.body.style.userSelect = '';
  };

  useEffect(() => {
    const handleWindowResize = () => {
      // Optional: Adjust widthPercent if necessary
    };

    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  }, []);

  const GripIcon = () => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          color: 'rgba(0,0,0,0.5)',
          fontSize: '10px',
          lineHeight: '5px',
          userSelect: 'none',
          marginLeft: '1px',
        }}
      >
        ••• •••
      </div>
    </div>
  );

  const setDeviceSize = (size: WindowSize) => {
    const MIN_PREVIEW_WIDTH_PERCENT = 10;
    const MAX_PREVIEW_WIDTH_PERCENT = 100;
    const ESTIMATED_PREVIEW_WIDTH_RATIO = 0.5;

    // Enable device mode if not already enabled
    if (!isDeviceModeOn) {
      setIsDeviceModeOn(true);
    }

    const calculateTargetPercent = (deviceWidth: number, containerWidth: number) => {
      if (containerWidth === 0) {
        return MIN_PREVIEW_WIDTH_PERCENT;
      }

      const percent = (deviceWidth / containerWidth) * 100;

      return Math.max(MIN_PREVIEW_WIDTH_PERCENT, Math.min(MAX_PREVIEW_WIDTH_PERCENT, percent));
    };

    const previewContainer = containerRef.current;
    let targetPercent: number;

    if (previewContainer) {
      const previewArea = previewContainer.querySelector<HTMLElement>('.flex-1');
      const availableWidth = previewArea ? previewArea.offsetWidth : previewContainer.offsetWidth;
      targetPercent = calculateTargetPercent(size.width, availableWidth);
    } else {
      // Fallback if container ref is not available yet
      const screenWidth = window.innerWidth;
      const estimatedPreviewWidth = screenWidth * ESTIMATED_PREVIEW_WIDTH_RATIO;
      targetPercent = calculateTargetPercent(size.width, estimatedPreviewWidth);
    }

    setWidthPercent(targetPercent);

    // Update the selected window size for the dropdown
    setSelectedWindowSize(size);
  };

  const hasBaseUrl = !!containerData?.baseUrl;

  return (
    <div ref={containerRef} className={`w-full h-full flex flex-col relative`}>
      <div className="bg-depth-2 p-2 flex items-center gap-2">
        <div className="flex items-center gap-2">
          <IconButton onClick={reloadPreview} title="Reload preview" disabled={!hasBaseUrl}>
            <RotateCcw className="w-4 h-4" />
          </IconButton>
          <IconButton
            onClick={() => setIsSelectionMode(!isSelectionMode)}
            className={isSelectionMode ? 'bg-depth-3' : ''}
            title={isSelectionMode ? 'Exit screenshot mode' : 'Enter screenshot mode'}
            disabled={!hasBaseUrl}
          >
            <SquareDashed className="w-4 h-4" />
          </IconButton>
        </div>

        <div className="flex-grow flex items-center gap-1 bg-depth-1 border border-depth-3 text-secondary rounded-full px-3 py-1 text-sm hover:bg-depth-3 hover:focus-within:bg-depth-1 focus-within:bg-depth-1 focus-within-border-accent focus-within:text-primary">
          <input
            title="URL"
            ref={inputRef}
            className="w-full bg-transparent outline-none"
            type="text"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && validateUrl(url)) {
                setIframeUrl(url);

                if (inputRef.current) {
                  inputRef.current.blur();
                }
              }
            }}
            disabled={!hasBaseUrl}
          />
        </div>

        <div className="flex items-center gap-2">
          <IconButton
            onClick={toggleDeviceMode}
            title={isDeviceModeOn ? 'Switch to Responsive Mode' : 'Switch to Device Mode'}
            disabled={!hasBaseUrl}
          >
            <Monitor className="w-4 h-4" />
          </IconButton>

          <IconButton
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
            disabled={!hasBaseUrl}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </IconButton>

          <div className="flex items-center relative">
            <IconButton
              onClick={() => setDeviceSize(selectedWindowSize)}
              title={`Set Preview to ${selectedWindowSize.name} Size (${selectedWindowSize.width}×${selectedWindowSize.height})`}
              className={isDeviceModeOn ? 'bg-depth-3!' : ''}
              disabled={!hasBaseUrl}
            >
              <ExternalLink className="w-4 h-4" />
            </IconButton>
            <IconButton
              onClick={() => setIsWindowSizeDropdownOpen(!isWindowSizeDropdownOpen)}
              className="ml-1"
              title="Select Window Size"
              disabled={!hasBaseUrl}
            >
              <ChevronDown className="w-4 h-4" />
            </IconButton>

            {isWindowSizeDropdownOpen && hasBaseUrl && (
              <>
                <div className="fixed inset-0 z-50" onClick={() => setIsWindowSizeDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 min-w-[240px] bg-white dark:bg-black rounded-xl shadow-2xl border border-[#E5E7EB] dark:border-[rgba(255,255,255,0.1)] overflow-hidden">
                  {WINDOW_SIZES.map((size) => (
                    <button
                      key={size.name}
                      className="w-full px-4 py-3.5 text-left text-[#111827] dark:text-gray-300 text-sm whitespace-nowrap flex items-center gap-3 group hover:bg-[#F5EEFF] dark:hover:bg-gray-900 bg-white dark:bg-black"
                      onClick={() => {
                        setSelectedWindowSize(size);
                        setIsWindowSizeDropdownOpen(false);
                        setDeviceSize(size);
                      }}
                    >
                      <div className="w-5 h-5 text-[#6B7280] dark:text-gray-400 group-hover:text-accent dark:group-hover:text-accent transition-colors duration-200">
                        <size.icon className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium group-hover:text-accent dark:group-hover:text-accent transition-colors duration-200">
                          {size.name}
                        </span>
                        <span className="text-xs text-[#6B7280] dark:text-gray-400 group-hover:text-accent dark:group-hover:text-accent transition-colors duration-200">
                          {size.width} × {size.height}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 border-t border-depth-3 flex justify-center items-center overflow-auto">
        <div
          style={{
            width: isDeviceModeOn ? `${widthPercent}%` : '100%',
            height: '100%',
            overflow: 'visible',
            background: 'var(--color-depth-2)',
            position: 'relative',
            display: 'flex',
          }}
        >
          {hasBaseUrl ? (
            <>
              <iframe
                ref={iframeRef}
                title="preview"
                className="border-none w-full h-full"
                src={iframeUrl}
                sandbox="allow-scripts allow-forms allow-popups allow-modals allow-storage-access-by-user-activation allow-same-origin"
                allow="cross-origin-isolated"
                onLoad={() => {
                  if (!initialLoadRef.current) {
                    setIsLoading(false);
                  }

                  initialLoadRef.current = false;
                }}
                hidden={isLoading}
              />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-depth-2 z-50">
                  Loading preview...
                </div>
              )}
              <ScreenshotSelector
                isSelectionMode={isSelectionMode}
                setIsSelectionMode={setIsSelectionMode}
                containerRef={iframeRef}
              />
            </>
          ) : (
            <div className="flex w-full h-full justify-center items-center bg-depth-2 text-primary">
              Loading preview...
            </div>
          )}

          {isDeviceModeOn && hasBaseUrl && (
            <>
              <div
                onMouseDown={(e) => startResizing(e, 'left')}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '15px',
                  marginLeft: '-15px',
                  height: '100%',
                  cursor: 'ew-resize',
                  background: 'rgba(255,255,255,.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                  userSelect: 'none',
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.5)')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.2)')}
                title="Drag to resize width"
              >
                <GripIcon />
              </div>

              <div
                onMouseDown={(e) => startResizing(e, 'right')}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '15px',
                  marginRight: '-15px',
                  height: '100%',
                  cursor: 'ew-resize',
                  background: 'rgba(255,255,255,.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                  userSelect: 'none',
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.5)')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,.2)')}
                title="Drag to resize width"
              >
                <GripIcon />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
