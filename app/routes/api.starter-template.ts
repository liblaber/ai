import fs from 'fs';
import { readDirectory, STARTER_DIRECTORY } from '~/lib/starter-instructions.prompt';
import type { FileMap } from '~/lib/.server/llm/constants';

export const loader = async () => {
  try {
    if (!fs.existsSync(STARTER_DIRECTORY)) {
      return Response.json({ error: 'Starter template directory not found' }, { status: 404 });
    }

    const files: FileMap = readDirectory(STARTER_DIRECTORY);

    return Response.json({ files });
  } catch (error) {
    console.error('Error reading starter template:', error);
    return Response.json({ error: 'Failed to read starter template' }, { status: 500 });
  }
};
