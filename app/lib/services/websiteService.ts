import { prisma } from '~/lib/prisma';
import { PermissionAction, PermissionResource, Prisma } from '@prisma/client';
import { buildResourceWhereClause } from '@/lib/casl/prisma-helpers';
import type { AppAbility } from '~/lib/casl/user-ability';

export interface Website {
  id: string;
  siteId: string | null;
  siteName: string | null;
  siteUrl: string | null;
  chatId: string;
  isPublic: boolean;
  createdById: string;
  environmentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function getWebsites(userAbility: AppAbility): Promise<Website[]> {
  const whereClause = buildResourceWhereClause(
    userAbility,
    PermissionAction.read,
    PermissionResource.Website,
  ) as Prisma.WebsiteWhereInput;

  return prisma.website.findMany({
    where: whereClause,
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function getWebsite(id: string): Promise<Website | null> {
  return prisma.website.findUniqueOrThrow({
    where: { id },
  });
}

export async function createWebsite(data: {
  chatId: string;
  createdById: string;
  siteId?: string;
  siteName?: string;
  siteUrl?: string;
}) {
  return prisma.website.create({
    data: {
      chatId: data.chatId,
      createdById: data.createdById,
      siteId: data.siteId || '',
      siteName: data.siteName || '',
      siteUrl: data.siteUrl || '',
    },
  });
}

export async function updateWebsite(id: string, data: { siteName: string }): Promise<Website | null> {
  const website = await prisma.website.update({
    where: { id },
    data,
  });

  return website;
}

export async function deleteWebsite(id: string): Promise<Website | null> {
  const website = await prisma.website.delete({
    where: { id },
  });

  return website;
}
