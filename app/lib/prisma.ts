import { PrismaClient } from '@prisma/client';
import '~/lib/config/env';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient;
}

export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
