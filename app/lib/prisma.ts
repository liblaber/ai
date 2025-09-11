import { PrismaClient } from '@prisma/client';
import { env } from '~/env/server';

declare global {
  var prisma: PrismaClient;
}

export const prisma = global.prisma || new PrismaClient();

export type PrismaTransaction = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

if (env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
