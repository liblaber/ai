import z from 'zod';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

export const environmentSchema = z.object({
  NEXT_PUBLIC_ENV_NAME: z.string().default('local'),
  NEXT_PUBLIC_LOG_LEVEL: z.string().default('debug'),
  NEXT_PUBLIC_TUNNEL_FORWARDING_URL: z.string().optional(),
  BASE_URL: z.string().default('http://localhost:3000'),
  LICENSE_KEY: z.string().default('free'),
  STORAGE_TYPE: z.enum(['FILE_SYSTEM', 'DATABASE']).default('FILE_SYSTEM'),
  STARTER: z.enum(['next', 'react', 'vue', 'svelte']).default('next'),
  POSTHOG_API_KEY: z.string().optional(),
  DISABLE_TELEMETRY: z
    .string()
    .transform((val) => val.toLowerCase() === 'true' || val === '1')
    .default('false'),
  ENCRYPTION_KEY: z.string().min(32, 'Encryption key must be at least 32 characters'),
  NGROK_AUTHTOKEN: z.string().optional(),

  DEFAULT_LLM_PROVIDER: z.string().default('Anthropic'),
  DEFAULT_LLM_MODEL: z.string().default('claude-3-5-sonnet-latest'),

  ANTHROPIC_API_KEY: z.string().optional(),

  NETLIFY_AUTH_TOKEN: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),

  NEXT_PUBLIC_GITHUB_ACCESS_TOKEN: z.string().optional(),

  NODE_ENV: z.string().optional(),
  npm_package_version: z.string().optional(),
  DEV: z.boolean().default(false),
  PROD: z.boolean().default(false),
  CUSTOM_KEY: z.string().optional(),
  PORT: z.coerce.number().optional(),
});

export const env = environmentSchema.parse(process.env);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof environmentSchema> {}
  }
}
