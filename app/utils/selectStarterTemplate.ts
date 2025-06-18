import { MessageRole } from '~/utils/constants';
import { type Message } from 'ai';
import type { FileMap } from '~/lib/stores/files';
import { loadFileMapIntoContainer } from '~/lib/webcontainer/load-file-map';

export type RepoFile = { name: string; path: string; content: string };

interface StarterTemplateResponse {
  files?: FileMap;
  error?: string;
}

function writeSensitiveDataToEnvFile(files: FileMap, databaseUrl: string): FileMap {
  const envPath = Object.keys(files).find((key) => key.includes('.env')) || '.env';
  const encodedDatabaseUrl = encodeURIComponent(databaseUrl);
  const encryptionKey = process.env.ENCRYPTION_KEY;

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

const getStarterTemplateFiles = async (): Promise<FileMap> => {
  try {
    const response = await fetch('/api/starter-template');

    if (!response.ok) {
      throw new Error(`Failed to fetch starter template: ${response.status}`);
    }

    const data = (await response.json()) as StarterTemplateResponse;

    if (data.error) {
      throw new Error(data.error);
    }

    if (!data.files) {
      throw new Error('No files returned from starter template API');
    }

    return data.files;
  } catch (error) {
    console.error('Error fetching starter template:', error);
    throw error;
  }
};

export async function getStarterTemplateMessages(title: string, databaseUrl: string): Promise<Message[]> {
  const starterFiles = await getStarterTemplateFiles();
  const updatedFiles = writeSensitiveDataToEnvFile(starterFiles, databaseUrl);

  await loadFileMapIntoContainer(updatedFiles);

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
      content: getStarterTemplateArtifact(title, updatedFiles),
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
