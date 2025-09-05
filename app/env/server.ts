import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

/**
 * Provider configuration mapping provider names to their required environment variable keys.
 * Only includes providers that require API keys.
 */
const PROVIDER_CONFIG = {
  Anthropic: 'ANTHROPIC_API_KEY',
  OpenAI: 'OPENAI_API_KEY',
  Google: 'GOOGLE_GENERATIVE_AI_API_KEY',
  OpenRouter: 'OPEN_ROUTER_API_KEY',
  Groq: 'GROQ_API_KEY',
  Mistral: 'MISTRAL_API_KEY',
  Cohere: 'COHERE_API_KEY',
  Perplexity: 'PERPLEXITY_API_KEY',
  Together: 'TOGETHER_API_KEY',
  Deepseek: 'DEEPSEEK_API_KEY',
  xAI: 'XAI_API_KEY',
  Github: 'GITHUB_API_KEY',
  Hyperbolic: 'HYPERBOLIC_API_KEY',
  HuggingFace: 'HUGGINGFACE_API_KEY',
  OpenAILike: 'OPENAI_LIKE_API_KEY',
  AmazonBedrock: 'AWS_BEDROCK_CONFIG',
} as const;

/**
 * All supported providers, including local ones that don't require API keys.
 */
const ALL_PROVIDERS = [...Object.keys(PROVIDER_CONFIG), 'Ollama', 'LMStudio'] as const;

// Type-safe provider names for Zod enum
const PROVIDER_NAMES = ALL_PROVIDERS as unknown as [string, ...string[]];

/**
 * Creates a conditional Zod schema for provider API keys.
 * The API key is required only when the provider is currently selected.
 */
const createConditionalApiKeySchema = (
  targetProviderName: string,
  apiKeyName: string,
): z.ZodOptional<z.ZodString> | z.ZodString => {
  const currentProvider = process.env.DEFAULT_LLM_PROVIDER || 'Anthropic';

  return currentProvider === targetProviderName
    ? z.string().min(1, `${apiKeyName} is required when using ${targetProviderName} provider`)
    : z.string().optional();
};

/**
 * Generates Zod schemas for all provider API keys.
 * Local providers (Ollama, LMStudio) are excluded as they don't require API keys.
 */
const getProviderSchemas = (): Record<string, z.ZodOptional<z.ZodString> | z.ZodString> => {
  const schemas: Record<string, z.ZodOptional<z.ZodString> | z.ZodString> = {};

  for (const [providerName, apiKeyName] of Object.entries(PROVIDER_CONFIG)) {
    schemas[apiKeyName] = createConditionalApiKeySchema(providerName, apiKeyName);
  }

  return schemas;
};

export const env = createEnv({
  server: {
    // Core application configuration
    BASE_URL: z.string().default('http://localhost:3000'),
    LICENSE_KEY: z.string().default('free'),
    NODE_ENV: z.string().optional(),
    PORT: z.coerce.number().optional(),
    DEV: z.coerce.boolean().default(false),
    PROD: z.coerce.boolean().default(false),

    // Storage configuration
    STORAGE_TYPE: z.enum(['FILE_SYSTEM', 'DATABASE']).default('FILE_SYSTEM'),
    STARTER: z.enum(['next', 'remix']).default('next'),

    // Security configuration
    AUTH_SECRET: z.string().length(44, 'Auth secret must be a 44-character base64-encoded 32-byte key'),
    ENCRYPTION_KEY: z.string().length(44, 'Encryption key must be a 44-character base64-encoded 32-byte key'),

    // LLM provider configuration
    DEFAULT_LLM_PROVIDER: z.enum(PROVIDER_NAMES).default('Anthropic'),
    DEFAULT_LLM_MODEL: z.string().default('claude-4-sonnet-20250514'),

    // Local provider configuration
    OLLAMA_API_BASE_URL: z.string().url().default('http://localhost:11434'),

    // Provider API keys (conditionally required based on selected provider)
    ...getProviderSchemas(),

    // Third-party service tokens
    NETLIFY_AUTH_TOKEN: z.string().optional(),

    // Google OAuth configuration
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_AUTH_ENCRYPTION_KEY: z.string().optional(),

    // Development configuration
    npm_package_version: z.string().optional(),
    CUSTOM_KEY: z.string().optional(),

    // Google Sheets configuration
    GOOGLE_SHEETS_SEMANTIC_VERSION: z.string().default('3'),
  },
  experimental__runtimeEnv: process.env,
});
