import { classNames } from '~/utils/classNames';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Eye, EyeOff, Loader2, Save, Trash2, XCircle } from 'lucide-react';
import { BaseSelect } from '~/components/ui/Select';
import {
  type EnvironmentDeploymentMethod,
  useDeploymentMethodActions,
  useDeploymentMethodsStore,
} from '~/lib/stores/deploymentMethods';
import { type CredentialField, type DeploymentProviderInfo } from '~/lib/validation/deploymentMethods';
import { type CredentialType, type DeploymentMethodResponse } from '~/types/deployment-methods';

interface EditDeploymentMethodFormProps {
  selectedDeploymentMethod: EnvironmentDeploymentMethod;
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
  onSuccess: (responseData?: any) => void;
  onDelete: (responseData?: any) => void;
  onBack?: () => void;
}

export default function EditDeploymentMethodForm({
  selectedDeploymentMethod,
  isSubmitting,
  setIsSubmitting,
  onSuccess,
  onDelete,
  onBack,
}: EditDeploymentMethodFormProps) {
  const [selectedProvider, setSelectedProvider] = useState<DeploymentProviderInfo | null>(null);
  const [credentials, setCredentials] = useState<CredentialField[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [applyToAllEnvironments, setApplyToAllEnvironments] = useState(false);
  const [showSensitiveInput, setShowSensitiveInput] = useState(false);

  // Use providers from store
  const { providers } = useDeploymentMethodsStore();
  const { loadProviders } = useDeploymentMethodActions();

  // Load providers on component mount
  useEffect(() => {
    const loadProvidersData = async () => {
      try {
        await loadProviders();
      } catch (error) {
        setError('Failed to load providers');
        console.error('Error loading providers:', error);
      }
    };

    loadProvidersData();
  }, []);

  // Set selected provider when providers are loaded
  useEffect(() => {
    if (providers.length > 0 && !selectedProvider) {
      // Find and set the current provider
      const currentProvider = providers.find((p: DeploymentProviderInfo) => p.id === selectedDeploymentMethod.provider);

      if (currentProvider) {
        setSelectedProvider(currentProvider);
      } else if (providers.length === 1) {
        // If current provider is not available but only one provider is available, use that one
        setSelectedProvider(providers[0]);
      }
    }
  }, [providers, selectedProvider, selectedDeploymentMethod.provider]);

  // Initialize credentials from selected deployment method
  useEffect(() => {
    if (selectedDeploymentMethod.credentials) {
      const initialCredentials: CredentialField[] = selectedDeploymentMethod.credentials.map((cred) => ({
        type: cred.type as CredentialType,
        value: cred.value,
      }));
      setCredentials(initialCredentials);
    }
  }, [selectedDeploymentMethod.credentials]);

  // Update credentials when provider changes
  useEffect(() => {
    if (selectedProvider) {
      const newCredentials: CredentialField[] = selectedProvider.requiredCredentials.map((credType) => {
        // Try to preserve existing values
        const existingCred = credentials.find((cred) => cred.type === credType);
        return {
          type: credType as CredentialType,
          value: existingCred?.value || '',
        };
      });
      setCredentials(newCredentials);
    }

    setError(null);
  }, [selectedProvider]);

  const handleCredentialChange = (index: number, value: string) => {
    const newCredentials = [...credentials];
    newCredentials[index].value = value;
    setCredentials(newCredentials);
    setError(null);
  };

  const getCredentialDisplayName = (type: string): string => {
    switch (type) {
      case 'API_KEY':
        return 'API Key';
      case 'ACCESS_KEY':
        return 'Access Key';
      case 'SECRET_KEY':
        return 'Secret Key';
      case 'REGION':
        return 'Region';
      default:
        return type;
    }
  };

  const isSensitiveCredential = (type: string): boolean => {
    return type !== 'REGION';
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!selectedProvider) {
      setError('Please select a provider');
      return;
    }

    // Check if all required credentials are filled
    const missingCredentials = credentials.filter((cred) => !String(cred.value).trim());

    if (missingCredentials.length > 0) {
      setError('Please fill in all required credentials');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/deployment-methods/${selectedDeploymentMethod.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: selectedProvider.id,
          applyToAllEnvironments,
          credentials: credentials.map((cred) => ({
            type: cred.type,
            value: String(cred.value).trim(),
          })),
        }),
      });

      const data = await response.json<DeploymentMethodResponse>();

      if (data.success) {
        const successMessage = applyToAllEnvironments
          ? `Publishing method updated successfully across all environments`
          : 'Publishing method updated successfully';
        toast.success(successMessage);
        onSuccess(data);
      } else {
        const message = data.error || 'Failed to update publishing method';
        setError(message);
        toast.error(message);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error) || 'Failed to update publishing method. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/deployment-methods/${selectedDeploymentMethod.id}`, {
        method: 'DELETE',
      });

      const data = await response.json<DeploymentMethodResponse>();

      if (data.success) {
        toast.success('Publishing method deleted successfully');
        onDelete(data);
      } else {
        const message = data.error || 'Failed to delete publishing method';
        setError(message);
        toast.error(message);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error) || 'Failed to delete publishing method. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className={classNames(
                'inline-flex items-center gap-2 p-2 text-sm font-medium rounded-lg transition-colors',
                'dark:bg-gray-900 dark:text-gray-300',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
              )}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h2 className="text-lg font-medium text-primary">
              {selectedProvider ? `Connect to ${selectedProvider.name}` : 'Edit Publishing Method'}
            </h2>
            <p className="text-sm text-secondary">
              {selectedProvider
                ? `Modify your ${selectedProvider.name} publishing method connection settings`
                : 'Modify your publishing method connection settings'}
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-4">
          {!applyToAllEnvironments && (
            <div className="mb-6">
              <label className="mb-3 block text-sm font-medium text-secondary">Environment</label>
              <div className="px-4 py-2.5 bg-[#F5F5F5] dark:bg-gray-700 border border-[#E5E5E5] dark:border-[#1A1A1A] rounded-lg text-primary">
                {selectedDeploymentMethod.environment.name}
              </div>
              {selectedDeploymentMethod.environment.description && (
                <div className="text-gray-400 text-sm mt-2">{selectedDeploymentMethod.environment.description}</div>
              )}
            </div>
          )}

          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={applyToAllEnvironments}
                onChange={(e) => {
                  setApplyToAllEnvironments(e.target.checked);
                  setError(null);
                }}
                disabled={isSubmitting}
                className="w-4 h-4 text-accent-500 bg-gray-100 border-gray-300 rounded focus:ring-accent-500 focus:ring-2"
              />
              <span className="text-sm font-medium text-secondary">Apply to all environments</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-7">
              This will update the deployment method with the same credentials across all environments
            </p>
          </div>

          <div className="mb-6">
            <label className="mb-3 block text-sm font-medium text-secondary">Provider</label>
            <BaseSelect
              value={
                selectedProvider
                  ? {
                      label: selectedProvider.name,
                      value: selectedProvider.id,
                      description: selectedProvider.description,
                    }
                  : null
              }
              onChange={(option) => {
                const provider = option ? providers.find((p) => p.id === option.value) || null : null;
                setSelectedProvider(provider);
                setError(null);
              }}
              options={providers.map((provider) => ({
                label: provider.name,
                value: provider.id,
                description: provider.description,
              }))}
              placeholder={providers.length === 0 ? 'Loading providers...' : 'Select provider'}
              isDisabled={providers.length === 0 || providers.length === 1}
              width="100%"
              minWidth="100%"
              isSearchable={false}
            />
            {selectedProvider?.description && (
              <div className="text-gray-400 text-sm mt-2">{selectedProvider.description}</div>
            )}
          </div>

          {selectedProvider && credentials.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-secondary">Credentials</h4>
              {credentials.map((cred, index) => (
                <div key={index}>
                  <label className="mb-3 block text-sm font-medium text-secondary">
                    {getCredentialDisplayName(String(cred.type))}
                  </label>
                  <div className="relative">
                    <input
                      type={isSensitiveCredential(String(cred.type)) && !showSensitiveInput ? 'password' : 'text'}
                      value={String(cred.value || '')}
                      onChange={(e) => handleCredentialChange(index, e.target.value)}
                      disabled={isSubmitting}
                      className={classNames(
                        'w-full px-4 py-2.5 bg-[#F5F5F5] dark:bg-gray-700 border rounded-lg',
                        'text-primary placeholder-tertiary text-base',
                        'border-[#E5E5E5] dark:border-[#1A1A1A] rounded-lg',
                        'focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500',
                        'transition-all duration-200',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        isSensitiveCredential(String(cred.type)) ? 'pr-12' : '',
                      )}
                      placeholder={`Enter ${getCredentialDisplayName(String(cred.type)).toLowerCase()}`}
                    />
                    {isSensitiveCredential(String(cred.type)) && (
                      <button
                        type="button"
                        onClick={() => setShowSensitiveInput((prev) => !prev)}
                        disabled={isSubmitting}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#4b4f5a] rounded group disabled:opacity-50"
                        tabIndex={-1}
                      >
                        <span className="text-gray-400 group-hover:text-white transition-colors">
                          {showSensitiveInput ? (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Eye className="w-4 h-4 text-gray-400" />
                          )}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-[#E5E5E5] dark:border-[#1A1A1A]">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleDelete}
              className={classNames(
                'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                'bg-red-500 hover:bg-red-600',
                'text-white',
                'disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed',
              )}
              disabled={isSubmitting}
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !selectedProvider || credentials.some((cred) => !String(cred.value).trim())}
                className={classNames(
                  'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  'bg-accent-500 hover:bg-accent-600',
                  'text-gray-950 dark:text-gray-950',
                  'disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed',
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Update</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
