import 'dotenv/config'
import { defineConfig } from 'prisma/config'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'bun prisma/seed.ts',
  },
  migrate: {
    // Permite ejecutar `prisma db push` / `migrate` directamente contra Turso
    adapter: async () => {
      return new PrismaLibSQL({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN,
      })
    },
  },
})
