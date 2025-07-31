import fs from 'node:fs';
import path from 'node:path';

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .reduce(
      (acc, line) => {
        const [key, ...rest] = line.split('=');

        if (key) {
          acc[key.trim()] = rest.join('=').trim();
        }

        return acc;
      },
      {} as Record<string, string>,
    );
}

function addMissingEnvKeys(envExamplePath: string, envPath: string) {
  const exampleVars = parseEnvFile(envExamplePath);
  const envVars = parseEnvFile(envPath);

  const missingKeys = Object.keys(exampleVars).filter((key) => !(key in envVars));

  if (missingKeys.length === 0) {
    console.log('No missing keys found.');
    return;
  }

  const toAppend = missingKeys.map((key) => `${key}=${exampleVars[key]}`).join('\n') + '\n';
  fs.appendFileSync(envPath, toAppend);
  console.log(`Added missing keys to ${envPath}:`, missingKeys);
}

// Usage example:
const envExamplePath = path.resolve(process.cwd(), '.env.example');
const envPath = path.resolve(process.cwd(), '.env');
addMissingEnvKeys(envExamplePath, envPath);
