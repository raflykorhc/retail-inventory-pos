import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.$queryRaw`SELECT 1`.then(() => process.exit(0)).catch(() => process.exit(1));
