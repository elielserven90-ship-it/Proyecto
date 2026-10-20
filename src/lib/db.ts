import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Cliente Prisma con adaptador libSQL.
 * - Si TURSO_DATABASE_URL está definida → usa Turso remoto (producción/Vercel).
 * - Si no → usa SQLite local vía DATABASE_URL (desarrollo sin Turso).
 */
function createDb(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  if (tursoUrl) {
    const adapter = new PrismaLibSQL({
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    return new PrismaClient({ adapter })
  }
  return new PrismaClient()
}

export const db = globalForPrisma.prisma ?? createDb()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
