import { PrismaClient } from '@prisma/client';
import env from './env.js';

const globalForPrisma = globalThis;

const createPrismaClient = () =>
  new PrismaClient({
    log: env.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

let prisma = globalForPrisma.prisma ?? createPrismaClient();

// After `prisma generate`, nodemon may reload routes while globalThis still holds an old client.
const isStaleClient =
  typeof prisma.gymChatMessage?.findMany !== 'function' ||
  typeof prisma.supportTicket?.create !== 'function';

if (env.nodeEnv !== 'production' && isStaleClient) {
  prisma.$disconnect().catch(() => {});
  prisma = createPrismaClient();
  globalForPrisma.prisma = prisma;
} else if (env.nodeEnv !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
