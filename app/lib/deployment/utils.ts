import { prisma } from '~/lib/prisma';

function generateSlug(text: string): string {
  let slug = text.toLowerCase().replace(/\s+/g, '-');
  slug = slug.replace(/[^a-z0-9-]/g, '');
  slug = slug.replace(/^-+|-+$/g, '');

  return slug.slice(0, 8);
}

function generateSiteName(chatId: string, length: number = 12): string {
  const shortId = chatId.slice(0, length);
  return `liblab-${shortId}`;
}

export async function generateUniqueSiteName(chatId: string): Promise<string> {
  const MAX_ATTEMPTS = 12;
  let counter = 1;
  let siteName = generateSiteName(chatId);

  while (counter <= MAX_ATTEMPTS) {
    const existingWebsite = await prisma.website.findFirst({
      where: {
        siteName,
      },
    });

    if (!existingWebsite) {
      return siteName;
    }

    const baseLength = 12 - `${counter}`.length;
    siteName = generateSiteName(chatId, baseLength) + `-${counter}`;
    counter++;
  }

  throw new Error('Maximum number of site name generation attempts reached');
}

export function generateDeploymentAlias(description: string | undefined, chatId: string): string {
  return description ? generateSlug(description) : `${chatId.slice(0, 6)}`;
}
