import path from 'path';
import fs from 'fs';
import { logger } from '~/utils/logger';

const DIRECTORIES_TO_SKIP = ['.git', 'node_modules', 'build', '.idea', '.vscode', '.cache', 'analytics-dashboard'];
const FILES_TO_SKIP = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.DS_Store',
  'resources.builds.ts',
  'analytics-dashboard.tsx',
];

export const STARTER_DIRECTORY = process.env.STARTER_PATH!;

export function readDirectory(dirPath: string, basePath: string = ''): any[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files: any[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      if (DIRECTORIES_TO_SKIP.includes(entry.name)) {
        continue;
      }

      files.push(...readDirectory(fullPath, relativePath));
    } else {
      if (FILES_TO_SKIP.includes(entry.name)) {
        continue;
      }

      files.push({
        name: entry.name,
        path: relativePath,
        content: fs.readFileSync(fullPath, 'utf8'),
      });
    }
  }

  return files;
}

let starterInstructionsPrompt: string | null;

export async function getStarterInstructionsPrompt(): Promise<string | null> {
  if (starterInstructionsPrompt) {
    return starterInstructionsPrompt;
  }

  try {
    const promptPath = path.join(STARTER_DIRECTORY, '.liblab', 'prompt');

    if (!fs.existsSync(STARTER_DIRECTORY)) {
      logger.error('Starter template directory not found');
      return null;
    }

    if (!fs.existsSync(promptPath)) {
      logger.error('Starter template prompt file not found');
      return null;
    }

    starterInstructionsPrompt = fs.readFileSync(promptPath, 'utf8');

    return starterInstructionsPrompt;
  } catch (error) {
    console.error('Error reading prompt file:', error);
    return null;
  }
}
