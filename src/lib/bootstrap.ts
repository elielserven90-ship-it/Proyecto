import { createClient } from '@libsql/client'
import { db } from './db'
import { hashPassword } from './hash'

/**
 * Bootstrap de la base de datos.
 * Garantiza que el esquema y los datos iniciales existan en Turso (o SQLite local).
 * Se ejecuta UNA sola vez por proceso; las siguientes llamadas resuelven al instante.
 * Esto permite desplegar a Vercel sin ejecutar migraciones manualmente:
 * basta con definir TURSO_DATABASE_URL y TURSO_AUTH_TOKEN.
 */

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VENDEDOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "categoryId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Sale" (
    "number" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "customerName" TEXT,
    "orderType" TEXT NOT NULL DEFAULT 'LLEVAR',
    "paymentMethod" TEXT NOT NULL,
    "paymentRef" TEXT,
    "cashReceived" INTEGER,
    "changeGiven" INTEGER,
    "subtotal" INTEGER NOT NULL,
    "taxRate" INTEGER NOT NULL,
    "tax" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETADA',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sale_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "SaleItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" INTEGER NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("number") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE IF NOT EXISTS "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "Category"("name");
`

async function seedDefaults() {
  // Superadmin
  const adminExists = await db.user.findUnique({ where: { username: 'admin' } })
  if (!adminExists) {
    await db.user.create({
      data: {
        username: 'admin',
        password: hashPassword('admin'),
        name: 'Administrador',
        role: 'ADMIN',
        active: true,
      },
    })
    console.log('[bootstrap] Superadmin creado: admin / admin')
  }

  // Categorías
  const catNames = ['Comidas', 'Bebidas', 'Postres']
  const cats: Record<string, string> = {}
  for (const name of catNames) {
    const c = await db.category.upsert({ where: { name }, update: {}, create: { name } })
    cats[name] = c.id
  }

  // Productos iniciales (precios en céntimos)
  const productos = [
    { name: 'Empanada', price: 5000, categoryId: cats['Comidas'] },
    { name: 'Arepa', price: 7000, categoryId: cats['Comidas'] },
    { name: 'Refresco', price: 3000, categoryId: cats['Bebidas'] },
    { name: 'Pastelito', price: 4000, categoryId: cats['Comidas'] },
    { name: 'Pastel', price: 9000, categoryId: cats['Postres'] },
  ]
  for (const p of productos) {
    const exists = await db.product.findFirst({ where: { name: p.name } })
    if (!exists) await db.product.create({ data: p })
  }
  console.log('[bootstrap] Productos iniciales verificados')

  // Ajustes del negocio
  const settings: Record<string, string> = {
    businessName: 'Cantina UPTPC',
    businessTagline: 'Universidad Politécnica Territorial de Puerto Cabello',
    address:
      'Zona Industrial Santa Rosa, Circuito Comunal 8, Parroquia Juan José Flores, Puerto Cabello, Edo. Carabobo',
    rif: 'G-20005608-8',
    taxRate: '16',
    currency: 'Bs.',
  }
  for (const [key, value] of Object.entries(settings)) {
    await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
  }
  console.log('[bootstrap] Ajustes iniciales verificados')
}

async function init(): Promise<void> {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const client = tursoUrl
    ? createClient({ url: tursoUrl, authToken: process.env.TURSO_AUTH_TOKEN })
    : createClient({ url: process.env.DATABASE_URL || 'file:db/pos.db' })

  const rs = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='User'")
  if (rs.rows.length === 0) {
    console.log('[bootstrap] Esquema no existe — creando tablas…')
    await client.executeMultiple(SCHEMA_SQL)
    await seedDefaults()
    console.log('[bootstrap] Base de datos inicializada ✅')
  } else {
    // El esquema existe; igualmente garantiza datos mínimos (idempotente y barato)
    await seedDefaults()
  }
}

let ready: Promise<void> | null = null

export function ensureDatabase(): Promise<void> {
  if (!ready) {
    ready = init().catch((e) => {
      ready = null // permitir reintento si falla
      throw e
    })
  }
  return ready
}
