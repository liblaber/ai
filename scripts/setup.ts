#!/usr/bin/env tsx

import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { intro, isCancel, log, outro, select, text } from '@clack/prompts';

// liblab AI Builder Setup Script
// OS Compatibility: macOS, Linux, Windows
// Requirements: Node.js, pnpm

function generateSecureKey(): string {
  // Generate a cryptographically secure random 32-byte (256-bit) key
  const key = randomBytes(32).toString('base64');

  // Verify the key length (base64 encoding of 32 bytes should be 44 characters)
  if (key.length !== 44) {
    throw new Error('Failed to generate proper key');
  }

  return key;
}

function readEnvFile(): string {
  if (!existsSync('.env')) {
    return '';
  }

  return readFileSync('.env', 'utf8');
}

function writeEnvFile(content: string): void {
  writeFileSync('.env', content, 'utf8');
}

function updateOrAddEnvVar(envContent: string, key: string, value: string): string {
  const lines = envContent.split('\n');
  const keyPattern = new RegExp(`^${key}=`);
  let found = false;

  const updatedLines = lines.map((line) => {
    if (keyPattern.test(line)) {
      found = true;
      return `${key}='${value}'`;
    }

    return line;
  });

  if (!found) {
    updatedLines.push(`${key}='${value}'`);
  }

  return updatedLines.join('\n');
}

function hasEnvVar(envContent: string, key: string): boolean {
  const pattern = new RegExp(`^${key}=.+`, 'm');

  return pattern.test(envContent);
}

function getEnvVarValue(envContent: string, key: string): string | null {
  const pattern = new RegExp(`^${key}=(.*)$`, 'm');
  const match = envContent.match(pattern);

  if (match) {
    return match[1].replace(/^['"]|['"]$/g, ''); // Remove surrounding quotes
  }

  return null;
}

async function main(): Promise<void> {
  intro('🦙 liblab.ai Setup');

  // Check for .env file and create if it doesn't exist
  if (!existsSync('.env')) {
    if (existsSync('.env.example')) {
      copyFileSync('.env.example', '.env');
    } else {
      log.error('.env.example file not found. Please ensure .env.example exists.');
      process.exit(1);
    }
  }

  let envContent = readEnvFile();

  // Copy NEXT_PUBLIC_POSTHOG_KEY from .env.example to .env if it exists
  if (existsSync('.env.example')) {
    const exampleContent = readFileSync('.env.example', 'utf8');
    const posthogKey = getEnvVarValue(exampleContent, 'NEXT_PUBLIC_POSTHOG_KEY');

    if (posthogKey) {
      envContent = updateOrAddEnvVar(envContent, 'NEXT_PUBLIC_POSTHOG_KEY', posthogKey);
      writeEnvFile(envContent);
    }
  }

  // Generate AUTH_SECRET if not exists
  if (!hasEnvVar(envContent, 'AUTH_SECRET')) {
    try {
      const authSecret = generateSecureKey();
      envContent = updateOrAddEnvVar(envContent, 'AUTH_SECRET', authSecret);
      writeEnvFile(envContent);
    } catch (error) {
      log.error('Failed to generate auth secret: ' + error);
      process.exit(1);
    }
  }

  // Generate ENCRYPTION_KEY if not exists
  if (!hasEnvVar(envContent, 'ENCRYPTION_KEY')) {
    try {
      const encryptionKey = generateSecureKey();
      envContent = updateOrAddEnvVar(envContent, 'ENCRYPTION_KEY', encryptionKey);
      writeEnvFile(envContent);
    } catch (error) {
      log.error('Failed to generate encryption key: ' + error);
      process.exit(1);
    }
  }

  const providers = [
    {
      value: 'openai',
      enumValue: 'OpenAI',
      label: 'OpenAI (GPT)',
      apiKeyEnv: 'OPENAI_API_KEY',
      apiKeyPrompt: 'Please enter your OpenAI API key:',
      apiKeyExample: 'sk-...',
      modelExample: 'gpt-4o',
      apiKeyRegex: /^sk-[\w-]+/,
      apiKeyFormatMsg: 'OpenAI key must start with sk-',
    },
    {
      value: 'anthropic',
      enumValue: 'Anthropic',
      label: 'Anthropic (Claude)',
      apiKeyEnv: 'ANTHROPIC_API_KEY',
      apiKeyPrompt: 'Please enter your Anthropic API key:',
      apiKeyExample: 'sk-ant-...',
      modelExample: 'claude-4-sonnet-20250514',
      apiKeyRegex: /^sk-ant-[\w-]+/,
      apiKeyFormatMsg: 'Anthropic key must start with sk-ant-',
    },
    {
      value: 'openrouter',
      enumValue: 'OpenRouter',
      label: 'OpenRouter',
      apiKeyEnv: 'OPEN_ROUTER_API_KEY',
      apiKeyPrompt: 'Please enter your OpenRouter API key:',
      apiKeyExample: 'sk-or-...',
      modelExample: 'openai/gpt-5-nano',
      apiKeyRegex: /^sk-or-[\w-]+/,
      apiKeyFormatMsg: 'OpenRouter key must start with sk-or-',
    },
  ];

  const providerValue = await select({
    message: 'Select your AI provider:',
    options: providers.map((p) => ({ value: p.value, label: p.label })),
  });

  if (isCancel(providerValue)) {
    log.warn('Setup cancelled.');
    process.exit(0);
  }

  const selected = providers.find((p) => p.value === providerValue);

  if (!selected) {
    log.error('Unknown provider.');
    process.exit(1);
  }

  // If API key already exists, skip provider setup
  if (!hasEnvVar(envContent, selected.apiKeyEnv)) {
    // Prompt for model name
    const modelNameResult = await text({
      message: `Enter the model name for ${selected.label} (e.g. ${selected.modelExample}):`,
      placeholder: selected.modelExample,
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Model name is required';
        }

        return undefined;
      },
    });

    if (isCancel(modelNameResult)) {
      log.warn('Setup cancelled.');
      process.exit(0);
    }

    const modelName = modelNameResult;

    // Prompt for API key with regex validation
    const apiKeyResult = await text({
      message: selected.apiKeyPrompt,
      placeholder: selected.apiKeyExample,
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return 'API key is required';
        }

        if (selected.apiKeyRegex && !selected.apiKeyRegex.test(value.trim())) {
          return selected.apiKeyFormatMsg || 'Invalid API key format';
        }

        return undefined;
      },
    });

    if (isCancel(apiKeyResult)) {
      log.warn('Setup cancelled.');
      process.exit(0);
    }

    const apiKey = apiKeyResult;

    envContent = updateOrAddEnvVar(envContent, 'DEFAULT_LLM_PROVIDER', selected.enumValue);
    envContent = updateOrAddEnvVar(envContent, 'DEFAULT_LLM_MODEL', modelName.trim());
    envContent = updateOrAddEnvVar(envContent, selected.apiKeyEnv, apiKey.trim());
    writeEnvFile(envContent);
  }

  // Check for Netlify
  if (!hasEnvVar(envContent, 'NETLIFY_AUTH_TOKEN')) {
    log.info('📖 Get your token from: https://app.netlify.com/user/applications');

    const netlifyToken = await text({
      message: 'Please enter your Netlify auth token (optional):',
      placeholder: '',
    });

    if (isCancel(netlifyToken)) {
      log.warn('Setup cancelled.');
      process.exit(0);
    }

    if (netlifyToken && netlifyToken.trim()) {
      envContent = updateOrAddEnvVar(envContent, 'NETLIFY_AUTH_TOKEN', netlifyToken.trim());
      writeEnvFile(envContent);
    }
  }

  outro('🎉 liblab AI Setup Complete!');
}

main();
