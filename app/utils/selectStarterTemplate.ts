import { MessageRole } from '~/utils/constants';
import { type Message } from 'ai';

export type RepoFile = { name: string; path: string; content: string };

interface StarterTemplateResponse {
  files?: RepoFile[];
  error?: string;
}

function writeSensitiveDataToEnvFile(files: RepoFile[], databaseUrl: string): RepoFile {
  const envFile = files.find((x) => x.path.includes('.env'));
  const encodedDatabaseUrl = encodeURIComponent(databaseUrl);

  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  if (envFile) {
    // Append database URL to existing env file content
    const existingContent = envFile.content.trim();
    envFile.content = existingContent
      ? `${existingContent}\nDATABASE_URL='${encodedDatabaseUrl}'`
      : `DATABASE_URL='${encodedDatabaseUrl}'`;

    envFile.content += '\n'; // Ensure it ends with a newline
    envFile.content += `ENCRYPTION_KEY='${encryptionKey}'\n`;

    return envFile;
  }

  let content = `DATABASE_URL='${encodedDatabaseUrl}'\n`;
  content += `ENCRYPTION_KEY='${encryptionKey}'\n`;

  // Create new env file if none exists
  return {
    name: '.env',
    path: '.env',
    content,
  };
}

const getStarterTemplateFiles = async (): Promise<RepoFile[]> => {
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
  const envFile = writeSensitiveDataToEnvFile(starterFiles, databaseUrl);
  const allFiles = [...starterFiles, envFile];

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
      content: getStarterTemplateArtifact(title, allFiles),
      annotations: ['hidden'],
    },
  ];
}

function getStarterTemplateArtifact(title: string, filesToImport: RepoFile[]): string {
  return `
<liblabArtifact id="imported-files" title="${title}" type="bundled">
${filesToImport
  .map(
    (file) =>
      `<liblabAction type="file" filePath="${file.path}">
${file.content}
</liblabAction>`,
  )
  .join('\n')}
<liblabAction type="shell">pnpm install</liblabAction>
</liblabArtifact>
`;
}
