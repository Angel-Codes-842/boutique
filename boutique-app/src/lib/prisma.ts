import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

// En serverless (Vercel) cada instancia tiene su propio globalThis: cachear sin
// importar NODE_ENV evita crear múltiples clients dentro de la misma instancia.
globalForPrisma.prisma = prisma
