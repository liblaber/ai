// Onboarding API Types
import { z } from 'zod';

export type AuthMethod = 'google' | 'sso' | 'password';
export type OnboardingStep = 'auth' | 'auth-config' | 'llm' | 'datasource' | 'users' | 'complete';

export interface AdminData {
  name: string;
  email: string;
  password?: string;
  confirmPassword?: string;
}

export interface SsoConfig {
  hostUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string;
}

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
}

export interface LlmConfig {
  model: string;
  apiKey: string;
  baseUrl?: string;
}

export interface DatasourceConfig {
  name: string;
  type: string;
  connectionString: string;
  properties?: Record<string, any>;
}

export interface UserInvitation {
  email: string;
  role: string;
}

export interface UsersConfig {
  invitations: UserInvitation[];
}

export interface OnboardingRequest {
  authMethod: AuthMethod;
  adminData: AdminData;
  ssoConfig?: SsoConfig;
  googleOAuthConfig?: GoogleOAuthConfig;
  telemetryConsent: boolean;
}

// Individual step request types
export interface AuthStepRequest {
  authMethod: AuthMethod;
}

export interface AuthConfigStepRequest {
  adminData: AdminData;
  ssoConfig?: SsoConfig;
  googleOAuthConfig?: GoogleOAuthConfig;
}

export interface LlmStepRequest {
  llmConfig: LlmConfig;
}

export interface DatasourceStepRequest {
  datasourceConfig: DatasourceConfig;
}

export interface UsersStepRequest {
  usersConfig: UsersConfig;
}

export interface OnboardingSuccessResponse {
  success: true;
  message: string;
  userId?: string;
  currentStep?: OnboardingStep;
}

export interface OnboardingErrorResponse {
  success: false;
  error: string;
}

export type OnboardingCompleteResponse = OnboardingSuccessResponse | OnboardingErrorResponse;
export type OnboardingStepResponse = OnboardingSuccessResponse | OnboardingErrorResponse;

export interface OnboardingStatusResponse {
  isSetUp: boolean;
  currentStep?: OnboardingStep;
  progress?: {
    authMethod?: AuthMethod;
    adminData?: AdminData;
    ssoConfig?: SsoConfig;
    llmConfig?: LlmConfig;
    datasourceConfig?: DatasourceConfig;
    usersConfig?: UsersConfig;
    telemetryConsent?: boolean;
  };
  error?: string;
}

// Zod schemas for runtime validation
export const AUTH_METHOD_SCHEMA = z.enum(['google', 'sso', 'password']);
export const ONBOARDING_STEP_SCHEMA = z.enum(['auth', 'auth-config', 'llm', 'datasource', 'users', 'complete']);

export const ADMIN_DATA_SCHEMA = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
});

export const SSO_CONFIG_SCHEMA = z.object({
  hostUrl: z.string().url('Invalid host URL'),
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client secret is required'),
  scopes: z.string().min(1, 'Scopes are required'),
});

export const GOOGLE_OAUTH_CONFIG_SCHEMA = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client secret is required'),
});

export const LLM_CONFIG_SCHEMA = z.object({
  model: z.string().min(1, 'Model is required'),
  apiKey: z.string().min(1, 'API key is required'),
  baseUrl: z.string().url().optional(),
});

export const DATASOURCE_CONFIG_SCHEMA = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  connectionString: z.string().min(1, 'Connection string is required'),
  properties: z.record(z.any()).optional(),
});

export const USER_INVITATION_SCHEMA = z.object({
  email: z.string().email('Invalid email format'),
  role: z.string().min(1, 'Role is required'),
});

export const USERS_CONFIG_SCHEMA = z.object({
  invitations: z.array(USER_INVITATION_SCHEMA),
});

export const ONBOARDING_REQUEST_SCHEMA = z.object({
  authMethod: AUTH_METHOD_SCHEMA,
  adminData: ADMIN_DATA_SCHEMA,
  ssoConfig: SSO_CONFIG_SCHEMA.optional(),
  googleOAuthConfig: GOOGLE_OAUTH_CONFIG_SCHEMA.optional(),
  telemetryConsent: z.boolean(),
});

// Individual step schemas
export const AUTH_STEP_REQUEST_SCHEMA = z.object({
  authMethod: AUTH_METHOD_SCHEMA,
});

export const AUTH_CONFIG_STEP_REQUEST_SCHEMA = z.object({
  adminData: ADMIN_DATA_SCHEMA,
  ssoConfig: SSO_CONFIG_SCHEMA.optional(),
  googleOAuthConfig: GOOGLE_OAUTH_CONFIG_SCHEMA.optional(),
});

export const LLM_STEP_REQUEST_SCHEMA = z.object({
  llmConfig: LLM_CONFIG_SCHEMA,
});

export const DATASOURCE_STEP_REQUEST_SCHEMA = z.object({
  datasourceConfig: DATASOURCE_CONFIG_SCHEMA,
});

export const USERS_STEP_REQUEST_SCHEMA = z.object({
  usersConfig: USERS_CONFIG_SCHEMA,
});

export const ONBOARDING_SUCCESS_RESPONSE_SCHEMA = z.object({
  success: z.literal(true),
  message: z.string(),
  userId: z.string().optional(),
  currentStep: ONBOARDING_STEP_SCHEMA.optional(),
});

export const ONBOARDING_ERROR_RESPONSE_SCHEMA = z.object({
  success: z.literal(false),
  error: z.string(),
});

export const ONBOARDING_COMPLETE_RESPONSE_SCHEMA = z.union([
  ONBOARDING_SUCCESS_RESPONSE_SCHEMA,
  ONBOARDING_ERROR_RESPONSE_SCHEMA,
]);

export const ONBOARDING_STEP_RESPONSE_SCHEMA = z.union([
  ONBOARDING_SUCCESS_RESPONSE_SCHEMA,
  ONBOARDING_ERROR_RESPONSE_SCHEMA,
]);

export const ONBOARDING_STATUS_RESPONSE_SCHEMA = z.object({
  isSetUp: z.boolean(),
  currentStep: ONBOARDING_STEP_SCHEMA.optional(),
  progress: z
    .object({
      authMethod: AUTH_METHOD_SCHEMA.optional(),
      adminData: ADMIN_DATA_SCHEMA.optional(),
      ssoConfig: SSO_CONFIG_SCHEMA.optional(),
      llmConfig: LLM_CONFIG_SCHEMA.optional(),
      datasourceConfig: DATASOURCE_CONFIG_SCHEMA.optional(),
      usersConfig: USERS_CONFIG_SCHEMA.optional(),
      telemetryConsent: z.boolean().optional(),
    })
    .optional(),
  error: z.string().optional(),
});

// Validation functions using Zod schemas
export const validateAuthMethod = (value: unknown): value is AuthMethod => {
  return AUTH_METHOD_SCHEMA.safeParse(value).success;
};

export const validateOnboardingStep = (value: unknown): value is OnboardingStep => {
  return ONBOARDING_STEP_SCHEMA.safeParse(value).success;
};

export const validateAdminData = (value: unknown): value is AdminData => {
  return ADMIN_DATA_SCHEMA.safeParse(value).success;
};

export const validateSsoConfig = (value: unknown): value is SsoConfig => {
  return SSO_CONFIG_SCHEMA.safeParse(value).success;
};

export const validateLlmConfig = (value: unknown): value is LlmConfig => {
  return LLM_CONFIG_SCHEMA.safeParse(value).success;
};

export const validateDatasourceConfig = (value: unknown): value is DatasourceConfig => {
  return DATASOURCE_CONFIG_SCHEMA.safeParse(value).success;
};

export const validateUsersConfig = (value: unknown): value is UsersConfig => {
  return USERS_CONFIG_SCHEMA.safeParse(value).success;
};

export const validateOnboardingRequest = (value: unknown): value is OnboardingRequest => {
  return ONBOARDING_REQUEST_SCHEMA.safeParse(value).success;
};

export const validateAuthStepRequest = (value: unknown): value is AuthStepRequest => {
  return AUTH_STEP_REQUEST_SCHEMA.safeParse(value).success;
};

export const validateAuthConfigStepRequest = (value: unknown): value is AuthConfigStepRequest => {
  return AUTH_CONFIG_STEP_REQUEST_SCHEMA.safeParse(value).success;
};

export const validateLlmStepRequest = (value: unknown): value is LlmStepRequest => {
  return LLM_STEP_REQUEST_SCHEMA.safeParse(value).success;
};

export const validateDatasourceStepRequest = (value: unknown): value is DatasourceStepRequest => {
  return DATASOURCE_STEP_REQUEST_SCHEMA.safeParse(value).success;
};

export const validateUsersStepRequest = (value: unknown): value is UsersStepRequest => {
  return USERS_STEP_REQUEST_SCHEMA.safeParse(value).success;
};

export const validateOnboardingCompleteResponse = (value: unknown): value is OnboardingCompleteResponse => {
  return ONBOARDING_COMPLETE_RESPONSE_SCHEMA.safeParse(value).success;
};

export const validateOnboardingStepResponse = (value: unknown): value is OnboardingStepResponse => {
  return ONBOARDING_STEP_RESPONSE_SCHEMA.safeParse(value).success;
};

export const validateOnboardingStatusResponse = (value: unknown): value is OnboardingStatusResponse => {
  return ONBOARDING_STATUS_RESPONSE_SCHEMA.safeParse(value).success;
};
