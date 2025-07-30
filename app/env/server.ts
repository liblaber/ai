import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    BASE_URL: z.string().default('http://localhost:3000'),
    LICENSE_KEY: z.string().default('free'),
    STORAGE_TYPE: z.enum(['FILE_SYSTEM', 'DATABASE']).default('FILE_SYSTEM'),
    STARTER: z.enum(['next', 'remix']).optional(),
    ENCRYPTION_KEY: z.string().length(44, 'Encryption key must be a 44-character base64-encoded 32-byte key'),
    NGROK_AUTHTOKEN: z.string().optional(),

    DEFAULT_LLM_PROVIDER: z.string().default('Anthropic'),
    DEFAULT_LLM_MODEL: z.string().default('claude-3-5-sonnet-latest'),

    ANTHROPIC_API_KEY: z.string(),

    NETLIFY_AUTH_TOKEN: z.string().optional(),

    GOOGLE_CLIENT_ID: z.string().default(''),
    GOOGLE_CLIENT_SECRET: z.string().default(''),
    NODE_ENV: z.string().optional(),
    npm_package_version: z.string().optional(),
    DEV: z.coerce.boolean().default(false),
    PROD: z.coerce.boolean().default(false),
    CUSTOM_KEY: z.string().optional(),
    PORT: z.coerce.number().optional(),
  },
  experimental__runtimeEnv: process.env,
});
