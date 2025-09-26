import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Calendar, ExternalLink, Eye, Globe, Loader2, User } from 'lucide-react';
import { classNames } from '~/utils/classNames';
import { generateAppUrl, getDeploymentProvider, isDeploymentUrl } from '~/lib/utils/app-url';

interface DeployedAppCardProps {
  website: {
    id: string;
    chatId: string;
    siteName: string | null;
    siteUrl: string | null;
    createdAt: string;
    isPublic: boolean;
    createdBy: {
      name: string;
    };
  };
  onView?: (chatId: string) => void;
  className?: string;
}

export default function DeployedAppCard({ website, onView, className }: DeployedAppCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  const handleView = () => {
    if (onView) {
      onView(website.chatId);
    } else {
      // Open in new tab as fallback
      const appUrl = generateAppUrl({ chatId: website.chatId });
      window.open(appUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleValidateUrl = async () => {
    if (!website.siteUrl) {
      return undefined;
    }

    setIsValidating(true);

    try {
      const response = await fetch(`/api/validate-url?url=${encodeURIComponent(website.siteUrl)}`);
      // TODO: type
      const data = await response.json<any>();
      setIsValid(data.valid);
    } catch {
      setIsValid(false);
    } finally {
      setIsValidating(false);
    }

    return undefined;
  };

  const deploymentProvider = website.siteUrl ? getDeploymentProvider(website.siteUrl) : null;
  const isDeployment = website.siteUrl ? isDeploymentUrl(website.siteUrl) : false;

  return (
    <motion.div
      className={classNames(
        'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700',
        'p-4 transition-all duration-200',
        'hover:shadow-lg hover:border-accent-500/50',
        'cursor-pointer group',
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleView}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent-500 rounded-lg flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{website.siteName || 'Untitled App'}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{deploymentProvider || 'Unknown Provider'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isValidating ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          ) : isValid === false ? (
            <AlertCircle className="w-4 h-4 text-red-500" />
          ) : isValid === true ? (
            <div className="w-2 h-2 bg-green-500 rounded-full" />
          ) : null}

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleValidateUrl();
            }}
            className={classNames(
              'p-1 rounded transition-colors',
              'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
              'opacity-0 group-hover:opacity-100',
            )}
            title="Validate URL"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();

              if (website.siteUrl) {
                window.open(website.siteUrl, '_blank', 'noopener,noreferrer');
              }
            }}
            className={classNames(
              'p-1 rounded transition-colors',
              'text-gray-400 hover:text-accent-500',
              'opacity-0 group-hover:opacity-100',
            )}
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <User className="w-4 h-4" />
          <span>{website.createdBy.name}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="w-4 h-4" />
          <span>{new Date(website.createdAt).toLocaleDateString()}</span>
        </div>

        {website.siteUrl && <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{website.siteUrl}</div>}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={classNames(
              'px-2 py-1 rounded-full text-xs font-medium',
              website.isPublic
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
            )}
          >
            {website.isPublic ? 'Public' : 'Private'}
          </span>

          {isDeployment && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
              Deployed
            </span>
          )}
        </div>

        <motion.div className="text-accent-500 text-sm font-medium" animate={{ opacity: isHovered ? 1 : 0 }}>
          View App →
        </motion.div>
      </div>
    </motion.div>
  );
}
