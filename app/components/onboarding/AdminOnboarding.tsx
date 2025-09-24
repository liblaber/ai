'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { Label } from '~/components/ui/Label';
import { Card } from '~/components/ui/Card';
import { Checkbox } from '~/components/ui/Checkbox';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { CheckCircle, ArrowRight, ArrowLeft, Info, Shield, Eye, EyeOff, Lock } from 'lucide-react';
import { onboardingApi, clearOnboardingStatusCache } from '~/lib/api/onboarding';
import { signIn, useSession } from '~/auth/auth-client';
// Remove server-side env import - we'll pass env vars as props
import type {
  AuthMethod,
  OnboardingRequest,
  AuthStepRequest,
  AuthConfigStepRequest,
  // LlmConfig,
  // DatasourceConfig,
  // UsersConfig,
} from '~/types/onboarding';

interface AdminOnboardingProps {
  onComplete: () => void;
  envVars?: {
    // Non-sensitive configuration
    defaultLlmProvider?: string;
    defaultLlmModel?: string;
    ollamaApiBaseUrl?: string;
    disableTelemetry?: boolean;

    // Existence flags only
    hasGoogleOAuth?: boolean;
    hasOidcSso?: boolean;
    hasOidcDomain?: boolean;

    // API Key existence flags
    hasAnthropicApiKey?: boolean;
    hasOpenaiApiKey?: boolean;
    hasGoogleGenerativeAiApiKey?: boolean;
    hasOpenRouterApiKey?: boolean;
    hasGroqApiKey?: boolean;
    hasMistralApiKey?: boolean;
    hasCohereApiKey?: boolean;
    hasPerplexityApiKey?: boolean;
    hasTogetherApiKey?: boolean;
    hasDeepseekApiKey?: boolean;
    hasXaiApiKey?: boolean;
    hasGithubApiKey?: boolean;
    hasHyperbolicApiKey?: boolean;
    hasHuggingfaceApiKey?: boolean;
    hasOpenaiLikeApiKey?: boolean;
  };
}

type OnboardingStep = 'welcome' | 'auth' | 'auth-config' | 'llm' | 'datasource' | 'users' | 'complete';

interface AuthMethodOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  recommended?: boolean;
}

const authMethods: AuthMethodOption[] = [
  {
    id: 'google',
    name: 'Google OAuth',
    description: 'Sign in with Google accounts',
    icon: (
      <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-white text-sm font-bold">G</div>
    ),
    recommended: true,
  },
  {
    id: 'sso',
    name: 'Third-Party SSO',
    description: 'Configure your own SSO provider',
    icon: <Shield className="w-6 h-6 text-blue-400" />,
  },
  {
    id: 'password',
    name: 'Username & Password',
    description: 'Traditional email and password login',
    icon: <Lock className="w-6 h-6 text-green-400" />,
  },
];

export function AdminOnboarding({ onComplete, envVars }: AdminOnboardingProps) {
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [selectedAuthMethod, setSelectedAuthMethod] = useState<AuthMethod | ''>('');
  const [adminData, setAdminData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [ssoConfig, setSsoConfig] = useState({
    hostUrl: '',
    clientId: '',
    clientSecret: '',
    scopes: 'openid email profile',
  });
  const [googleConfig, setGoogleConfig] = useState({
    clientId: '',
    clientSecret: '',
  });
  const [isValidatingCredentials, setIsValidatingCredentials] = useState(false);
  const [credentialsValid, setCredentialsValid] = useState<boolean | null>(null);
  const [credentialsValidationMessage, setCredentialsValidationMessage] = useState<string>('');
  const [configSource, setConfigSource] = useState<'environment' | 'onboarding' | 'none' | null>(null);
  // Hidden step state - keeping for future use
  // const [llmConfig, setLlmConfig] = useState<LlmConfig>({
  //   model: '',
  //   apiKey: '',
  //   baseUrl: '',
  // });
  // const [datasourceConfig, setDatasourceConfig] = useState<DatasourceConfig>({
  //   name: '',
  //   type: 'SQLITE',
  //   connectionString: '',
  //   properties: {},
  // });
  // const [usersConfig, setUsersConfig] = useState<UsersConfig>({
  //   invitations: [],
  // });
  // const [newInvitation, setNewInvitation] = useState({ email: '', role: 'MEMBER' });
  const [telemetryConsent, setTelemetryConsent] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSigningInWithGoogle, setIsSigningInWithGoogle] = useState(false);
  const [googleUser, setGoogleUser] = useState<{ name: string; email: string; picture?: string } | null>(null);
  const [showSignInSuccess, setShowSignInSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(0);
  const [isApplicationSetUp, setIsApplicationSetUp] = useState(false);
  const [prefilledFields, setPrefilledFields] = useState<Set<string>>(new Set());

  // Monitor Better Auth session for Google OAuth
  const { data: session, isPending, refetch } = useSession();

  // Debug session changes
  React.useEffect(() => {
    console.log('Session changed:', { session, isPending });
  }, [session, isPending]);

  // Check if application is already set up
  useEffect(() => {
    const checkApplicationStatus = async () => {
      try {
        const status = await onboardingApi.checkStatus();
        setIsApplicationSetUp(status.isSetUp);
      } catch (error) {
        console.error('Error checking application status:', error);
      }
    };

    checkApplicationStatus();
  }, []);

  // Prefill form with environment variables
  useEffect(() => {
    if (!envVars) {
      return;
    }

    const prefillFromEnv = () => {
      const newPrefilledFields = new Set<string>();

      // Hidden step prefill logic - keeping for future use
      // if (envVars.defaultLlmProvider && envVars.defaultLlmModel) {
      //   setLlmConfig((prev) => ({
      //     ...prev,
      //     model: `${envVars.defaultLlmProvider}:${envVars.defaultLlmModel}`,
      //     baseUrl: envVars.defaultLlmProvider === 'Ollama' ? envVars.ollamaApiBaseUrl || '' : '',
      //   }));
      //   newPrefilledFields.add('llm-model');
      //   if (envVars.defaultLlmProvider === 'Ollama') {
      //     newPrefilledFields.add('llm-baseUrl');
      //   }
      // }

      // Prefill Google OAuth configuration (only selection, not credentials)
      if (envVars.hasGoogleOAuth) {
        setSelectedAuthMethod('google');
        newPrefilledFields.add('auth-method');
      }

      // Prefill SSO configuration (only selection, not credentials)
      if (envVars.hasOidcSso) {
        setSelectedAuthMethod('sso');
        newPrefilledFields.add('auth-method');
      }

      // Prefill admin email if OIDC domain is available
      if (envVars.hasOidcDomain) {
        // We can't show the actual domain, but we can indicate it's configured
        setAdminData((prev) => ({
          ...prev,
          email: 'admin@yourdomain.com', // Placeholder
        }));
        newPrefilledFields.add('admin-email');
      }

      // Prefill telemetry consent based on environment
      if (envVars.disableTelemetry) {
        setTelemetryConsent(false);
        newPrefilledFields.add('telemetry-consent');
      }

      setPrefilledFields(newPrefilledFields);
    };

    prefillFromEnv();
  }, [envVars]);

  // Handle URL parameters to restore onboarding state
  useEffect(() => {
    const step = searchParams.get('step') as OnboardingStep;
    const authMethod = searchParams.get('authMethod') as AuthMethod;
    const signedIn = searchParams.get('signedIn') === 'true';

    if (step && ['auth', 'auth-config', 'complete'].includes(step)) {
      setCurrentStep(step);
    }

    if (authMethod && ['google', 'sso', 'password'].includes(authMethod)) {
      setSelectedAuthMethod(authMethod);
    }

    // If user just signed in, show success message
    if (signedIn && session?.user) {
      setGoogleUser({
        name: session.user.name || '',
        email: session.user.email || '',
        picture: session.user.image || undefined,
      });
      setShowSignInSuccess(true);

      // Clear the URL parameters after processing
      const url = new URL(window.location.href);
      url.searchParams.delete('signedIn');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams, session]);

  // Update Google user when session changes (user signs in)
  React.useEffect(() => {
    console.log('Session effect triggered:', { session, selectedAuthMethod });

    if (session?.user && selectedAuthMethod === 'google') {
      console.log('Setting Google user:', session.user);
      setGoogleUser({
        name: session.user.name || '',
        email: session.user.email || '',
        picture: session.user.image || undefined,
      });
    }
  }, [session, selectedAuthMethod]);

  // Check Google OAuth configuration status when auth method changes
  React.useEffect(() => {
    if (selectedAuthMethod === 'google') {
      checkConfigStatus();
    }
  }, [selectedAuthMethod]);

  // Handle Google user data from URL parameters (after OAuth callback)
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const googleUserParam = urlParams.get('googleUser');

    if (googleUserParam && selectedAuthMethod === 'google') {
      try {
        const googleUserData = JSON.parse(googleUserParam);
        setGoogleUser(googleUserData);

        // Clear the URL parameter
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('googleUser');
        window.history.replaceState({}, '', newUrl.toString());
      } catch (error) {
        console.error('Failed to parse Google user data:', error);
      }
    }
  }, [selectedAuthMethod]);

  const steps = [
    { id: 'auth', title: 'Setup Authorization', description: 'Choose authentication method' },
    { id: 'auth-config', title: 'Configure Auth', description: 'Set up authentication' },
    // Hidden steps - keeping for future use
    // { id: 'llm', title: 'Connect an LLM', description: 'Configure your AI model' },
    // { id: 'datasource', title: 'Add Data Source', description: 'Connect your database' },
    // { id: 'users', title: 'Add Users (Optional)', description: 'Invite team members' },
  ];

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

  const handleNext = async () => {
    setError(null); // Clear any existing errors
    setIsLoading(true);

    try {
      if (currentStep === 'welcome') {
        setCurrentStep('auth');
      } else if (currentStep === 'auth') {
        if (!selectedAuthMethod) {
          setError('Please select an authentication method');
          return;
        }

        // Save auth step progress
        const authRequest: AuthStepRequest = {
          authMethod: selectedAuthMethod,
        };

        const response = await onboardingApi.saveAuthStep(authRequest);

        if (!response.success) {
          throw new Error(response.error);
        }

        setCurrentStep('auth-config');
      } else if (currentStep === 'auth-config') {
        // Validate required fields (not needed for Google OAuth as user info comes from OAuth)
        if (selectedAuthMethod !== 'google') {
          if (!adminData.name.trim()) {
            setError('Name is required');
            return;
          }

          if (!adminData.email.trim()) {
            setError('Email is required');
            return;
          }
        }

        // Validate Google OAuth
        if (selectedAuthMethod === 'google') {
          // If not configured via environment variables, require manual configuration
          if (configSource !== 'environment') {
            if (!googleConfig.clientId.trim() || !googleConfig.clientSecret.trim()) {
              setError('Google Client ID and Client Secret are required');
              return;
            }

            if (credentialsValid !== true) {
              setError('Please validate your Google OAuth credentials before proceeding');
              return;
            }
          }

          if (!googleUser) {
            setError('Please sign in with Google to select your admin account');
            return;
          }
        }

        // Validate SSO config if using SSO
        if (selectedAuthMethod === 'sso') {
          if (!ssoConfig.hostUrl.trim() || !ssoConfig.clientId.trim() || !ssoConfig.clientSecret.trim()) {
            setError('SSO configuration is incomplete. Please fill in all required fields.');
            return;
          }
        }

        // Validate password if using password auth
        if (selectedAuthMethod === 'password') {
          if (!adminData.password || !adminData.confirmPassword) {
            setError('Password and confirmation are required for password authentication.');
            return;
          }

          if (adminData.password !== adminData.confirmPassword) {
            setError('Passwords do not match.');
            return;
          }

          if (adminData.password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
          }
        }

        // Save auth-config step progress
        const authConfigRequest: AuthConfigStepRequest = {
          adminData:
            selectedAuthMethod === 'google' && googleUser
              ? {
                  name: googleUser.name,
                  email: googleUser.email,
                }
              : {
                  name: adminData.name.trim(),
                  email: adminData.email.trim(),
                  password: adminData.password || undefined,
                  confirmPassword: adminData.confirmPassword || undefined,
                },
          ssoConfig: selectedAuthMethod === 'sso' ? ssoConfig : undefined,
          googleOAuthConfig:
            selectedAuthMethod === 'google' && configSource !== 'environment' ? googleConfig : undefined,
        };

        const response = await onboardingApi.saveAuthConfigStep(authConfigRequest);

        if (!response.success) {
          throw new Error(response.error);
        }

        // Skip to completion after auth-config (other steps are hidden)
        // Clear the cache and check if the application is now set up
        clearOnboardingStatusCache();

        const status = await onboardingApi.checkStatus();
        setIsApplicationSetUp(status.isSetUp);

        // Refresh the session to get the latest user data
        await refetch();

        console.log('About to call handleCompleteSetup, current state:', {
          isApplicationSetUp: status.isSetUp,
          selectedAuthMethod,
          configSource,
          googleUser,
          session: session?.user,
        });

        await handleCompleteSetup();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setError(null); // Clear any existing errors

    if (currentStep === 'auth') {
      setCurrentStep('welcome');
    } else if (currentStep === 'auth-config') {
      setCurrentStep('auth');
    }
    // Hidden steps removed from navigation
  };

  const checkConfigStatus = async () => {
    try {
      const response = await fetch('/api/auth/google-config-status');
      const data = (await response.json()) as {
        success: boolean;
        config: { source: 'environment' | 'onboarding' | 'none' };
        isAvailable: boolean;
        credentials?: { clientId: string; clientSecret: string };
      };

      if (data.success) {
        setConfigSource(data.config.source);

        // If Google OAuth is already configured (either from environment or onboarding),
        // we can skip the credential input and validation
        if (data.isAvailable) {
          setCredentialsValid(true);

          // If credentials are available, populate the form state
          if (data.credentials) {
            setGoogleConfig({
              clientId: data.credentials.clientId,
              clientSecret: data.credentials.clientSecret,
            });
          }

          if (data.config.source === 'environment') {
            setCredentialsValidationMessage('Google OAuth is already configured via environment variables');
          } else if (data.config.source === 'onboarding') {
            setCredentialsValidationMessage('Google OAuth is configured and ready to use');
          }
        } else {
          // Reset state when Google OAuth is not available
          setCredentialsValid(null);
          setCredentialsValidationMessage('');
          setGoogleConfig({
            clientId: '',
            clientSecret: '',
          });
        }
      }
    } catch (error) {
      console.error('Failed to check config status:', error);
    }
  };

  const handleValidateCredentials = async () => {
    if (!googleConfig.clientId.trim() || !googleConfig.clientSecret.trim()) {
      setError('Please enter both Client ID and Client Secret before validating');
      return;
    }

    setIsValidatingCredentials(true);
    setError(null);
    setCredentialsValid(null);
    setCredentialsValidationMessage('');

    try {
      const response = await fetch('/api/onboarding/validate-google-oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: googleConfig.clientId.trim(),
          clientSecret: googleConfig.clientSecret.trim(),
        }),
      });

      const data = (await response.json()) as { success: boolean; message?: string; error?: string };

      if (data.success) {
        setCredentialsValid(true);
        setCredentialsValidationMessage(data.message || 'Credentials are valid');

        // Save the validated credentials immediately so they're available for Google sign-in
        await saveGoogleOAuthCredentials();
      } else {
        setCredentialsValid(false);
        setCredentialsValidationMessage(data.error || 'Validation failed');
      }
    } catch {
      setCredentialsValid(false);
      setCredentialsValidationMessage('Failed to validate credentials. Please check your internet connection.');
    } finally {
      setIsValidatingCredentials(false);
    }
  };

  const saveGoogleOAuthCredentials = async () => {
    try {
      const response = await fetch('/api/onboarding/save-google-oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: googleConfig.clientId.trim(),
          clientSecret: googleConfig.clientSecret.trim(),
        }),
      });

      const data = (await response.json()) as { success: boolean; error?: string };

      if (!data.success) {
        console.error('Failed to save Google OAuth credentials:', data.error);
        setError('Failed to save Google OAuth credentials. Please try again.');
      } else {
        // Show a message that the application needs to be restarted
        setCredentialsValidationMessage(
          'Credentials saved! Please restart the development server for Google OAuth to be available.',
        );
      }
    } catch (error) {
      console.error('Error saving Google OAuth credentials:', error);
      setError('Failed to save Google OAuth credentials. Please try again.');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSigningInWithGoogle(true);
    setError(null);

    try {
      // Use Better Auth's built-in Google OAuth
      const callbackURL = `/onboarding/callback?step=${currentStep}&authMethod=${selectedAuthMethod}`;

      // Use Better Auth's social provider
      await signIn.social({
        provider: 'google',
        callbackURL, // Redirect to our special callback that preserves state
        newUserCallbackURL: callbackURL, // Ensure new users also preserve state
      });
    } catch (error) {
      setError(`Google sign-in failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsSigningInWithGoogle(false);
    }
  };

  const handleCompleteSetup = async () => {
    console.log('handleCompleteSetup called with state:', {
      selectedAuthMethod,
      configSource,
      googleUser,
      credentialsValid,
      session: session?.user,
    });

    setIsLoading(true);
    setError(null);

    try {
      // If application is already set up, just redirect to main page
      if (isApplicationSetUp) {
        onComplete();
        return;
      }

      if (!selectedAuthMethod) {
        throw new Error('No authentication method selected');
      }

      // Additional validation (not needed for Google OAuth as user info comes from OAuth)
      if (selectedAuthMethod !== 'google') {
        if (!adminData.name.trim()) {
          throw new Error('Name is required');
        }

        if (!adminData.email.trim()) {
          throw new Error('Email is required');
        }
      }

      // Validate Google OAuth
      if (selectedAuthMethod === 'google') {
        console.log('Validating Google OAuth:', { configSource, googleUser, credentialsValid });

        // If not configured via environment variables, require manual configuration
        if (configSource === 'none') {
          if (!googleConfig.clientId.trim() || !googleConfig.clientSecret.trim()) {
            throw new Error('Google Client ID and Client Secret are required');
          }

          if (credentialsValid !== true) {
            throw new Error('Please validate your Google OAuth credentials before proceeding');
          }
        }

        if (!googleUser) {
          console.log('Google user validation failed:', { googleUser, session: session?.user });
          throw new Error('Please sign in with Google to select your admin account');
        }
      }

      // Validate SSO config if using SSO
      if (selectedAuthMethod === 'sso') {
        if (!ssoConfig.hostUrl.trim() || !ssoConfig.clientId.trim() || !ssoConfig.clientSecret.trim()) {
          throw new Error('SSO configuration is incomplete. Please fill in all required fields.');
        }
      }

      // Validate password if using password auth
      if (selectedAuthMethod === 'password') {
        if (!adminData.password || !adminData.confirmPassword) {
          throw new Error('Password and confirmation are required for password authentication.');
        }

        if (adminData.password !== adminData.confirmPassword) {
          throw new Error('Passwords do not match.');
        }

        if (adminData.password.length < 8) {
          throw new Error('Password must be at least 8 characters long.');
        }
      }

      const request: OnboardingRequest = {
        authMethod: selectedAuthMethod,
        adminData:
          selectedAuthMethod === 'google' && googleUser
            ? {
                name: googleUser.name,
                email: googleUser.email,
              }
            : {
                name: adminData.name.trim(),
                email: adminData.email.trim(),
                password: adminData.password || undefined,
                confirmPassword: adminData.confirmPassword || undefined,
              },
        ssoConfig: selectedAuthMethod === 'sso' ? ssoConfig : undefined,
        googleOAuthConfig: selectedAuthMethod === 'google' && configSource !== 'environment' ? googleConfig : undefined,
        telemetryConsent,
      };

      console.log('Sending onboarding request:', request);

      const response = await onboardingApi.completeOnboarding(request);

      if (!response.success) {
        throw new Error(response.error);
      }

      setCurrentStep('complete');

      // Show countdown and automatically redirect to main page after successful completion
      setRedirectCountdown(3);

      const countdownInterval = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            onComplete();

            return 0;
          }

          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = () => {
    onComplete();
  };

  // Helper component to show prefilled indicator
  const PrefilledIndicator = ({ fieldId }: { fieldId: string }) => {
    if (!prefilledFields.has(fieldId)) {
      return null;
    }

    return (
      <div className="flex items-center gap-1 text-xs text-[#3BCEFF] mt-1">
        <Info className="w-3 h-3" />
        <span>Prefilled from environment</span>
      </div>
    );
  };

  const renderWelcomeStep = () => (
    <div className="relative w-full max-w-[626px] mx-auto">
      {/* Main Content Container */}
      <div className="flex flex-col items-center justify-center gap-8">
        {/* Welcome Title */}
        <h1 className="w-full text-center text-[64px] leading-[70px] font-normal text-[#F7F7F8]">
          Welcome to Liblab AI
        </h1>

        {/* Description */}
        <p className="w-full max-w-[566px] text-center text-base leading-6 text-[#F7F7F8]">
          This short 2-step onboarding will help you set up authentication for your organization.
        </p>

        {/* Action Container */}
        <div className="flex flex-col items-center gap-7 w-full">
          {/* Get Started Button */}
          <Button
            onClick={handleNext}
            className="flex flex-row justify-center items-center px-3 py-2 gap-1 w-[111px] h-9 bg-[#3BCEFF] rounded-lg hover:bg-[#3BCEFF]/90 transition-colors"
          >
            <span className="text-[#08090A] text-sm font-medium leading-5">Get Started</span>
          </Button>

          {/* Telemetry Consent */}
          <div className="flex flex-row items-center gap-4 w-full max-w-[414px] h-10">
            <Checkbox
              id="telemetry"
              checked={telemetryConsent}
              onCheckedChange={(checked: boolean) => setTelemetryConsent(checked)}
              className="w-5 h-5 bg-[#F7F7F8] rounded border-0"
            />
            <label htmlFor="telemetry" className="flex-1 text-sm leading-5 text-[#C6C9D1]">
              I agree to share anonymous app usage data to help improve features and performance.
            </label>
            <Info className="w-4 h-6 text-[#C6C9D1]" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderAuthConfigStep = () => (
    <div className="relative w-full max-w-[626px] mx-auto">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-[#F7F7F8]">
            {selectedAuthMethod === 'google' && 'Set up Google OAuth'}
            {selectedAuthMethod === 'sso' && 'Set up SSO'}
            {selectedAuthMethod === 'password' && 'Set up Password Authentication'}
          </h2>
          <p className="text-[#C6C9D1] text-sm">
            {selectedAuthMethod === 'google' && 'Enter Google OAuth ID and secret found in your Google Console.'}
            {selectedAuthMethod === 'sso' && 'Configure your SSO provider settings.'}
            {selectedAuthMethod === 'password' && 'Set up username and password authentication.'}
          </p>
        </div>

        {/* Configuration Form */}
        <Card className="p-6 space-y-4 bg-[#1A1D29] border-[#2A2D3A]">
          {selectedAuthMethod === 'google' && (
            <>
              <div>
                <Label htmlFor="authType" className="text-sm text-[#C6C9D1] mb-2 block">
                  Authorization Type
                </Label>
                <div className="relative">
                  <Input
                    id="authType"
                    value="Google"
                    readOnly
                    className="bg-[#0A0D1A] border-[#2A2D3A] text-[#F7F7F8] focus:border-[#3BCEFF] pr-8"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C6C9D1]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Google OAuth Configuration */}
              <div className="space-y-4">
                <div className="bg-[#1A1D29] border border-[#2A2D3A] rounded-md p-3">
                  <div className="text-[#C6C9D1] text-sm">
                    <p className="font-medium mb-2">Google OAuth Configuration</p>
                    {configSource === 'environment' ? (
                      <div className="space-y-2">
                        <p className="text-green-400">
                          ✅ Google OAuth is already configured via environment variables
                        </p>
                        <p className="text-xs">You can proceed directly to sign in with Google.</p>
                      </div>
                    ) : configSource === 'onboarding' ? (
                      <div className="space-y-2">
                        <p className="text-green-400">✅ Google OAuth is configured and ready to use</p>
                        <p className="text-xs">You can sign in with Google below.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="mb-2">Enter your Google OAuth credentials from the Google Cloud Console.</p>
                        <p className="text-xs">
                          You can find these in your Google Cloud Console under APIs &amp; Services &gt; Credentials.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {configSource === 'none' && (
                  <div className="space-y-4">
                    {/* Redirect URI Instructions */}
                    <div className="bg-blue-500/10 border border-blue-500 text-blue-400 p-3 rounded-md">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        <span className="text-sm font-medium">Important: Configure Redirect URI</span>
                      </div>
                      <p className="text-sm mt-1">Add this redirect URI to your Google Cloud Console:</p>
                      <code className="block mt-2 p-2 bg-[#0A0D1A] border border-[#2A2D3A] rounded text-xs text-[#F7F7F8] break-all">
                        {typeof window !== 'undefined'
                          ? `${window.location.origin}/api/auth/callback/google`
                          : 'https://your-domain.com/api/auth/callback/google'}
                      </code>
                      <p className="text-xs mt-2">
                        Go to Google Cloud Console → APIs & Services → Credentials → Your OAuth Client → Authorized
                        redirect URIs
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label htmlFor="googleClientId" className="text-sm text-[#C6C9D1] mb-2 block">
                          Google Client ID
                        </Label>
                        <Input
                          id="googleClientId"
                          value={googleConfig.clientId}
                          onChange={(e) => {
                            setGoogleConfig((prev) => ({ ...prev, clientId: e.target.value }));
                            // Reset validation when user changes credentials
                            setCredentialsValid(null);
                            setCredentialsValidationMessage('');
                          }}
                          placeholder="your-google-client-id.apps.googleusercontent.com"
                          className="bg-[#0A0D1A] border-[#2A2D3A] text-[#F7F7F8] focus:border-[#3BCEFF]"
                        />
                      </div>
                      <div>
                        <Label htmlFor="googleClientSecret" className="text-sm text-[#C6C9D1] mb-2 block">
                          Google Client Secret
                        </Label>
                        <div className="relative">
                          <Input
                            id="googleClientSecret"
                            type={showPassword ? 'text' : 'password'}
                            value={googleConfig.clientSecret}
                            onChange={(e) => {
                              setGoogleConfig((prev) => ({ ...prev, clientSecret: e.target.value }));
                              // Reset validation when user changes credentials
                              setCredentialsValid(null);
                              setCredentialsValidationMessage('');
                            }}
                            placeholder="your-google-client-secret"
                            className="bg-[#0A0D1A] border-[#2A2D3A] text-[#F7F7F8] focus:border-[#3BCEFF] pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C6C9D1] hover:text-[#F7F7F8]"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Credential Validation */}
                {configSource === 'none' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        onClick={handleValidateCredentials}
                        disabled={
                          isValidatingCredentials || !googleConfig.clientId.trim() || !googleConfig.clientSecret.trim()
                        }
                        className="bg-[#10B981] hover:bg-[#10B981]/80 text-white font-medium px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isValidatingCredentials ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Validating...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Validate Credentials
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Validation Result */}
                {credentialsValidationMessage && configSource === 'none' && (
                  <div
                    className={`p-3 rounded-md border ${
                      credentialsValid === true
                        ? 'bg-green-500/10 border-green-500 text-green-400'
                        : credentialsValid === false
                          ? 'bg-red-500/10 border-red-500 text-red-400'
                          : 'bg-yellow-500/10 border-yellow-500 text-yellow-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {credentialsValid === true && <CheckCircle className="w-4 h-4" />}
                      {credentialsValid === false && <Info className="w-4 h-4" />}
                      {credentialsValid === null && <Info className="w-4 h-4" />}
                      <span className="text-sm font-medium">
                        {credentialsValid === true ? 'Valid' : credentialsValid === false ? 'Invalid' : 'Validation'}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{credentialsValidationMessage}</p>
                  </div>
                )}
              </div>

              {/* Google Sign-In Section */}
              <div className="space-y-4">
                <div className="bg-[#1A1D29] border border-[#2A2D3A] rounded-md p-3">
                  <div className="text-[#C6C9D1] text-sm">
                    <p className="font-medium mb-2">Test Google Sign-In</p>
                    {configSource === 'environment' || configSource === 'onboarding' ? (
                      <p className="mb-2">
                        Click the button below to sign in with Google and create your admin account.
                      </p>
                    ) : (
                      <p className="mb-2">
                        First validate your credentials above, then click the button below to test the Google sign-in.
                      </p>
                    )}
                    <p className="text-xs">
                      This will create your admin account using the Google account you sign in with.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={
                      isSigningInWithGoogle ||
                      isPending ||
                      configSource === 'none' || // Only disable if no configuration is available
                      (configSource === 'onboarding' && credentialsValid !== true) // For onboarding, require validation
                    }
                    className="bg-[#4285F4] hover:bg-[#4285F4]/80 text-white font-medium px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSigningInWithGoogle || isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {isSigningInWithGoogle ? 'Signing in...' : 'Loading...'}
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Sign in with Google
                      </>
                    )}
                  </Button>
                </div>

                {/* User Info Display */}
                {googleUser && (
                  <div className="bg-[#0A0D1A] border border-[#2A2D3A] rounded-md p-3">
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">Admin User Selected</span>
                    </div>
                    <div className="mt-2 text-[#F7F7F8]">
                      <div className="font-medium">{googleUser.name}</div>
                      <div className="text-[#C6C9D1] text-sm">{googleUser.email}</div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {selectedAuthMethod === 'sso' && (
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="adminName" className="text-sm text-[#C6C9D1] mb-2 block">
                  Full Name
                </Label>
                <Input
                  id="adminName"
                  value={adminData.name}
                  onChange={(e) => setAdminData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="John Doe"
                  className="bg-[#0A0D1A] border-[#2A2D3A] text-[#F7F7F8] focus:border-[#3BCEFF]"
                />
              </div>
              <div>
                <Label htmlFor="adminEmail" className="text-sm text-[#C6C9D1] mb-2 block">
                  Email Address
                </Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={adminData.email}
                  onChange={(e) => setAdminData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="john@company.com"
                  className="bg-[#0A0D1A] border-[#2A2D3A] text-[#F7F7F8] focus:border-[#3BCEFF]"
                />
              </div>
              <div>
                <Label htmlFor="hostUrl" className="text-sm text-[#C6C9D1] mb-2 block">
                  Host URL
                </Label>
                <Input
                  id="hostUrl"
                  value={ssoConfig.hostUrl}
                  onChange={(e) => setSsoConfig((prev) => ({ ...prev, hostUrl: e.target.value }))}
                  placeholder="https://your-provider.com"
                  className="bg-[#0A0D1A] border-[#2A2D3A] text-[#F7F7F8] focus:border-[#3BCEFF]"
                />
              </div>
              <div>
                <Label htmlFor="clientId" className="text-sm text-[#C6C9D1] mb-2 block">
                  Client ID
                </Label>
                <Input
                  id="clientId"
                  value={ssoConfig.clientId}
                  onChange={(e) => setSsoConfig((prev) => ({ ...prev, clientId: e.target.value }))}
                  placeholder="your-client-id"
                  className="bg-[#0A0D1A] border-[#2A2D3A] text-[#F7F7F8] focus:border-[#3BCEFF]"
                />
              </div>
              <div>
                <Label htmlFor="clientSecret" className="text-sm text-[#C6C9D1] mb-2 block">
                  Client Secret
                </Label>
                <div className="relative">
                  <Input
                    id="clientSecret"
                    type={showPassword ? 'text' : 'password'}
                    value={ssoConfig.clientSecret}
                    onChange={(e) => setSsoConfig((prev) => ({ ...prev, clientSecret: e.target.value }))}
                    placeholder="your-client-secret"
                    className="bg-[#0A0D1A] border-[#2A2D3A] text-[#F7F7F8] focus:border-[#3BCEFF] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C6C9D1] hover:text-[#F7F7F8]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="scopes" className="text-sm text-[#C6C9D1] mb-2 block">
                  Scopes
                </Label>
                <Input
                  id="scopes"
                  value={ssoConfig.scopes}
                  onChange={(e) => setSsoConfig((prev) => ({ ...prev, scopes: e.target.value }))}
                  placeholder="openid email profile"
                  className="bg-[#0A0D1A] border-[#2A2D3A] text-[#F7F7F8] focus:border-[#3BCEFF]"
                />
                <p className="text-xs text-[#6A6D7A] mt-1">Separated with a space</p>
              </div>
            </div>
          )}

          {selectedAuthMethod === 'password' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="adminName" className="text-sm text-[#C6C9D1] mb-2 block">
                  Full Name
                </Label>
                <Input
                  id="adminName"
                  value={adminData.name}
                  onChange={(e) => setAdminData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="John Doe"
                  className="bg-[#0A0D1A] border-[#2A2D3A] text-[#F7F7F8] focus:border-[#3BCEFF]"
                />
              </div>
              <div>
                <Label htmlFor="adminEmail" className="text-sm text-[#C6C9D1] mb-2 block">
                  Email Address
                </Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={adminData.email}
                  onChange={(e) => setAdminData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="john@company.com"
                  className="bg-[#0A0D1A] border-[#2A2D3A] text-[#F7F7F8] focus:border-[#3BCEFF]"
                />
              </div>
              <div>
                <Label htmlFor="adminPassword" className="text-sm text-[#C6C9D1] mb-2 block">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="adminPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={adminData.password}
                    onChange={(e) => setAdminData((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter a secure password"
                    className="bg-[#0A0D1A] border-[#2A2D3A] text-[#F7F7F8] focus:border-[#3BCEFF] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C6C9D1] hover:text-[#F7F7F8]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirmPassword" className="text-sm text-[#C6C9D1] mb-2 block">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={adminData.confirmPassword}
                    onChange={(e) => setAdminData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm your password"
                    className="bg-[#0A0D1A] border-[#2A2D3A] text-[#F7F7F8] focus:border-[#3BCEFF] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C6C9D1] hover:text-[#F7F7F8]"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );

  const renderAuthStep = () => (
    <div className="relative w-full max-w-[626px] mx-auto">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-[#F7F7F8]">Set Up Authorization Methods</h2>
          <p className="text-[#C6C9D1] text-sm">
            Choose how your users sign in. Enable secure login methods such as Google or third-party SSO to simplify
            access and protect your app.
          </p>
        </div>

        {/* Auth Methods */}
        <div className="space-y-3">
          {authMethods.map((method) => (
            <Card
              key={method.id}
              className={`p-4 cursor-pointer transition-all border-2 ${
                selectedAuthMethod === method.id
                  ? 'border-[#3BCEFF] bg-[#3BCEFF]/10'
                  : 'border-[#2A2D3A] hover:border-[#3A3D4A] bg-[#1A1D29]'
              }`}
              onClick={() => setSelectedAuthMethod(method.id as AuthMethod)}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    selectedAuthMethod === method.id ? 'border-[#3BCEFF] bg-[#3BCEFF]' : 'border-[#4A4D5A]'
                  }`}
                >
                  {selectedAuthMethod === method.id && <div className="w-full h-full rounded-full bg-white scale-50" />}
                </div>
                {method.icon}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-[#F7F7F8]">{method.name}</h3>
                    {method.recommended && (
                      <span className="px-2 py-1 text-xs bg-[#3BCEFF]/20 text-[#3BCEFF] rounded">Recommended</span>
                    )}
                  </div>
                  <p className="text-sm text-[#C6C9D1]">{method.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Prefilled indicator for auth method */}
        <PrefilledIndicator fieldId="auth-method" />
      </div>
    </div>
  );

  // Hidden steps - keeping for future use
  // const renderLLMStep = () => { ... }
  // const renderDataSourceStep = () => { ... }
  // const renderUsersStep = () => { ... }

  const renderCompleteStep = () => (
    <div className="relative w-full max-w-[626px] mx-auto">
      <div className="flex flex-col items-center justify-center gap-8">
        {/* Success Icon */}
        <div className="w-16 h-16 bg-[#3BCEFF] rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-[#08090A]" />
        </div>

        {/* Success Message */}
        <div className="text-center space-y-4">
          <h1 className="text-[64px] leading-[70px] font-normal text-[#F7F7F8] font-['GT_Planar_Trial']">
            Setup Complete!
          </h1>
          <p className="text-base leading-6 text-[#F7F7F8] font-['SF_Pro_Text'] max-w-[566px]">
            Your Liblab AI instance is now ready to use. You can start building internal apps and managing your team.
          </p>
          {redirectCountdown > 0 && (
            <p className="text-sm text-[#C6C9D1] font-['SF_Pro_Text']">
              Redirecting to main page in {redirectCountdown} second{redirectCountdown !== 1 ? 's' : ''}...
            </p>
          )}
        </div>

        {/* Finish Button */}
        <Button
          onClick={handleFinish}
          disabled={redirectCountdown > 0}
          className="flex flex-row justify-center items-center px-3 py-2 gap-1 w-[111px] h-9 bg-[#3BCEFF] rounded-lg hover:bg-[#3BCEFF]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-[#08090A] text-sm font-medium leading-5 font-['SF_Pro_Text']">
            {redirectCountdown > 0 ? 'Redirecting...' : 'Get Started'}
          </span>
        </Button>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'welcome':
        return renderWelcomeStep();
      case 'auth':
        return renderAuthStep();
      case 'auth-config':
        return renderAuthConfigStep();
      case 'complete':
        return renderCompleteStep();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#08090A] flex flex-col relative overflow-y-auto">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-[#3BCEFF]/10 via-transparent to-[#3BCEFF]/5" />
      </div>

      {/* Header - Only show on non-welcome steps */}
      {currentStep !== 'welcome' && (
        <div className="flex items-center p-6 border-b border-[#2A2D3A] relative z-10">
          {/* Logo */}
          <div className="flex-1">
            <span className="text-[#F7F7F8] font-bold text-lg">liblab{'{ai}'}</span>
          </div>

          {/* Progress Steps - Centered */}
          <div className="flex-1 flex justify-center">
            <div className="flex items-center space-x-2">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center space-x-3 px-4 py-2 rounded-lg border-2 ${
                      index <= currentStepIndex ? 'border-white bg-transparent' : 'border-[#4A4D5A] bg-transparent'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold leading-none ${
                        index <= currentStepIndex ? 'bg-white text-black' : 'bg-[#999EA7] text-black'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="hidden sm:block whitespace-nowrap">
                      <div
                        className={`text-sm font-medium ${index <= currentStepIndex ? 'text-white' : 'text-[#6A6D7A]'}`}
                      >
                        {step.title}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && <div className="mx-3 w-8 h-px bg-[#4A4D5A]"></div>}
                </div>
              ))}
            </div>
          </div>

          {/* Empty space for balance */}
          <div className="flex-1"></div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-4xl">
          {showSignInSuccess && (
            <Alert className="mb-6 border-green-500 bg-green-500/10">
              <AlertDescription className="text-green-400">
                Successfully signed in with Google! You can now continue with the onboarding process.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="mb-6 border-[#FF6B6B] bg-[#FF6B6B]/10">
              <AlertDescription className="text-[#FF6B6B]">{error}</AlertDescription>
            </Alert>
          )}

          {renderCurrentStep()}
        </div>
      </div>

      {/* Footer Navigation */}
      {currentStep !== 'welcome' && currentStep !== 'complete' && (
        <div className="flex items-center justify-between p-6 border-t border-[#2A2D3A] relative z-10">
          <Button
            onClick={handleBack}
            variant="outline"
            className="text-[#C6C9D1] border-[#2A2D3A] hover:bg-[#2A2D3A] hover:text-[#F7F7F8]"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back
          </Button>

          <div className="flex gap-3">
            <Button
              onClick={handleNext}
              disabled={isLoading}
              className={`font-medium ${
                currentStep === 'auth-config'
                  ? 'bg-[#10B981] hover:bg-[#10B981]/90 text-white'
                  : 'bg-[#3BCEFF] hover:bg-[#3BCEFF]/90 text-[#08090A]'
              }`}
            >
              {isLoading ? 'Setting up...' : currentStep === 'auth-config' ? 'Complete Setup' : 'Continue'}
              {currentStep === 'auth-config' && !isLoading && <CheckCircle className="ml-2 w-4 h-4" />}
              {currentStep !== 'auth-config' && <ArrowRight className="ml-2 w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
