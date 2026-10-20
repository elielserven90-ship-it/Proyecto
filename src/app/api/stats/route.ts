import { NextRequest, NextResponse } from 'next/server'
import { ensureDatabase } from '@/lib/bootstrap'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

/**
 * Estadísticas para el panel de administración.
 * Las fechas se calculan en el CLIENTE (zona horaria de Venezuela) y llegan como ISO:
 *  - todayFrom: inicio del día local
 *  - monthFrom: inicio del mes local
 *  - rangeFrom: hace 30 días
 */
export async function GET(req: NextRequest) {
  const g = await requireAdmin()
  if (g.error) return g.error
  await ensureDatabase()

  const sp = req.nextUrl.searchParams
  const todayFrom = sp.get('todayFrom')
  const monthFrom = sp.get('monthFrom')
  const rangeFrom = sp.get('rangeFrom')

  const parse = (v: string | null, fallbackMs: number) => {
    if (v) {
      const d = new Date(v)
      if (!isNaN(d.getTime())) return d
    }
    return new Date(fallbackMs)
  }

  const t0 = parse(todayFrom, Date.now() - 24 * 3600e3)
  const m0 = parse(monthFrom, Date.now() - 30 * 24 * 3600e3)
  const r0 = parse(rangeFrom, Date.now() - 30 * 24 * 3600e3)

  const [salesRange, usersActive, productsActive, categoriesCount, recentSales] = await Promise.all([
    db.sale.findMany({
      where: { status: 'COMPLETADA', createdAt: { gte: r0 } },
      include: { items: { select: { name: true, quantity: true, subtotal: true } } },
    }),
    db.user.count({ where: { active: true } }),
    db.product.count({ where: { active: true } }),
    db.category.count(),
    db.sale.findMany({
      orderBy: { number: 'desc' },
      take: 6,
      include: { user: { select: { name: true } }, items: { select: { quantity: true } } },
    }),
  ])

  const todaySales = salesRange.filter((s) => s.createdAt >= t0)
  const monthSales = salesRange.filter((s) => s.createdAt >= m0)

  const sum = (arr: { total: number }[]) => arr.reduce((a, s) => a + s.total, 0)
  const todayRevenue = sum(todaySales)
  const monthRevenue = sum(monthSales)

  const byMethod: Record<string, { count: number; total: number }> = {
    EFECTIVO: { count: 0, total: 0 },
    PUNTO: { count: 0, total: 0 },
    PAGO_MOVIL: { count: 0, total: 0 },
  }
  for (const s of todaySales) {
    if (byMethod[s.paymentMethod]) {
      byMethod[s.paymentMethod].count += 1
      byMethod[s.paymentMethod].total += s.total
    }
  }

  // Top productos (30 días)
  const byProduct = new Map<string, { name: string; quantity: number; revenue: number }>()
  for (const s of salesRange) {
    for (const item of s.items) {
      const key = item.name
      const prev = byProduct.get(key) || { name: item.name, quantity: 0, revenue: 0 }
      prev.quantity += item.quantity
      prev.revenue += item.subtotal
      byProduct.set(key, prev)
    }
  }
  const topProducts = [...byProduct.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 6)

  return NextResponse.json({
    today: { count: todaySales.length, revenue: todayRevenue },
    month: { count: monthSales.length, revenue: monthRevenue },
    byMethod,
    topProducts,
    recentSales: recentSales.map((s) => ({
      number: s.number,
      total: s.total,
      status: s.status,
      createdAt: s.createdAt,
      seller: s.user.name,
      itemCount: s.items.reduce((a, i) => a + i.quantity, 0),
    })),
    counts: { usersActive, productsActive, categoriesCount },
  })
}
