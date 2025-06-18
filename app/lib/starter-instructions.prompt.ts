import path from 'path';
import fs from 'fs';
import { logger } from '~/utils/logger';
import { getEncoding } from 'istextorbinary';
import type { FileMap } from '~/lib/.server/llm/constants';

const DIRECTORIES_TO_SKIP = ['.git', 'node_modules', 'build', '.idea', '.vscode', '.cache', 'analytics-dashboard'];
const FILES_TO_SKIP = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.DS_Store',
  'resources.builds.ts',
  'analytics-dashboard.tsx',
];

// We don't want to add crypto as an explicit dependency in the built app because it's already included through node (it will break the project if we add it)
const SHARED_IMPORTS_TO_SKIP = ['crypto'];

export const STARTER_DIRECTORY = process.env.STARTER_PATH!;

export function readDirectory(dirPath: string, basePath: string = ''): FileMap {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  let fileMap: FileMap = {};
  const sharedFiles = getSharedFiles();

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      if (DIRECTORIES_TO_SKIP.includes(entry.name)) {
        continue;
      }

      fileMap[relativePath] = { type: 'folder' };

      const subDirMap = readDirectory(fullPath, relativePath);
      fileMap = { ...fileMap, ...subDirMap };
    } else {
      if (FILES_TO_SKIP.includes(entry.name)) {
        continue;
      }

      if (entry.name === 'package.json') {
        const packageJson = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        const dependencies = packageJson.dependencies || {};

        // Extract all imports from shared files
        const sharedImports = new Set<string>();
        Object.values(sharedFiles).forEach((file) => {
          if (file?.type === 'file') {
            const importMatches = file.content.match(/from ['"]([^'"]+)['"]/g) || [];
            importMatches.forEach((match) => {
              const importPath = match.match(/from ['"]([^'"]+)['"]/)?.[1];

              if (importPath && !importPath.startsWith('.') && !importPath.startsWith('@/')) {
                // Extract the package name from the import
                const packageName = importPath.split('/')[0];

                if (packageName && !SHARED_IMPORTS_TO_SKIP.includes(packageName)) {
                  sharedImports.add(packageName);
                }
              }
            });
          }
        });

        // Add missing dependencies
        let hasChanges = false;
        const rootPackageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
        sharedImports.forEach((pkg) => {
          if (!dependencies[pkg]) {
            dependencies[pkg] =
              rootPackageJson.dependencies?.[pkg] || rootPackageJson.devDependencies?.[pkg] || 'latest';
            hasChanges = true;
          }
        });

        if (hasChanges) {
          packageJson.dependencies = dependencies;
          fileMap[relativePath] = {
            type: 'file',
            content: JSON.stringify(packageJson, null, 2),
            isBinary: false,
          };
          continue; // Skip the rest of the file handling for this file
        }
      }

      const buffer = fs.readFileSync(fullPath);
      const encoding = getEncoding(buffer);
      const isBinary = encoding === 'binary';
      fileMap[relativePath] = {
        type: 'file',
        content: isBinary ? '' : buffer.toString('utf8'),
        isBinary,
      };
    }
  }

  fileMap = { ...fileMap, ...sharedFiles };

  return fileMap;
}

function getSharedFiles(): FileMap {
  const sharedDir = path.join(process.cwd(), 'shared/src');
  const fileMap: FileMap = {};

  function processDirectory(dir: string, relativePath: string = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        fileMap[`app/lib/${relPath}`] = { type: 'folder' };
        processDirectory(fullPath, relPath);
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf-8');

        // Convert imports to use relative paths
        const modifiedContent = content.replace(
          /from ['"]@liblab\/shared\/(.*?)['"]/g,
          (_, importPath) => `from '@/lib/${importPath}'`,
        );
        fileMap[`app/lib/${relPath}`] = {
          type: 'file',
          content: modifiedContent,
          isBinary: false,
        };
      }
    }
  }

  if (fs.existsSync(sharedDir)) {
    processDirectory(sharedDir);
  }

  return fileMap;
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
