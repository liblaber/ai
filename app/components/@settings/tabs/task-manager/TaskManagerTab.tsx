import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { classNames } from '~/utils/classNames';
import { Line } from 'react-chartjs-2';
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { toast } from 'sonner'; // Import toast
import { tabConfigurationStore } from '~/lib/stores/tabConfigurationStore';
import { useStore } from 'zustand';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
}

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number[];
    temperature?: number;
    frequency?: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
    heap: {
      used: number;
      total: number;
      limit: number;
    };
    cache?: number;
  };
  uptime: number;
  battery?: {
    level: number;
    charging: boolean;
    timeRemaining?: number;
    temperature?: number;
    cycles?: number;
    health?: number;
  };
  network: {
    downlink: number;
    uplink?: number;
    latency: number;
    type: string;
    activeConnections?: number;
    bytesReceived: number;
    bytesSent: number;
  };
  performance: {
    fps: number;
    pageLoad: number;
    domReady: number;
    resources: {
      total: number;
      size: number;
      loadTime: number;
    };
    timing: {
      ttfb: number;
      fcp: number;
      lcp: number;
    };
  };
  health: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
}

interface MetricsHistory {
  timestamps: string[];
  cpu: number[];
  memory: number[];
  battery: number[];
  network: number[];
}

interface EnergySavings {
  updatesReduced: number;
  timeInSaverMode: number;
  estimatedEnergySaved: number; // in mWh (milliwatt-hours)
}

interface PowerProfile {
  name: string;
  description: string;
  settings: {
    updateInterval: number;
    enableAnimations: boolean;
    backgroundProcessing: boolean;
    networkThrottling: boolean;
  };
}

interface PerformanceAlert {
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
  metric: string;
  threshold: number;
  value: number;
}

declare global {
  interface Navigator {
    getBattery(): Promise<BatteryManager>;
  }
  interface Performance {
    memory?: {
      jsHeapSizeLimit: number;
      totalJSHeapSize: number;
      usedJSHeapSize: number;
    };
  }
}

// Constants for update intervals
const UPDATE_INTERVALS = {
  normal: {
    metrics: 1000, // 1 second
    animation: 16, // ~60fps
  },
  energySaver: {
    metrics: 5000, // 5 seconds
    animation: 32, // ~30fps
  },
};

// Constants for performance thresholds
const PERFORMANCE_THRESHOLDS = {
  cpu: {
    warning: 70,
    critical: 90,
  },
  memory: {
    warning: 80,
    critical: 95,
  },
  fps: {
    warning: 30,
    critical: 15,
  },
};

// Constants for energy calculations
const ENERGY_COSTS = {
  update: 0.1, // mWh per update
};

// Default power profiles
const POWER_PROFILES: PowerProfile[] = [
  {
    name: 'Performance',
    description: 'Maximum performance with frequent updates',
    settings: {
      updateInterval: UPDATE_INTERVALS.normal.metrics,
      enableAnimations: true,
      backgroundProcessing: true,
      networkThrottling: false,
    },
  },
  {
    name: 'Balanced',
    description: 'Optimal balance between performance and energy efficiency',
    settings: {
      updateInterval: 2000,
      enableAnimations: true,
      backgroundProcessing: true,
      networkThrottling: false,
    },
  },
  {
    name: 'Energy Saver',
    description: 'Maximum energy efficiency with reduced updates',
    settings: {
      updateInterval: UPDATE_INTERVALS.energySaver.metrics,
      enableAnimations: false,
      backgroundProcessing: false,
      networkThrottling: true,
    },
  },
];

// Default metrics state
const DEFAULT_METRICS_STATE: SystemMetrics = {
  cpu: {
    usage: 0,
    cores: [],
  },
  memory: {
    used: 0,
    total: 0,
    percentage: 0,
    heap: {
      used: 0,
      total: 0,
      limit: 0,
    },
  },
  uptime: 0,
  network: {
    downlink: 0,
    latency: 0,
    type: 'unknown',
    bytesReceived: 0,
    bytesSent: 0,
  },
  performance: {
    fps: 0,
    pageLoad: 0,
    domReady: 0,
    resources: {
      total: 0,
      size: 0,
      loadTime: 0,
    },
    timing: {
      ttfb: 0,
      fcp: 0,
      lcp: 0,
    },
  },
  health: {
    score: 0,
    issues: [],
    suggestions: [],
  },
};

// Default metrics history
const DEFAULT_METRICS_HISTORY: MetricsHistory = {
  timestamps: Array(10).fill(new Date().toLocaleTimeString()),
  cpu: Array(10).fill(0),
  memory: Array(10).fill(0),
  battery: Array(10).fill(0),
  network: Array(10).fill(0),
};

// Battery threshold for auto energy saver mode
const BATTERY_THRESHOLD = 20; // percentage

// Maximum number of history points to keep
const MAX_HISTORY_POINTS = 10;

const TaskManagerTab: React.FC = () => {
  // Initialize metrics state with defaults
  const [metrics, setMetrics] = useState<SystemMetrics>(() => DEFAULT_METRICS_STATE);
  const [metricsHistory, setMetricsHistory] = useState<MetricsHistory>(() => DEFAULT_METRICS_HISTORY);
  const [energySaverMode, setEnergySaverMode] = useState<boolean>(false);
  const [autoEnergySaver, setAutoEnergySaver] = useState<boolean>(false);
  const [energySavings, setEnergySavings] = useState<EnergySavings>(() => ({
    updatesReduced: 0,
    timeInSaverMode: 0,
    estimatedEnergySaved: 0,
  }));
  const [selectedProfile, setSelectedProfile] = useState<PowerProfile>(() => POWER_PROFILES[1]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const saverModeStartTime = useRef<number | null>(null);

  // Get update status and tab configuration
  const tabConfig = useStore(tabConfigurationStore);

  const resetTabConfiguration = useCallback(() => {
    tabConfig.reset();
    return tabConfig.get();
  }, [tabConfig]);

  // Effect to handle tab visibility
  useEffect(() => {
    const handleTabVisibility = () => {
      const currentConfig = tabConfig.get();

      tabConfig.set({
        ...currentConfig,
        userTabs: currentConfig.userTabs,
      });
    };

    const checkInterval = setInterval(handleTabVisibility, 5000);

    return () => {
      clearInterval(checkInterval);
    };
  }, [metrics.cpu.usage, tabConfig]);

  // Effect to handle reset and initialization
  useEffect(() => {
    const resetToDefaults = () => {
      console.log('TaskManagerTab: Resetting to defaults');

      // Reset metrics and local state
      setMetrics(DEFAULT_METRICS_STATE);
      setMetricsHistory(DEFAULT_METRICS_HISTORY);
      setEnergySaverMode(false);
      setAutoEnergySaver(false);
      setEnergySavings({
        updatesReduced: 0,
        timeInSaverMode: 0,
        estimatedEnergySaved: 0,
      });
      setSelectedProfile(POWER_PROFILES[1]);
      setAlerts([]);
      saverModeStartTime.current = null;

      // Reset tab configuration to ensure proper visibility
      const defaultConfig = resetTabConfiguration();
      console.log('TaskManagerTab: Reset tab configuration:', defaultConfig);
    };

    // Listen for both storage changes and custom reset event
    const handleReset = (event: Event | StorageEvent) => {
      if (event instanceof StorageEvent) {
        if (event.key === 'tabConfiguration' && event.newValue === null) {
          resetToDefaults();
        }
      } else if (event instanceof CustomEvent && event.type === 'tabConfigReset') {
        resetToDefaults();
      }
    };

    // Initial setup
    const initializeTab = async () => {
      try {
        // Load saved preferences
        const savedEnergySaver = localStorage.getItem('energySaverMode');
        const savedAutoSaver = localStorage.getItem('autoEnergySaver');
        const savedProfile = localStorage.getItem('selectedProfile');

        if (savedEnergySaver) {
          setEnergySaverMode(JSON.parse(savedEnergySaver));
        }

        if (savedAutoSaver) {
          setAutoEnergySaver(JSON.parse(savedAutoSaver));
        }

        if (savedProfile) {
          const profile = POWER_PROFILES.find((p) => p.name === savedProfile);

          if (profile) {
            setSelectedProfile(profile);
          }
        }

        await updateMetrics();
      } catch (error) {
        console.error('Failed to initialize TaskManagerTab:', error);
        resetToDefaults();
      }
    };

    window.addEventListener('storage', handleReset);
    window.addEventListener('tabConfigReset', handleReset);
    initializeTab();

    return () => {
      window.removeEventListener('storage', handleReset);
      window.removeEventListener('tabConfigReset', handleReset);
    };
  }, []);

  // Get detailed performance metrics
  const getPerformanceMetrics = async (): Promise<Partial<SystemMetrics['performance']>> => {
    try {
      // Get FPS
      const fps = await measureFrameRate();

      // Get page load metrics
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const pageLoad = navigation.loadEventEnd - navigation.startTime;
      const domReady = navigation.domContentLoadedEventEnd - navigation.startTime;

      // Get resource metrics
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const resourceMetrics = {
        total: resources.length,
        size: resources.reduce((total, r) => total + (r.transferSize || 0), 0),
        loadTime: Math.max(0, ...resources.map((r) => r.duration)),
      };

      // Get Web Vitals
      const ttfb = navigation.responseStart - navigation.requestStart;
      const paintEntries = performance.getEntriesByType('paint');
      const fcp = paintEntries.find((entry) => entry.name === 'first-contentful-paint')?.startTime || 0;
      const lcpEntry = await getLargestContentfulPaint();

      return {
        fps,
        pageLoad,
        domReady,
        resources: resourceMetrics,
        timing: {
          ttfb,
          fcp,
          lcp: lcpEntry?.startTime || 0,
        },
      };
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return {};
    }
  };

  // Single useEffect for metrics updates
  useEffect(() => {
    let isComponentMounted = true;

    const updateMetricsWrapper = async () => {
      if (!isComponentMounted) {
        return;
      }

      try {
        await updateMetrics();
      } catch (error) {
        console.error('Failed to update metrics:', error);
      }
    };

    // Initial update
    updateMetricsWrapper();

    // Set up interval with immediate assignment
    const metricsInterval = setInterval(
      updateMetricsWrapper,
      energySaverMode ? UPDATE_INTERVALS.energySaver.metrics : UPDATE_INTERVALS.normal.metrics,
    );

    // Cleanup function
    return () => {
      isComponentMounted = false;
      clearInterval(metricsInterval);
    };
  }, [energySaverMode]); // Only depend on energySaverMode

  // Handle energy saver mode changes
  const handleEnergySaverChange = (checked: boolean) => {
    setEnergySaverMode(checked);
    localStorage.setItem('energySaverMode', JSON.stringify(checked));
    toast.success(checked ? 'Energy Saver mode enabled' : 'Energy Saver mode disabled');
  };

  // Handle auto energy saver changes
  const handleAutoEnergySaverChange = (checked: boolean) => {
    setAutoEnergySaver(checked);
    localStorage.setItem('autoEnergySaver', JSON.stringify(checked));
    toast.success(checked ? 'Auto Energy Saver enabled' : 'Auto Energy Saver disabled');

    if (!checked) {
      // When disabling auto mode, also disable energy saver mode
      setEnergySaverMode(false);
      localStorage.setItem('energySaverMode', 'false');
    }
  };

  // Update energy savings calculation
  const updateEnergySavings = useCallback(() => {
    if (!energySaverMode) {
      saverModeStartTime.current = null;
      setEnergySavings({
        updatesReduced: 0,
        timeInSaverMode: 0,
        estimatedEnergySaved: 0,
      });

      return;
    }

    if (!saverModeStartTime.current) {
      saverModeStartTime.current = Date.now();
    }

    const timeInSaverMode = Math.max(0, (Date.now() - (saverModeStartTime.current || Date.now())) / 1000);

    const normalUpdatesPerMinute = 60 / (UPDATE_INTERVALS.normal.metrics / 1000);
    const saverUpdatesPerMinute = 60 / (UPDATE_INTERVALS.energySaver.metrics / 1000);
    const updatesReduced = Math.floor((normalUpdatesPerMinute - saverUpdatesPerMinute) * (timeInSaverMode / 60));

    const energyPerUpdate = ENERGY_COSTS.update;
    const energySaved = (updatesReduced * energyPerUpdate) / 3600;

    setEnergySavings({
      updatesReduced,
      timeInSaverMode,
      estimatedEnergySaved: energySaved,
    });
  }, [energySaverMode]);

  // Add interval for energy savings updates
  useEffect(() => {
    const interval = setInterval(updateEnergySavings, 1000);
    return () => clearInterval(interval);
  }, [updateEnergySavings]);

  // Measure frame rate
  const measureFrameRate = async (): Promise<number> => {
    return new Promise((resolve) => {
      const frameCount = { value: 0 };
      const startTime = performance.now();

      const countFrame = (time: number) => {
        frameCount.value++;

        if (time - startTime >= 1000) {
          resolve(Math.round((frameCount.value * 1000) / (time - startTime)));
        } else {
          requestAnimationFrame(countFrame);
        }
      };

      requestAnimationFrame(countFrame);
    });
  };

  // Get Largest Contentful Paint
  const getLargestContentfulPaint = async (): Promise<PerformanceEntry | undefined> => {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        resolve(entries[entries.length - 1]);
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // Resolve after 3 seconds if no LCP entry is found
      setTimeout(() => resolve(undefined), 3000);
    });
  };

  // Analyze system health
  const analyzeSystemHealth = (currentMetrics: SystemMetrics): SystemMetrics['health'] => {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // CPU analysis
    if (currentMetrics.cpu.usage > PERFORMANCE_THRESHOLDS.cpu.critical) {
      score -= 30;
      issues.push('Critical CPU usage');
      suggestions.push('Consider closing resource-intensive applications');
    } else if (currentMetrics.cpu.usage > PERFORMANCE_THRESHOLDS.cpu.warning) {
      score -= 15;
      issues.push('High CPU usage');
      suggestions.push('Monitor system processes for unusual activity');
    }

    // Memory analysis
    if (currentMetrics.memory.percentage > PERFORMANCE_THRESHOLDS.memory.critical) {
      score -= 30;
      issues.push('Critical memory usage');
      suggestions.push('Close unused applications to free up memory');
    } else if (currentMetrics.memory.percentage > PERFORMANCE_THRESHOLDS.memory.warning) {
      score -= 15;
      issues.push('High memory usage');
      suggestions.push('Consider freeing up memory by closing background applications');
    }

    // Performance analysis
    if (currentMetrics.performance.fps < PERFORMANCE_THRESHOLDS.fps.critical) {
      score -= 20;
      issues.push('Very low frame rate');
      suggestions.push('Disable animations or switch to power saver mode');
    } else if (currentMetrics.performance.fps < PERFORMANCE_THRESHOLDS.fps.warning) {
      score -= 10;
      issues.push('Low frame rate');
      suggestions.push('Consider reducing visual effects');
    }

    // Battery analysis
    if (currentMetrics.battery && !currentMetrics.battery.charging && currentMetrics.battery.level < 20) {
      score -= 10;
      issues.push('Low battery');
      suggestions.push('Connect to power source or enable power saver mode');
    }

    return {
      score: Math.max(0, score),
      issues,
      suggestions,
    };
  };

  // Update metrics with enhanced data
  const updateMetrics = async () => {
    try {
      // Get memory info using Performance API
      const memory = performance.memory || {
        jsHeapSizeLimit: 0,
        totalJSHeapSize: 0,
        usedJSHeapSize: 0,
      };
      const totalMem = memory.totalJSHeapSize / (1024 * 1024);
      const usedMem = memory.usedJSHeapSize / (1024 * 1024);
      const memPercentage = (usedMem / totalMem) * 100;

      // Get CPU usage using Performance API
      const cpuUsage = await getCPUUsage();

      // Get battery info
      let batteryInfo: SystemMetrics['battery'] | undefined;

      try {
        const battery = await navigator.getBattery();
        batteryInfo = {
          level: battery.level * 100,
          charging: battery.charging,
          timeRemaining: battery.charging ? battery.chargingTime : battery.dischargingTime,
        };
      } catch {
        console.log('Battery API not available');
      }

      // Get network info using Network Information API
      const connection =
        (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      const networkInfo = {
        downlink: connection?.downlink || 0,
        uplink: connection?.uplink,
        latency: connection?.rtt || 0,
        type: connection?.type || 'unknown',
        activeConnections: connection?.activeConnections,
        bytesReceived: connection?.bytesReceived || 0,
        bytesSent: connection?.bytesSent || 0,
      };

      // Get enhanced performance metrics
      const performanceMetrics = await getPerformanceMetrics();

      const metrics: SystemMetrics = {
        cpu: { usage: cpuUsage, cores: [], temperature: undefined, frequency: undefined },
        memory: {
          used: Math.round(usedMem),
          total: Math.round(totalMem),
          percentage: Math.round(memPercentage),
          heap: {
            used: Math.round(usedMem),
            total: Math.round(totalMem),
            limit: Math.round(totalMem),
          },
        },
        uptime: performance.now() / 1000,
        battery: batteryInfo,
        network: networkInfo,
        performance: performanceMetrics as SystemMetrics['performance'],
        health: { score: 0, issues: [], suggestions: [] },
      };

      // Analyze system health
      metrics.health = analyzeSystemHealth(metrics);

      // Check for alerts
      checkPerformanceAlerts(metrics);

      setMetrics(metrics);

      // Update metrics history
      const now = new Date().toLocaleTimeString();
      setMetricsHistory((prev) => {
        const timestamps = [...prev.timestamps, now].slice(-MAX_HISTORY_POINTS);
        const cpu = [...prev.cpu, metrics.cpu.usage].slice(-MAX_HISTORY_POINTS);
        const memory = [...prev.memory, metrics.memory.percentage].slice(-MAX_HISTORY_POINTS);
        const battery = [...prev.battery, batteryInfo?.level || 0].slice(-MAX_HISTORY_POINTS);
        const network = [...prev.network, networkInfo.downlink].slice(-MAX_HISTORY_POINTS);

        return { timestamps, cpu, memory, battery, network };
      });
    } catch (error) {
      console.error('Failed to update system metrics:', error);
    }
  };

  // Get real CPU usage using Performance API
  const getCPUUsage = async (): Promise<number> => {
    try {
      const t0 = performance.now();

      // Create some actual work to measure and use the result
      let result = 0;

      for (let i = 0; i < 10000; i++) {
        result += Math.random();
      }

      // Use result to prevent optimization
      if (result < 0) {
        console.log('Unexpected negative result');
      }

      const t1 = performance.now();
      const timeTaken = t1 - t0;

      /*
       * Normalize to percentage (0-100)
       * Lower time = higher CPU availability
       */
      const maxExpectedTime = 50; // baseline in ms
      const cpuAvailability = Math.max(0, Math.min(100, ((maxExpectedTime - timeTaken) / maxExpectedTime) * 100));

      return 100 - cpuAvailability; // Convert availability to usage
    } catch (error) {
      console.error('Failed to get CPU usage:', error);
      return 0;
    }
  };

  // Add network change listener
  useEffect(() => {
    const connection =
      (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    if (!connection) {
      return;
    }

    const updateNetworkInfo = () => {
      setMetrics((prev) => ({
        ...prev,
        network: {
          downlink: connection.downlink || 0,
          latency: connection.rtt || 0,
          type: connection.type || 'unknown',
          bytesReceived: connection.bytesReceived || 0,
          bytesSent: connection.bytesSent || 0,
        },
      }));
    };

    connection.addEventListener('change', updateNetworkInfo);

    // eslint-disable-next-line consistent-return
    return () => connection.removeEventListener('change', updateNetworkInfo);
  }, []);

  // Remove all animation and process monitoring
  useEffect(() => {
    const metricsInterval = setInterval(
      () => {
        if (!energySaverMode) {
          updateMetrics();
        }
      },
      energySaverMode ? UPDATE_INTERVALS.energySaver.metrics : UPDATE_INTERVALS.normal.metrics,
    );

    return () => {
      clearInterval(metricsInterval);
    };
  }, [energySaverMode]);

  const getUsageColor = (usage: number): string => {
    if (usage > 80) {
      return 'text-red-500';
    }

    if (usage > 50) {
      return 'text-yellow-500';
    }

    return 'text-gray-500';
  };

  const renderUsageGraph = (data: number[], label: string, color: string) => {
    const chartData = {
      labels: metricsHistory.timestamps,
      datasets: [
        {
          label,
          data,
          borderColor: color,
          fill: false,
          tension: 0.4,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
          },
        },
        x: {
          grid: {
            display: false,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
      animation: {
        duration: 0,
      } as const,
    };

    return (
      <div className="h-32">
        <Line data={chartData} options={options} />
      </div>
    );
  };

  useEffect((): (() => void) | undefined => {
    if (!autoEnergySaver) {
      // If auto mode is disabled, clear any forced energy saver state
      setEnergySaverMode(false);
      return undefined;
    }

    const checkBatteryStatus = async () => {
      try {
        const battery = await navigator.getBattery();
        const shouldEnableSaver = !battery.charging && battery.level * 100 <= BATTERY_THRESHOLD;
        setEnergySaverMode(shouldEnableSaver);
      } catch {
        console.log('Battery API not available');
      }
    };

    checkBatteryStatus();

    const batteryCheckInterval = setInterval(checkBatteryStatus, 60000);

    return () => clearInterval(batteryCheckInterval);
  }, [autoEnergySaver]);

  // Check for performance alerts
  const checkPerformanceAlerts = (currentMetrics: SystemMetrics) => {
    const newAlerts: PerformanceAlert[] = [];

    // CPU alert
    if (currentMetrics.cpu.usage > PERFORMANCE_THRESHOLDS.cpu.critical) {
      newAlerts.push({
        type: 'error',
        message: 'Critical CPU usage detected',
        timestamp: Date.now(),
        metric: 'cpu',
        threshold: PERFORMANCE_THRESHOLDS.cpu.critical,
        value: currentMetrics.cpu.usage,
      });
    }

    // Memory alert
    if (currentMetrics.memory.percentage > PERFORMANCE_THRESHOLDS.memory.critical) {
      newAlerts.push({
        type: 'error',
        message: 'Critical memory usage detected',
        timestamp: Date.now(),
        metric: 'memory',
        threshold: PERFORMANCE_THRESHOLDS.memory.critical,
        value: currentMetrics.memory.percentage,
      });
    }

    // Performance alert
    if (currentMetrics.performance.fps < PERFORMANCE_THRESHOLDS.fps.critical) {
      newAlerts.push({
        type: 'warning',
        message: 'Very low frame rate detected',
        timestamp: Date.now(),
        metric: 'fps',
        threshold: PERFORMANCE_THRESHOLDS.fps.critical,
        value: currentMetrics.performance.fps,
      });
    }

    if (newAlerts.length > 0) {
      setAlerts((prev) => [...prev, ...newAlerts]);
      newAlerts.forEach((alert) => {
        toast.warning(alert.message);
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Power Profile Selection */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium text-liblab-elements-textPrimary">Power Management</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoEnergySaver"
                checked={autoEnergySaver}
                onChange={(e) => handleAutoEnergySaverChange(e.target.checked)}
                className="form-checkbox h-4 w-4 text-accent-600 rounded border-gray-300 dark:border-gray-700"
              />
              <div className="i-ph:gauge-duotone w-4 h-4 text-liblab-elements-textSecondary" />
              <label htmlFor="autoEnergySaver" className="text-sm text-liblab-elements-textSecondary">
                Auto Energy Saver
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="energySaver"
                checked={energySaverMode}
                onChange={(e) => !autoEnergySaver && handleEnergySaverChange(e.target.checked)}
                disabled={autoEnergySaver}
                className="form-checkbox h-4 w-4 text-accent-600 rounded border-gray-300 dark:border-gray-700 disabled:opacity-50"
              />
              <div className="i-ph:leaf-duotone w-4 h-4 text-liblab-elements-textSecondary" />
              <label
                htmlFor="energySaver"
                className={classNames('text-sm text-liblab-elements-textSecondary', { 'opacity-50': autoEnergySaver })}
              >
                Energy Saver
                {energySaverMode && <span className="ml-2 text-xs text-liblab-elements-textSecondary">Active</span>}
              </label>
            </div>
            <div className="relative">
              <select
                value={selectedProfile.name}
                onChange={(e) => {
                  const profile = POWER_PROFILES.find((p) => p.name === e.target.value);

                  if (profile) {
                    setSelectedProfile(profile);
                    toast.success(`Switched to ${profile.name} power profile`);
                  }
                }}
                className="pl-8 pr-8 py-1.5 rounded-md bg-liblab-background-secondary dark:bg-[#1E1E1E] border border-liblab-border dark:border-liblab-borderDark text-sm text-liblab-elements-textPrimary dark:text-liblab-elements-textPrimaryDark hover:border-liblab-action-primary dark:hover:border-liblab-action-primary focus:outline-none focus:ring-1 focus:ring-liblab-action-primary appearance-none min-w-[160px] cursor-pointer transition-colors duration-150"
                style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
              >
                {POWER_PROFILES.map((profile) => (
                  <option
                    key={profile.name}
                    value={profile.name}
                    className="py-2 px-3 bg-liblab-background-secondary dark:bg-[#1E1E1E] text-liblab-elements-textPrimary dark:text-liblab-elements-textPrimaryDark hover:bg-liblab-background-tertiary dark:hover:bg-liblab-backgroundDark-tertiary cursor-pointer"
                  >
                    {profile.name}
                  </option>
                ))}
              </select>
              <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <div
                  className={classNames('w-4 h-4 text-liblab-elements-textSecondary', {
                    'i-ph:lightning-fill text-yellow-500': selectedProfile.name === 'Performance',
                    'i-ph:scales-fill text-blue-500': selectedProfile.name === 'Balanced',
                    'i-ph:leaf-fill text-green-500': selectedProfile.name === 'Energy Saver',
                  })}
                />
              </div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <div className="i-ph:caret-down w-4 h-4 text-liblab-elements-textSecondary opacity-75" />
              </div>
            </div>
          </div>
        </div>
        <div className="text-sm text-liblab-elements-textSecondary">{selectedProfile.description}</div>
      </div>

      {/* System Health Score */}
      <div className="flex flex-col gap-4">
        <h3 className="text-base font-medium text-liblab-elements-textPrimary">System Health</h3>
        <div className="grid grid-cols-1 gap-4">
          <div className="flex flex-col gap-2 rounded-lg bg-[#F8F8F8] dark:bg-[#141414] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-liblab-elements-textSecondary">Health Score</span>
              <span
                className={classNames('text-lg font-medium', {
                  'text-green-500': metrics.health.score >= 80,
                  'text-yellow-500': metrics.health.score >= 60 && metrics.health.score < 80,
                  'text-red-500': metrics.health.score < 60,
                })}
              >
                {metrics.health.score}%
              </span>
            </div>
            {metrics.health.issues.length > 0 && (
              <div className="mt-2">
                <div className="text-sm font-medium text-liblab-elements-textSecondary mb-1">Issues:</div>
                <ul className="text-sm text-liblab-elements-textSecondary space-y-1">
                  {metrics.health.issues.map((issue, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="i-ph:warning-circle-fill text-yellow-500 w-4 h-4" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {metrics.health.suggestions.length > 0 && (
              <div className="mt-2">
                <div className="text-sm font-medium text-liblab-elements-textSecondary mb-1">Suggestions:</div>
                <ul className="text-sm text-liblab-elements-textSecondary space-y-1">
                  {metrics.health.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="i-ph:lightbulb-fill text-accent-500 w-4 h-4" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Metrics */}
      <div className="flex flex-col gap-4">
        <h3 className="text-base font-medium text-liblab-elements-textPrimary">System Metrics</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* CPU Usage */}
          <div className="flex flex-col gap-2 rounded-lg bg-[#F8F8F8] dark:bg-[#141414] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-liblab-elements-textSecondary">CPU Usage</span>
              <span className={classNames('text-sm font-medium', getUsageColor(metrics.cpu.usage))}>
                {Math.round(metrics.cpu.usage)}%
              </span>
            </div>
            {renderUsageGraph(metricsHistory.cpu, 'CPU', '#9333ea')}
            {metrics.cpu.temperature && (
              <div className="text-xs text-liblab-elements-textSecondary mt-2">
                Temperature: {metrics.cpu.temperature}°C
              </div>
            )}
            {metrics.cpu.frequency && (
              <div className="text-xs text-liblab-elements-textSecondary">
                Frequency: {(metrics.cpu.frequency / 1000).toFixed(1)} GHz
              </div>
            )}
          </div>

          {/* Memory Usage */}
          <div className="flex flex-col gap-2 rounded-lg bg-[#F8F8F8] dark:bg-[#141414] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-liblab-elements-textSecondary">Memory Usage</span>
              <span className={classNames('text-sm font-medium', getUsageColor(metrics.memory.percentage))}>
                {Math.round(metrics.memory.percentage)}%
              </span>
            </div>
            {renderUsageGraph(metricsHistory.memory, 'Memory', '#2563eb')}
            <div className="text-xs text-liblab-elements-textSecondary mt-2">
              Used: {formatBytes(metrics.memory.used)}
            </div>
            <div className="text-xs text-liblab-elements-textSecondary">Total: {formatBytes(metrics.memory.total)}</div>
            <div className="text-xs text-liblab-elements-textSecondary">
              Heap: {formatBytes(metrics.memory.heap.used)} / {formatBytes(metrics.memory.heap.total)}
            </div>
          </div>

          {/* Performance */}
          <div className="flex flex-col gap-2 rounded-lg bg-[#F8F8F8] dark:bg-[#141414] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-liblab-elements-textSecondary">Performance</span>
              <span
                className={classNames('text-sm font-medium', {
                  'text-red-500': metrics.performance.fps < PERFORMANCE_THRESHOLDS.fps.critical,
                  'text-yellow-500': metrics.performance.fps < PERFORMANCE_THRESHOLDS.fps.warning,
                  'text-green-500': metrics.performance.fps >= PERFORMANCE_THRESHOLDS.fps.warning,
                })}
              >
                {Math.round(metrics.performance.fps)} FPS
              </span>
            </div>
            <div className="text-xs text-liblab-elements-textSecondary mt-2">
              Page Load: {(metrics.performance.pageLoad / 1000).toFixed(2)}s
            </div>
            <div className="text-xs text-liblab-elements-textSecondary">
              DOM Ready: {(metrics.performance.domReady / 1000).toFixed(2)}s
            </div>
            <div className="text-xs text-liblab-elements-textSecondary">
              TTFB: {(metrics.performance.timing.ttfb / 1000).toFixed(2)}s
            </div>
            <div className="text-xs text-liblab-elements-textSecondary">
              Resources: {metrics.performance.resources.total} ({formatBytes(metrics.performance.resources.size)})
            </div>
          </div>

          {/* Network */}
          <div className="flex flex-col gap-2 rounded-lg bg-[#F8F8F8] dark:bg-[#141414] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-liblab-elements-textSecondary">Network</span>
              <span className="text-sm font-medium text-liblab-elements-textPrimary">
                {metrics.network.downlink.toFixed(1)} Mbps
              </span>
            </div>
            {renderUsageGraph(metricsHistory.network, 'Network', '#f59e0b')}
            <div className="text-xs text-liblab-elements-textSecondary mt-2">Type: {metrics.network.type}</div>
            <div className="text-xs text-liblab-elements-textSecondary">Latency: {metrics.network.latency}ms</div>
            <div className="text-xs text-liblab-elements-textSecondary">
              Received: {formatBytes(metrics.network.bytesReceived)}
            </div>
            <div className="text-xs text-liblab-elements-textSecondary">
              Sent: {formatBytes(metrics.network.bytesSent)}
            </div>
          </div>
        </div>

        {/* Battery Section */}
        {metrics.battery && (
          <div className="flex flex-col gap-2 rounded-lg bg-[#F8F8F8] dark:bg-[#141414] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-liblab-elements-textSecondary">Battery</span>
              <div className="flex items-center gap-2">
                {metrics.battery.charging && <div className="i-ph:lightning-fill w-4 h-4 text-liblab-action-primary" />}
                <span
                  className={classNames(
                    'text-sm font-medium',
                    metrics.battery.level > 20 ? 'text-liblab-elements-textPrimary' : 'text-red-500',
                  )}
                >
                  {Math.round(metrics.battery.level)}%
                </span>
              </div>
            </div>
            {renderUsageGraph(metricsHistory.battery, 'Battery', '#22c55e')}
            {metrics.battery.timeRemaining && (
              <div className="text-xs text-liblab-elements-textSecondary mt-2">
                {metrics.battery.charging ? 'Time to full: ' : 'Time remaining: '}
                {formatTime(metrics.battery.timeRemaining)}
              </div>
            )}
            {metrics.battery.temperature && (
              <div className="text-xs text-liblab-elements-textSecondary">
                Temperature: {metrics.battery.temperature}°C
              </div>
            )}
            {metrics.battery.cycles && (
              <div className="text-xs text-liblab-elements-textSecondary">Charge cycles: {metrics.battery.cycles}</div>
            )}
            {metrics.battery.health && (
              <div className="text-xs text-liblab-elements-textSecondary">
                Battery health: {metrics.battery.health}%
              </div>
            )}
          </div>
        )}

        {/* Performance Alerts */}
        {alerts.length > 0 && (
          <div className="flex flex-col gap-2 rounded-lg bg-[#F8F8F8] dark:bg-[#141414] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-liblab-elements-textPrimary">Recent Alerts</span>
              <button
                onClick={() => setAlerts([])}
                className="text-xs text-liblab-elements-textSecondary hover:text-liblab-elements-textPrimary"
              >
                Clear All
              </button>
            </div>
            <div className="space-y-2">
              {alerts.slice(-5).map((alert, index) => (
                <div
                  key={index}
                  className={classNames('flex items-center gap-2 text-sm', {
                    'text-red-500': alert.type === 'error',
                    'text-yellow-500': alert.type === 'warning',
                    'text-blue-500': alert.type === 'info',
                  })}
                >
                  <div
                    className={classNames('w-4 h-4', {
                      'i-ph:warning-circle-fill': alert.type === 'warning',
                      'i-ph:x-circle-fill': alert.type === 'error',
                      'i-ph:info-fill': alert.type === 'info',
                    })}
                  />
                  <span>{alert.message}</span>
                  <span className="text-xs text-liblab-elements-textSecondary ml-auto">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Energy Savings */}
        {energySaverMode && (
          <div className="flex flex-col gap-2 rounded-lg bg-[#F8F8F8] dark:bg-[#141414] p-4">
            <h4 className="text-sm font-medium text-liblab-elements-textPrimary">Energy Savings</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-liblab-elements-textSecondary">Updates Reduced</span>
                <p className="text-lg font-medium text-liblab-elements-textPrimary">{energySavings.updatesReduced}</p>
              </div>
              <div>
                <span className="text-sm text-liblab-elements-textSecondary">Time in Saver Mode</span>
                <p className="text-lg font-medium text-liblab-elements-textPrimary">
                  {Math.floor(energySavings.timeInSaverMode / 60)}m {Math.floor(energySavings.timeInSaverMode % 60)}s
                </p>
              </div>
              <div>
                <span className="text-sm text-liblab-elements-textSecondary">Energy Saved</span>
                <p className="text-lg font-medium text-liblab-elements-textPrimary">
                  {energySavings.estimatedEnergySaved.toFixed(2)} mWh
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(TaskManagerTab);

// Helper function to format bytes
const formatBytes = (bytes: number): string => {
  if (bytes === 0) {
    return '0 B';
  }

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Helper function to format time
const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || seconds === 0) {
    return 'Unknown';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
};
