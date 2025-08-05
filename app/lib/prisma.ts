import { PrismaClient } from '@prisma/client';
import { env } from '~/env/server';

declare global {
  var prisma: PrismaClient;
}

export const prisma = global.prisma || new PrismaClient();

if (env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
