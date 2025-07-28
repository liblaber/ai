import { MessageRole } from '~/utils/constants';
import { type Message } from 'ai';
import type { FileMap } from '~/lib/stores/files';
import { loadFileMapIntoContainer } from '~/lib/webcontainer/load-file-map';
import '~/lib/config/env';
import { logger } from '~/utils/logger';

export type RepoFile = { name: string; path: string; content: string };

interface StarterTemplateResponse {
  files?: FileMap;
  error?: string;
}

async function writeSensitiveDataToEnvFile(files: FileMap, databaseUrl: string): Promise<FileMap> {
  const envPath = Object.keys(files).find((key) => key.includes('.env')) || '.env';
  const encodedDatabaseUrl = encodeURIComponent(databaseUrl);
  const encryptionKeyResponse = await fetch('/api/encryption-key');

  if (!encryptionKeyResponse.ok) {
    throw new Error(`Failed to fetch encryption key: ${encryptionKeyResponse.status}`);
  }

  const { encryptionKey } = await encryptionKeyResponse.json<{ encryptionKey: string }>();

  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  let content = '';

  if (files[envPath] && files[envPath]?.type === 'file') {
    // Append database URL to existing env file content
    const existingContent = files[envPath]?.content.trim() || '';
    content = existingContent
      ? `${existingContent}\nDATABASE_URL='${encodedDatabaseUrl}'`
      : `DATABASE_URL='${encodedDatabaseUrl}'`;
    content += '\n'; // Ensure it ends with a newline
    content += `ENCRYPTION_KEY='${encryptionKey}'\n`;
  } else {
    content = `DATABASE_URL='${encodedDatabaseUrl}'\n`;
    content += `ENCRYPTION_KEY='${encryptionKey}'\n`;
  }

  return {
    ...files,
    [envPath]: {
      type: 'file',
      content,
      isBinary: false,
    },
  };
}

export const getStarterTemplateFiles = async (databaseUrl?: string): Promise<FileMap> => {
  try {
    logger.info('fetching starter template files from API with databaseUrl:', databaseUrl);

    const response = await fetch('/api/starter-template');

    logger.info('Fetching starter template files from API', JSON.stringify(response));

    if (!response.ok) {
      throw new Error(`Failed to fetch starter template: ${response.status}`);
    }

    const data = (await response.json()) as StarterTemplateResponse;

    logger.info('Starter template files from API', JSON.stringify(data));

    if (data.error) {
      throw new Error(data.error);
    }

    if (!data.files) {
      throw new Error('No files returned from starter template API');
    }

    if (!databaseUrl) {
      return data.files;
    }

    return writeSensitiveDataToEnvFile(data.files, databaseUrl);
  } catch (error) {
    console.error('Error fetching starter template:', error);
    throw error;
  }
};

export async function getStarterTemplateMessages(title: string, databaseUrl: string): Promise<Message[]> {
  const starterFiles = await getStarterTemplateFiles(databaseUrl);

  await loadFileMapIntoContainer(starterFiles);

  return [
    {
      id: `1-${new Date().getTime()}`,
      role: MessageRole.User,
      content: 'Import the starter template repository',
      annotations: ['hidden'],
    },
    {
      id: `2-${new Date().getTime()}`,
      role: MessageRole.Assistant,
      content: getStarterTemplateArtifact(title, starterFiles),
      annotations: ['hidden'],
    },
  ];
}

function getStarterTemplateArtifact(title: string, files: FileMap): string {
  const fileList = Object.entries(files)
    .filter(([, value]) => value?.type === 'file')
    .map(([path]) => `- ${path}`)
    .join('\n');

  return `I imported the following files:\n${fileList}\n
<liblabArtifact id="imported-files" title="${title}" type="bundled">\n
<liblabAction type="shell">pnpm install</liblabAction>\n
</liblabArtifact>`;
}
