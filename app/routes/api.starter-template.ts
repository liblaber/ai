import fs from 'fs';
import { json } from '@remix-run/cloudflare';
import { readDirectory, STARTER_DIRECTORY } from '~/lib/starter-instructions.prompt';

export const loader = async () => {
  try {
    if (!fs.existsSync(STARTER_DIRECTORY)) {
      return json({ error: 'Starter template directory not found' }, { status: 404 });
    }

    const files = readDirectory(STARTER_DIRECTORY);

    return json({ files });
  } catch (error) {
    console.error('Error reading starter template:', error);
    return json({ error: 'Failed to read starter template' }, { status: 500 });
  }
};
