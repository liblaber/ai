import { useEffect, useState } from 'react';
import type { ServiceStatus } from './types';
import { ProviderStatusCheckerFactory } from './provider-factory';
import { CheckCircle, AlertTriangle, XCircle, HelpCircle, Loader2 } from 'lucide-react';

export default function ServiceStatusTab() {
  const [serviceStatuses, setServiceStatuses] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAllProviders = async () => {
      try {
        setLoading(true);
        setError(null);

        const providers = ProviderStatusCheckerFactory.getProviderNames();
        const statuses: ServiceStatus[] = [];

        for (const provider of providers) {
          try {
            const checker = ProviderStatusCheckerFactory.getChecker(provider);
            const result = await checker.checkStatus();

            statuses.push({
              provider,
              ...result,
              lastChecked: new Date().toISOString(),
            });
          } catch (err) {
            console.error(`Error checking ${provider} status:`, err);
            statuses.push({
              provider,
              status: 'degraded',
              message: 'Unable to check service status',
              incidents: ['Error checking service status'],
              lastChecked: new Date().toISOString(),
            });
          }
        }

        setServiceStatuses(statuses);
      } catch (err) {
        console.error('Error checking provider statuses:', err);
        setError('Failed to check service statuses');
      } finally {
        setLoading(false);
      }
    };

    checkAllProviders();

    // Set up periodic checks every 5 minutes
    const interval = setInterval(checkAllProviders, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return 'text-green-500 dark:text-green-400';
      case 'degraded':
        return 'text-yellow-500 dark:text-yellow-400';
      case 'down':
        return 'text-red-500 dark:text-red-400';
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="w-5 h-5" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5" />;
      case 'down':
        return <XCircle className="w-5 h-5" />;
      default:
        return <HelpCircle className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-accent-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500 dark:text-red-400">
        <AlertTriangle className="w-8 h-8 mb-2" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        {serviceStatuses.map((service) => (
          <div
            key={service.provider}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{service.provider}</h3>
              <div className={`flex items-center ${getStatusColor(service.status)}`}>
                <div className="mr-2">{getStatusIcon(service.status)}</div>
                <span className="capitalize">{service.status}</span>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-2">{service.message}</p>
            {service.incidents && service.incidents.length > 0 && (
              <div className="mt-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Recent Incidents:</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {service.incidents.map((incident, index) => (
                    <li key={index}>{incident}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Last checked: {new Date(service.lastChecked).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
