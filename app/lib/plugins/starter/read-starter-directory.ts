import type { FileMap } from '~/lib/.server/llm/constants';
import fs from 'fs';
import path from 'path';
import { getEncoding } from 'istextorbinary';
import { logger } from '~/utils/logger';

type GetStarterFileMapOptions = {
  dirPath: string;
  basePath?: string;
  ignorePatterns?: string[];
  sharedImportsToSkip?: string[];
};

export function readStarterFileMap(options: GetStarterFileMapOptions): FileMap {
  const { dirPath, basePath = '', ignorePatterns = [], sharedImportsToSkip = [] } = options;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  let fileMap: FileMap = {};
  const sharedFiles = getSharedFiles({ directoriesToSkip: ['data-access'] });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    let relativePath = path.join(basePath, entry.name);

    if (ignorePatterns.includes(entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      fileMap[relativePath] = { type: 'folder' };

      const subDirMap = readStarterFileMap({ ...options, dirPath: fullPath, basePath: relativePath });
      fileMap = { ...fileMap, ...subDirMap };
    } else {
      if (entry.name === 'package.json') {
        const packageJson = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        const dependencies = packageJson.dependencies || {};

        // Extract all imports from shared files
        const sharedImports = new Set<string>();
        Object.values(sharedFiles).forEach((file) => {
          if (file?.type === 'file') {
            const importMatches = file.content.match(/from ['"]([^'"]+)['"]/g) || [];
            importMatches.forEach((match: string) => {
              const importPath = match.match(/from ['"]([^'"]+)['"]/)?.[1];

              if (importPath && !importPath.startsWith('.') && !importPath.startsWith('@/')) {
                // Extract the package name from the import
                const packageName = importPath.split('/')[0];

                if (packageName && !sharedImportsToSkip.includes(packageName)) {
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

      if (entry.name === 'execute-query.direct.ts') {
        logger.debug('Skipping execute-query.direct.ts file import');
        continue;
      }

      if (entry.name === 'execute-query.proxy.ts') {
        logger.debug('Renaming execute-query.proxy.ts to execute-query.ts');
        relativePath = relativePath.replace('.proxy', '');
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

type ReadDataAccessFileMapOptions = {
  dirPath: string;
  packageJsonContent: string;
};

export function readDataAccessFileMap({ dirPath, packageJsonContent }: ReadDataAccessFileMapOptions): FileMap {
  let fileMap: FileMap = {};

  const sharedFiles = getSharedFiles({ directoriesToSkip: ['encryption'] });

  const dataAccessFiles: FileMap = {};
  Object.entries(sharedFiles).forEach(([path, file]) => {
    if (path.includes('data-access')) {
      dataAccessFiles[path] = file;
    }
  });

  const executeQueryDirectPath = path.join(dirPath, 'app/db/execute-query.direct.ts');

  if (fs.existsSync(executeQueryDirectPath)) {
    const content = fs.readFileSync(executeQueryDirectPath, 'utf-8');
    const modifiedContent = content.replace(
      /from ['"]@liblab\/shared\/(.*?)['"]/g,
      (_, importPath) => `from '@/lib/${importPath}'`,
    );

    dataAccessFiles['app/db/execute-query.ts'] = {
      type: 'file',
      content: modifiedContent,
      isBinary: false,
    };
  }

  const packageJson = JSON.parse(packageJsonContent);
  const dependencies = packageJson.dependencies || {};

  // Extract all imports from data-access files
  const sharedImports = new Set<string>();
  Object.values(dataAccessFiles).forEach((file) => {
    if (file?.type === 'file') {
      const importMatches = file.content.match(/from ['"]([^'"]+)['"]/g) || [];
      importMatches.forEach((match: string) => {
        const importPath = match.match(/from ['"]([^'"]+)['"]/)?.[1];

        if (importPath && !importPath.startsWith('.') && !importPath.startsWith('@/')) {
          // Extract the package name from the import
          const packageName = importPath.split('/')[0];

          if (packageName) {
            sharedImports.add(packageName);
          }
        }
      });
    }
  });

  // Add missing dependencies from root package.json
  let hasChanges = false;
  const rootPackageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  sharedImports.forEach((pkg) => {
    if (!dependencies[pkg]) {
      dependencies[pkg] = rootPackageJson.dependencies?.[pkg] || rootPackageJson.devDependencies?.[pkg] || 'latest';
      hasChanges = true;
    }
  });

  // Update package.json if there are changes
  if (hasChanges) {
    packageJson.dependencies = dependencies;
    fileMap['package.json'] = {
      type: 'file',
      content: JSON.stringify(packageJson, null, 2),
      isBinary: false,
    };
  }

  // Merge data-access files into the result
  fileMap = { ...fileMap, ...dataAccessFiles };

  return fileMap;
}

function getSharedFiles({ directoriesToSkip = [] }: { directoriesToSkip?: string[] }): FileMap {
  const sharedDir = path.join(process.cwd(), 'shared/src');
  const fileMap: FileMap = {};

  function processDirectory(dir: string, relativePath: string = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        if (directoriesToSkip.includes(entry.name)) {
          continue;
        }

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
