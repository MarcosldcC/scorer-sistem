import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://postgres:1234@localhost:5432/robotics_evaluation?schema=public",
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
