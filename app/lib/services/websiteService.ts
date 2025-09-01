import { prisma } from '~/lib/prisma';
import type { Website } from '@prisma/client';

export async function getWebsite(id: string): Promise<Website | null> {
  return prisma.website.findUnique({
    where: { id },
  });
}
