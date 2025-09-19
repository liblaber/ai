import { classNames } from '~/utils/classNames';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, XCircle } from 'lucide-react';
import { BaseSelect } from '~/components/ui/Select';
import { DeploymentMethodCredentialsType } from '@prisma/client';
import { type CredentialField, type DeploymentProviderInfo } from '~/lib/validation/deploymentMethods';
import {
  type DeploymentMethodResponse,
  type EnvironmentOption,
  type EnvironmentsResponse,
} from '~/types/deployment-methods';
import { useDeploymentMethodActions, useDeploymentMethodsStore } from '~/lib/stores/deploymentMethods';

interface AddDeploymentMethodFormProps {
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
  onSuccess: (responseData?: any) => void;
}

export default function AddDeploymentMethodForm({
  isSubmitting,
  setIsSubmitting,
  onSuccess,
}: AddDeploymentMethodFormProps) {
  const [name, setName] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<DeploymentProviderInfo | null>(null);
  const [selectedEnvironment, setSelectedEnvironment] = useState<EnvironmentOption | null>(null);
  const [environmentOptions, setEnvironmentOptions] = useState<EnvironmentOption[]>([]);
  const [isLoadingEnvironments, setIsLoadingEnvironments] = useState(true);
  const [credentials, setCredentials] = useState<CredentialField[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [applyToAllEnvironments, setApplyToAllEnvironments] = useState(false);

  // Use providers from store
  const { providers } = useDeploymentMethodsStore();
  const { loadProviders } = useDeploymentMethodActions();

  // Fetch environments and providers on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch environments
        const envResponse = await fetch('/api/environments');
        const envResult: EnvironmentsResponse = await envResponse.json();

        if (envResult.success) {
          const options: EnvironmentOption[] = envResult.environments.map((env) => ({
            label: env.name,
            value: env.id,
            description: env.description,
          }));
          setEnvironmentOptions(options);

          // Auto-select first environment if available
          if (options.length > 0) {
            setSelectedEnvironment(options[0]);
          }
        } else {
          setError(envResult.error || 'Failed to fetch environments');
        }

        // Load providers from store
        await loadProviders();
      } catch (error) {
        setError('Failed to fetch data');
        console.error('Error fetching data:', error);
      } finally {
        setIsLoadingEnvironments(false);
      }
    };

    fetchData();
  }, []);

  // Auto-select provider when providers are loaded
  useEffect(() => {
    if (providers.length > 0 && !selectedProvider) {
      // Auto-select provider if only one is available
      if (providers.length === 1) {
        setSelectedProvider(providers[0]);
      }
    }
  }, [providers, selectedProvider]);

  // Update credentials when provider changes
  useEffect(() => {
    if (selectedProvider) {
      const newCredentials: CredentialField[] = selectedProvider.requiredCredentials.map((credType) => ({
        type: credType as DeploymentMethodCredentialsType,
        value: '',
      }));
      setCredentials(newCredentials);
    } else {
      setCredentials([]);
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

    if (!selectedEnvironment && !applyToAllEnvironments) {
      setError('Please select an environment');
      return;
    }

    if (!name.trim()) {
      setError('Please enter a deployment method name');
      return;
    }

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
      const response = await fetch('/api/deployment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          provider: selectedProvider.id,
          ...(applyToAllEnvironments ? {} : { environmentId: selectedEnvironment?.value }),
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
          ? `Deployment method added successfully to all environments`
          : 'Deployment method added successfully';
        toast.success(successMessage);

        // Pass the response data to the parent component
        onSuccess(data);
      } else {
        const message = data.error || 'Failed to add deployment method';
        setError(message);
        toast.error(message);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error) || 'Failed to add deployment method. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-4">
          {!applyToAllEnvironments && (
            <div className="mb-6">
              <label className="mb-3 block text-sm font-medium text-secondary">Environment</label>
              <BaseSelect
                value={selectedEnvironment}
                onChange={(value: EnvironmentOption | null) => {
                  setSelectedEnvironment(value);
                  setError(null);
                }}
                options={environmentOptions}
                placeholder={isLoadingEnvironments ? 'Loading environments...' : 'Select environment'}
                isDisabled={isLoadingEnvironments}
                width="100%"
                minWidth="100%"
                isSearchable={false}
              />
              {selectedEnvironment?.description && (
                <div className="text-gray-400 text-sm mt-2">{selectedEnvironment.description}</div>
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

                  if (e.target.checked) {
                    setSelectedEnvironment(null);
                  }

                  setError(null);
                }}
                disabled={isSubmitting}
                className="w-4 h-4 text-accent-500 bg-gray-100 border-gray-300 rounded focus:ring-accent-500 focus:ring-2"
              />
              <span className="text-sm font-medium text-secondary">Apply to all environments</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-7">
              This will create the deployment method with the same credentials across all environments
            </p>
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
                    {getCredentialDisplayName(cred.type)}
                  </label>
                  <input
                    type={cred.type === DeploymentMethodCredentialsType.SECRET_KEY ? 'password' : 'text'}
                    value={String(cred.value)}
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
                <p className="text-sm text-red-600 dark:text-red-400 overflow-auto w-[94%]">{error}</p>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-[#E5E5E5] dark:border-[#1A1A1A]">
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  (!selectedEnvironment && !applyToAllEnvironments) ||
                  !name.trim() ||
                  !selectedProvider ||
                  credentials.some((cred) => !String(cred.value).trim())
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
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Create</span>
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
