import ignore from 'ignore';

// Common patterns to ignore, similar to .gitignore
export const IGNORE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  'dist/**',
  'build/**',
  '.next/**',
  'coverage/**',
  '.cache/**',
  '.vscode/**',
  '.idea/**',
  '**/*.log',
  '**/.DS_Store',
  '**/npm-debug.log*',
  '**/yarn-debug.log*',
  '**/yarn-error.log*',
];

export const MAX_FILES = 1000;
export const ig = ignore().add(IGNORE_PATTERNS);

export const generateId = () => Math.random().toString(36).substring(2, 15);

export const processImageFile = async (
  file: File,
  maxSize = 1024,
  quality = 0.8,
): Promise<{ processedFile: File; base64: string }> => {
  try {
    const { compressedFile, base64 } = await compressImageToJpeg(file, maxSize, quality);
    return { processedFile: compressedFile, base64 };
  } catch (error) {
    console.error('Failed to compress image:', error);

    // Fallback to original file if compression fails
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const base64Image = e.target?.result as string;
        resolve({ processedFile: file, base64: base64Image });
      };

      reader.onerror = () => reject(new Error('Failed to read file as base64'));
      reader.readAsDataURL(file);
    });
  }
};

export const compressImageToJpeg = (
  file: File,
  maxSize = 1024,
  quality = 0.8,
): Promise<{ compressedFile: File; base64: string }> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        URL.revokeObjectURL(objectUrl);

        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        if (file.type === 'image/png' || file.type === 'image/webp') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }

            const jpegFileName = file.name.replace(/\.[^/.]+$/, '.jpg');
            const compressedFile = new File([blob], jpegFileName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            const reader = new FileReader();

            reader.onload = () => {
              const base64 = reader.result as string;
              resolve({ compressedFile, base64 });
            };
            reader.onerror = () => reject(new Error('Failed to read file as base64'));
            reader.readAsDataURL(compressedFile);
          },
          'image/jpeg',
          quality,
        );
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
};

export const isBinaryFile = async (file: File): Promise<boolean> => {
  const chunkSize = 1024;
  const buffer = new Uint8Array(await file.slice(0, chunkSize).arrayBuffer());

  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];

    if (byte === 0 || (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13)) {
      return true;
    }
  }

  return false;
};

export const shouldIncludeFile = (path: string): boolean => {
  return !ig.ignores(path);
};

const readPackageJson = async (files: File[]): Promise<{ scripts?: Record<string, string> } | null> => {
  const packageJsonFile = files.find((f) => f.webkitRelativePath.endsWith('package.json'));

  if (!packageJsonFile) {
    return null;
  }

  try {
    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(packageJsonFile);
    });

    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading package.json:', error);
    return null;
  }
};

export const detectProjectType = async (
  files: File[],
): Promise<{ type: string; setupCommand: string; followupMessage: string }> => {
  const hasFile = (name: string) => files.some((f) => f.webkitRelativePath.endsWith(name));

  if (hasFile('package.json')) {
    const packageJson = await readPackageJson(files);
    const scripts = packageJson?.scripts || {};

    // Check for preferred commands in priority order
    const preferredCommands = ['dev', 'start', 'preview'];
    const availableCommand = preferredCommands.find((cmd) => scripts[cmd]);

    if (availableCommand) {
      return {
        type: 'Node.js',
        setupCommand: `npm install && npm run ${availableCommand}`,
        followupMessage: `Found "${availableCommand}" script in package.json. Running "npm run ${availableCommand}" after installation.`,
      };
    }

    return {
      type: 'Node.js',
      setupCommand: 'npm install',
      followupMessage:
        'Would you like me to inspect package.json to determine the available scripts for running this project?',
    };
  }

  if (hasFile('index.html')) {
    return {
      type: 'Static',
      setupCommand: 'npx --yes serve',
      followupMessage: '',
    };
  }

  return { type: '', setupCommand: '', followupMessage: '' };
};

export const filesToArtifacts = (files: { [path: string]: { content: string } }, id: string): string => {
  return `
<liblabArtifact id="${id}" title="User Updated Files">
${Object.keys(files)
  .map(
    (filePath) => `
<liblabAction type="file" filePath="${filePath}">
${files[filePath].content}
</liblabAction>
`,
  )
  .join('\n')}
</liblabArtifact>
  `;
};
