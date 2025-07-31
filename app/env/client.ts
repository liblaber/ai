import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  client: {
    NEXT_PUBLIC_BASE_URL: z.string().default('http://localhost:3000'),
    NEXT_PUBLIC_ENV_NAME: z.string().default('local'),
    NEXT_PUBLIC_NODE_ENV: z.string().default('development'),
    NEXT_PUBLIC_LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
    NEXT_PUBLIC_TUNNEL_FORWARDING_URL: z.string(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
    NEXT_PUBLIC_DISABLE_TELEMETRY: z
      .preprocess((value) => {
        return JSON.parse(value as string);
      }, z.boolean())
      .default(false),
    NEXT_PUBLIC_GITHUB_ACCESS_TOKEN: z.string().optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_ENV_NAME: process.env.NEXT_PUBLIC_ENV_NAME,
    NEXT_PUBLIC_LOG_LEVEL: process.env.NEXT_PUBLIC_LOG_LEVEL,
    NEXT_PUBLIC_TUNNEL_FORWARDING_URL: process.env.NEXT_PUBLIC_TUNNEL_FORWARDING_URL,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_DISABLE_TELEMETRY: process.env.NEXT_PUBLIC_DISABLE_TELEMETRY,
    NEXT_PUBLIC_GITHUB_ACCESS_TOKEN: process.env.NEXT_PUBLIC_GITHUB_ACCESS_TOKEN,
    NEXT_PUBLIC_BASE_URL: process.env.BASE_URL,
    NEXT_PUBLIC_NODE_ENV: process.env.NODE_ENV,
  },
});
