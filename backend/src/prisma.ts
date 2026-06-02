import { PrismaClient } from '@prisma/client'

process.env.DATABASE_URL ??= 'postgresql://mysterion:mysterion@localhost:5432/mysterionplay'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

export const prisma = globalThis.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}
