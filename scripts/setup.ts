#!/usr/bin/env tsx

import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { intro, outro, text, log, spinner, isCancel } from '@clack/prompts';

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
  intro('🦙 liblab AI Setup');

  // Check for .env file and create if it doesn't exist
  const envSpinner = spinner();
  envSpinner.start('📋 Checking for .env file');

  if (!existsSync('.env')) {
    envSpinner.stop('⏳ .env file not found, creating from .env.example');

    if (existsSync('.env.example')) {
      copyFileSync('.env.example', '.env');
      log.success('✅ Created .env file from .env.example.');
    } else {
      log.error('❌ .env.example file not found. Please ensure .env.example exists.');
      process.exit(1);
    }
  } else {
    envSpinner.stop('✅ .env file already exists.');
  }

  let envContent = readEnvFile();

  // Copy NEXT_PUBLIC_POSTHOG_KEY from .env.example to .env if it exists
  const posthogSpinner = spinner();
  posthogSpinner.start('📋 Checking for NEXT_PUBLIC_POSTHOG_KEY');

  if (existsSync('.env.example')) {
    const exampleContent = readFileSync('.env.example', 'utf8');
    const posthogKey = getEnvVarValue(exampleContent, 'NEXT_PUBLIC_POSTHOG_KEY');

    if (posthogKey) {
      if (hasEnvVar(envContent, 'NEXT_PUBLIC_POSTHOG_KEY')) {
        posthogSpinner.stop('✅ Updated existing NEXT_PUBLIC_POSTHOG_KEY in .env file.');
      } else {
        posthogSpinner.stop('✅ Added NEXT_PUBLIC_POSTHOG_KEY to .env file.');
      }

      envContent = updateOrAddEnvVar(envContent, 'NEXT_PUBLIC_POSTHOG_KEY', posthogKey);
      writeEnvFile(envContent);
    } else {
      posthogSpinner.stop('⚠️ NEXT_PUBLIC_POSTHOG_KEY not found in .env.example file.');
    }
  } else {
    posthogSpinner.stop('⚠️ .env.example not found, skipping NEXT_PUBLIC_POSTHOG_KEY check.');
  }

  // Generate AUTH_SECRET if not exists
  const authSpinner = spinner();
  authSpinner.start('📋 Checking for AUTH_SECRET');

  if (!hasEnvVar(envContent, 'AUTH_SECRET')) {
    authSpinner.stop('⏳ Generating auth secret');

    const generateAuthSpinner = spinner();
    generateAuthSpinner.start('Generating secure auth secret');

    try {
      const authSecret = generateSecureKey();

      envContent = updateOrAddEnvVar(envContent, 'AUTH_SECRET', authSecret);
      writeEnvFile(envContent);
      generateAuthSpinner.stop('✅ Generated and stored auth secret.');
    } catch (error) {
      generateAuthSpinner.stop('❌ Failed to generate auth secret');
      log.error(`Error: ${error}`);
      process.exit(1);
    }
  } else {
    authSpinner.stop('✅ AUTH_SECRET already exists.');
  }

  // Generate ENCRYPTION_KEY if not exists
  const encryptionSpinner = spinner();
  encryptionSpinner.start('📋 Checking for ENCRYPTION_KEY');

  if (!hasEnvVar(envContent, 'ENCRYPTION_KEY')) {
    encryptionSpinner.stop('⏳ Generating AES-256-GCM key');

    const generateEncryptionSpinner = spinner();
    generateEncryptionSpinner.start('Generating AES-256-GCM encryption key');

    try {
      const encryptionKey = generateSecureKey();

      envContent = updateOrAddEnvVar(envContent, 'ENCRYPTION_KEY', encryptionKey);
      writeEnvFile(envContent);
      generateEncryptionSpinner.stop('✅ Generated and stored AES-256-GCM encryption key.');
    } catch (error) {
      generateEncryptionSpinner.stop('❌ Failed to generate encryption key');
      log.error(`Error: ${error}`);
      process.exit(1);
    }
  } else {
    encryptionSpinner.stop('✅ ENCRYPTION_KEY already exists.');
  }

  // Prompt for LLM provider(s) using a select, and skip if API key exists
  log.info('🔑 Configure your AI provider');

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

  // Use select instead of text
  const { select } = await import('@clack/prompts');
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
  if (hasEnvVar(envContent, selected.apiKeyEnv)) {
    log.info(`✅ ${selected.apiKeyEnv} already exists in .env file. Skipping provider setup.`);
  } else {
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
    log.success(`✅ Set DEFAULT_LLM_MODEL, DEFAULT_LLM_PROVIDER, and ${selected.apiKeyEnv} in .env file.`);
  }

  // Check for NGROK_AUTHTOKEN
  const ngrokSpinner = spinner();
  ngrokSpinner.start('📋 Checking for NGROK_AUTHTOKEN');

  if (!hasEnvVar(envContent, 'NGROK_AUTHTOKEN')) {
    ngrokSpinner.stop('⚠️ NGROK_AUTHTOKEN not found or empty in .env file.');
    log.info('📖 Get your token from: https://dashboard.ngrok.com/get-started/your-authtoken');

    const ngrokToken = (await text({
      message: 'Please enter your ngrok auth token (optional):',
      placeholder: '2abc123def456',
    })) as string;

    if (ngrokToken && ngrokToken.trim()) {
      envContent = updateOrAddEnvVar(envContent, 'NGROK_AUTHTOKEN', ngrokToken.trim());
      writeEnvFile(envContent);
      log.success('✅ Added NGROK_AUTHTOKEN to .env file.');
    } else {
      log.warn('⚠️ Skipped ngrok auth token. External tunneling will be disabled.');
    }
  } else {
    ngrokSpinner.stop('✅ NGROK_AUTHTOKEN already exists.');
  }

  outro('🎉 liblab AI Setup Complete!');
}

main();
