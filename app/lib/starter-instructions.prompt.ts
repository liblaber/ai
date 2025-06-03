import path from 'path';
import fs from 'fs';
import { logger } from '~/utils/logger';
import type { RepoFile } from '~/utils/selectStarterTemplate';

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

  const sharedFiles = getSharedFiles();

  return [...files, ...sharedFiles];
}

function getSharedFiles(): RepoFile[] {
  const sharedDir = path.join(process.cwd(), 'shared/src');
  const files: RepoFile[] = [];

  function processDirectory(dir: string, relativePath: string = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        processDirectory(fullPath, relPath);
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf-8');

        // Convert imports to use relative paths
        const modifiedContent = content.replace(
          /from ['"]@liblab\/shared\/(.*?)['"]/g,
          (_, importPath) => `from '@/lib/${importPath}'`,
        );
        files.push({
          name: entry.name,
          path: `app/lib/${relPath}`,
          content: modifiedContent,
        });
      }
    }
  }

  processDirectory(sharedDir);

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
