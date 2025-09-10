import { classNames } from '~/utils/classNames';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, Trash2, XCircle } from 'lucide-react';
import { BaseSelect } from '~/components/ui/Select';
import { DeploymentMethodCredentialsType } from '@prisma/client';
import { type EnvironmentDeploymentMethod } from '~/lib/stores/deploymentMethods';
import { type CredentialField, type DeploymentProviderInfo } from '~/lib/validation/deploymentMethods';

interface DeploymentMethodResponse {
  success: boolean;
  message?: string;
  error?: string;
  deploymentMethod?: {
    id: string;
  };
  environmentDeploymentMethods?: Array<{
    id: string;
    name: string;
    provider: string;
    environmentId: string;
    environment: {
      id: string;
      name: string;
      description: string | null;
    };
    credentials: Array<{
      id: string;
      type: string;
      value: string;
    }>;
    createdAt: string;
    updatedAt: string;
  }>;
}

interface EditDeploymentMethodFormProps {
  selectedDeploymentMethod: EnvironmentDeploymentMethod;
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
  onSuccess: (responseData?: any) => void;
  onDelete: (responseData?: any) => void;
}

export default function EditDeploymentMethodForm({
  selectedDeploymentMethod,
  isSubmitting,
  setIsSubmitting,
  onSuccess,
  onDelete,
}: EditDeploymentMethodFormProps) {
  const [name, setName] = useState(selectedDeploymentMethod.name);
  const [selectedProvider, setSelectedProvider] = useState<DeploymentProviderInfo | null>(null);
  const [providers, setProviders] = useState<DeploymentProviderInfo[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [credentials, setCredentials] = useState<CredentialField[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch providers on component mount
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const providersResponse = await fetch('/api/deployment-methods/providers');
        // TODO: types
        const providersResult = await providersResponse.json<any>();

        if (providersResult) {
          setProviders(providersResult);

          // Find and set the current provider
          const currentProvider = providersResult.find(
            (p: DeploymentProviderInfo) => p.id === selectedDeploymentMethod.provider,
          );

          if (currentProvider) {
            setSelectedProvider(currentProvider);
          } else if (providersResult.length === 1) {
            // If current provider is not available but only one provider is available, use that one
            setSelectedProvider(providersResult[0]);
          }
        } else {
          setError('Failed to fetch providers');
        }
      } catch (error) {
        setError('Failed to fetch providers');
        console.error('Error fetching providers:', error);
      } finally {
        setIsLoadingProviders(false);
      }
    };

    fetchProviders();
  }, [selectedDeploymentMethod.provider]);

  // Initialize credentials from selected deployment method
  useEffect(() => {
    if (selectedDeploymentMethod.credentials) {
      const initialCredentials: CredentialField[] = selectedDeploymentMethod.credentials.map((cred) => ({
        type: cred.type as DeploymentMethodCredentialsType,
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
          type: credType as DeploymentMethodCredentialsType,
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
      case DeploymentMethodCredentialsType.API_KEY:
        return 'API Key';
      case DeploymentMethodCredentialsType.ACCESS_KEY:
        return 'Access Key';
      case DeploymentMethodCredentialsType.SECRET_KEY:
        return 'Secret Key';
      case DeploymentMethodCredentialsType.REGION:
        return 'Region';
      default:
        return type;
    }
  };

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please enter a deployment method name');
      return;
    }

    if (!selectedProvider) {
      setError('Please select a provider');
      return;
    }

    // Check if all required credentials are filled
    const missingCredentials = credentials.filter((cred) => !cred.value.trim());

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
          name: name.trim(),
          provider: selectedProvider.id,
          credentials: credentials.map((cred) => ({
            type: cred.type,
            value: cred.value.trim(),
          })),
        }),
      });

      const data = await response.json<DeploymentMethodResponse>();

      if (data.success) {
        toast.success('Deployment method updated successfully');
        onSuccess(data);
      } else {
        const message = data.error || 'Failed to update deployment method';
        setError(message);
        toast.error(message);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error) || 'Failed to update deployment method. Please try again.';
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
        toast.success('Deployment method deleted successfully');
        onDelete(data);
      } else {
        const message = data.error || 'Failed to delete deployment method';
        setError(message);
        toast.error(message);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error) || 'Failed to delete deployment method. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-4">
          <div className="mb-6">
            <label className="mb-3 block text-sm font-medium text-secondary">Environment</label>
            <div className="px-4 py-2.5 bg-[#F5F5F5] dark:bg-gray-700 border border-[#E5E5E5] dark:border-[#1A1A1A] rounded-lg text-primary">
              {selectedDeploymentMethod.environment.name}
            </div>
            {selectedDeploymentMethod.environment.description && (
              <div className="text-gray-400 text-sm mt-2">{selectedDeploymentMethod.environment.description}</div>
            )}
          </div>

          <div className="mb-6">
            <label className="mb-3 block text-sm font-medium text-secondary">Deployment Method Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              className={classNames(
                'w-full px-4 py-2.5 bg-[#F5F5F5] dark:bg-gray-700 border rounded-lg',
                'text-primary placeholder-tertiary text-base',
                'border-[#E5E5E5] dark:border-[#1A1A1A] rounded-lg',
                'focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500',
                'transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
              placeholder="Enter deployment method name"
            />
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
              placeholder={isLoadingProviders ? 'Loading providers...' : 'Select provider'}
              isDisabled={isLoadingProviders || providers.length === 1}
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
                    {getCredentialDisplayName(cred.type)}
                  </label>
                  <input
                    type={cred.type === DeploymentMethodCredentialsType.SECRET_KEY ? 'password' : 'text'}
                    value={cred.value}
                    onChange={(e) => handleCredentialChange(index, e.target.value)}
                    disabled={isSubmitting}
                    className={classNames(
                      'w-full px-4 py-2.5 bg-[#F5F5F5] dark:bg-gray-700 border rounded-lg',
                      'text-primary placeholder-tertiary text-base',
                      'border-[#E5E5E5] dark:border-[#1A1A1A] rounded-lg',
                      'focus:ring-2 focus:ring-accent-500/50 focus:border-accent-500',
                      'transition-all duration-200',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                    placeholder={`Enter ${getCredentialDisplayName(cred.type).toLowerCase()}`}
                  />
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
                disabled={
                  isSubmitting || !name.trim() || !selectedProvider || credentials.some((cred) => !cred.value.trim())
                }
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
