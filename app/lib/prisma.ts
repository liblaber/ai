import { PrismaClient } from '@prisma/client';
import { env } from '~/env';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient;
}

export const prisma = global.prisma || new PrismaClient();

if (env.server.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
