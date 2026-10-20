// Seed inicial del sistema POS UPTPC
// Ejecutar: bun prisma/seed.ts  (o npx prisma db push && bun prisma/seed.ts)
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { hashPassword } from '../src/lib/hash'

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

const db = createDb()

async function main() {
  // ── Superadmin ──────────────────────────────────────────────
  await db.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashPassword('admin'),
      name: 'Administrador',
      role: 'ADMIN',
      active: true,
    },
  })
  console.log('✔ Usuario superadmin creado: admin / admin')

  // ── Categorías ──────────────────────────────────────────────
  const comidas = await db.category.upsert({
    where: { name: 'Comidas' },
    update: {},
    create: { name: 'Comidas' },
  })
  const bebidas = await db.category.upsert({
    where: { name: 'Bebidas' },
    update: {},
    create: { name: 'Bebidas' },
  })
  const postres = await db.category.upsert({
    where: { name: 'Postres' },
    update: {},
    create: { name: 'Postres' },
  })

  // ── Productos (precios en céntimos) ────────────────────────
  const productos = [
    { name: 'Empanada', price: 5000, categoryId: comidas.id },
    { name: 'Arepa', price: 7000, categoryId: comidas.id },
    { name: 'Refresco', price: 3000, categoryId: bebidas.id },
    { name: 'Pastelito', price: 4000, categoryId: comidas.id },
    { name: 'Pastel', price: 9000, categoryId: postres.id },
  ]
  for (const p of productos) {
    const exists = await db.product.findFirst({ where: { name: p.name } })
    if (!exists) await db.product.create({ data: p })
  }
  console.log('✔ Productos creados:', productos.map((p) => p.name).join(', '))

  // ── Ajustes del negocio ────────────────────────────────────
  const settings: Record<string, string> = {
    businessName: 'Cantina UPTPC',
    businessTagline: 'Universidad Politécnica Territorial de Puerto Cabello',
    address: 'Zona Industrial Santa Rosa, Circuito Comunal 8, Parroquia Juan José Flores, Puerto Cabello, Edo. Carabobo',
    rif: 'G-20005608-8',
    taxRate: '16',
    currency: 'Bs.',
  }
  for (const [key, value] of Object.entries(settings)) {
    await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
  }
  console.log('✔ Ajustes iniciales configurados')
}

main()
  .then(() => {
    console.log('Seed completado ✅')
    process.exit(0)
  })
  .catch((e) => {
    console.error('Error en seed:', e)
    process.exit(1)
  })
