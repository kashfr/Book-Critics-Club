import { PrismaClient } from '@prisma/client';

declare global {
  let prisma: PrismaClient | undefined;
}

if (!process.env.DIRECT_URL) {
  throw new Error('DIRECT_URL environment variable is not set');
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['query', 'error', 'warn'],
    datasources: {
      db: {
        url: process.env.DIRECT_URL
      }
    },
    errorFormat: 'pretty',
  });
};

const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;
