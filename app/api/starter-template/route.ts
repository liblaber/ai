import type { FileMap } from '~/lib/.server/llm/constants';
import { StarterPluginManager } from '~/lib/plugins/starter/starter-plugin-manager';
import { StarterNotAvailableError, StarterNotFoundError } from '~/lib/plugins/starter/errors';
import { logger } from '~/utils/logger';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const files: FileMap = await StarterPluginManager.getStarterFileMap();

    return NextResponse.json({ files });
  } catch (error) {
    logger.error('Error reading starter template:', error);

    if (error instanceof StarterNotAvailableError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof StarterNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to read starter template' }, { status: 500 });
  }
}
