import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ensureDatabase } from '@/lib/bootstrap'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { firstIssue, badRequest } from '@/lib/api-helpers'
import { DEFAULT_SETTINGS, type SettingsMap } from '@/lib/constants'

const saleCreateSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Producto inválido.'),
        quantity: z.number({ message: 'Cantidad inválida.' }).int('Cantidad inválida.').min(1, 'Cantidad mínima: 1.').max(999, 'Cantidad máxima: 999.'),
      }),
    )
    .min(1, 'El pedido no puede estar vacío.')
    .max(100, 'Demasiados artículos en el pedido.'),
  customerName: z.string().trim().max(80, 'Nombre demasiado largo.').optional().nullable(),
  orderType: z.enum(['SALON', 'LLEVAR']).default('LLEVAR'),
  paymentMethod: z.enum(['EFECTIVO', 'PUNTO', 'PAGO_MOVIL'], { message: 'Método de pago inválido.' }),
  paymentRef: z.string().trim().max(40).optional().nullable(),
  cashReceived: z.number({ message: 'Monto recibido inválido.' }).int().min(0).optional().nullable(),
})

export async function GET(req: NextRequest) {
  const g = await requireAuth()
  if (g.error) return g.error
  await ensureDatabase()

  const sp = req.nextUrl.searchParams
  const method = sp.get('method') || undefined
  const status = sp.get('status') || undefined
  const q = sp.get('q')?.trim()
  const mine = sp.get('mine') === '1'
  const from = sp.get('from') // ISO local
  const to = sp.get('to') // ISO local
  const limit = Math.min(Number(sp.get('limit')) || 300, 1000)

  const where: Record<string, unknown> = {}
  if (method) where.paymentMethod = method
  if (status) where.status = status
  if (mine) where.userId = g.session.userId
  if (from || to) {
    where.createdAt = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    }
  }
  if (q) {
    const asNumber = Number(q.replace(/\D/g, ''))
    if (q.startsWith('#') || (!isNaN(asNumber) && asNumber > 0)) {
      where.OR = [{ number: asNumber }, { customerName: { contains: q } }]
    } else {
      where.customerName = { contains: q }
    }
  }

  const sales = await db.sale.findMany({
    where,
    orderBy: { number: 'desc' },
    take: limit,
    include: {
      user: { select: { name: true, username: true } },
      items: { select: { quantity: true, name: true, price: true, subtotal: true } },
    },
  })
  return NextResponse.json({ sales })
}

export async function POST(req: NextRequest) {
  const g = await requireAuth()
  if (g.error) return g.error
  await ensureDatabase()
  const body = await req.json().catch(() => null)
  const parsed = saleCreateSchema.safeParse(body)
  if (!parsed.success) return badRequest(firstIssue(parsed.error))
  const data = parsed.data

  // Cargar productos y validar
  const ids = data.items.map((i) => i.productId)
  const products = await db.product.findMany({ where: { id: { in: ids }, active: true } })
  const byId = new Map(products.map((p) => [p.id, p]))
  for (const item of data.items) {
    const p = byId.get(item.productId)
    if (!p) return badRequest('Uno de los productos no existe o está inactivo. Actualice la página.')
  }

  // Construir snapshot de ítems y totales (los precios SIEMPRE se calculan en el servidor)
  const saleItems = data.items.map((i) => {
    const p = byId.get(i.productId)!
    return { productId: p.id, name: p.name, price: p.price, quantity: i.quantity, subtotal: p.price * i.quantity }
  })
  const subtotal = saleItems.reduce((acc, i) => acc + i.subtotal, 0)

  const settingsRows = await db.setting.findMany()
  const settings: SettingsMap = { ...DEFAULT_SETTINGS }
  for (const row of settingsRows) settings[row.key] = row.value
  const taxRate = Math.min(Math.max(parseInt(settings.taxRate, 10) || 0, 0), 50)
  const tax = Math.round((subtotal * taxRate) / 100)
  const total = subtotal + tax

  // Validación del pago
  let cashReceived: number | null = null
  let changeGiven: number | null = null
  if (data.paymentMethod === 'EFECTIVO') {
    if (!data.cashReceived || data.cashReceived < total) {
      return badRequest('El monto recibido debe ser mayor o igual al total de la venta.')
    }
    cashReceived = data.cashReceived
    changeGiven = cashReceived - total
  }

  const sale = await db.$transaction(async (tx) => {
    return tx.sale.create({
      data: {
        userId: g.session.userId,
        customerName: data.customerName || null,
        orderType: data.orderType,
        paymentMethod: data.paymentMethod,
        paymentRef: data.paymentRef || null,
        cashReceived,
        changeGiven,
        subtotal,
        taxRate,
        tax,
        total,
        status: 'COMPLETADA',
        items: { create: saleItems },
      },
      include: {
        user: { select: { name: true, username: true } },
        items: true,
      },
    })
  })

  return NextResponse.json({ sale }, { status: 201 })
}
