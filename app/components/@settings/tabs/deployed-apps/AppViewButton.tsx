import { useState } from 'react';
import { Eye, ExternalLink, Loader2 } from 'lucide-react';
import { classNames } from '~/utils/classNames';
import { generateAppUrl } from '~/lib/utils/app-url';

interface AppViewButtonProps {
  chatId: string;
  siteUrl: string | null;
  siteName: string | null;
  className?: string;
}

export default function AppViewButton({ chatId, siteUrl, siteName, className }: AppViewButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleViewApp = async () => {
    if (!siteUrl) {
      return;
    }

    setIsLoading(true);

    try {
      // Generate the friendly app URL
      const appUrl = generateAppUrl({ chatId });

      // Open in new tab
      window.open(appUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to open app:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDirect = () => {
    if (siteUrl) {
      window.open(siteUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!siteUrl) {
    return <div className={classNames('text-sm text-gray-400 dark:text-gray-500', className)}>Not deployed</div>;
  }

  return (
    <div className={classNames('flex items-center gap-2', className)}>
      <button
        onClick={handleViewApp}
        disabled={isLoading}
        className={classNames(
          'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
          'bg-accent-500 hover:bg-accent-600 text-white',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
        title={`View ${siteName || 'app'} in friendly URL`}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
        View App
      </button>

      <button
        onClick={handleOpenDirect}
        className={classNames(
          'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
          'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600',
          'text-gray-700 dark:text-gray-300',
        )}
        title="Open direct deployment URL"
      >
        <ExternalLink className="w-4 h-4" />
        Direct
      </button>
    </div>
  );
}
