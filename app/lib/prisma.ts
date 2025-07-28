import { PrismaClient } from '@prisma/client';
import { env } from '~/lib/config/env';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient;
}

export const prisma = global.prisma || new PrismaClient();

if (env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
