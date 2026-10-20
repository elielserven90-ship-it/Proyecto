import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ensureDatabase } from '@/lib/bootstrap'
import { db } from '@/lib/db'
import { requireAdmin, requireAuth } from '@/lib/auth'
import { firstIssue, badRequest } from '@/lib/api-helpers'

const statusSchema = z.object({
  status: z.enum(['COMPLETADA', 'ANULADA'], { message: 'Estado inválido.' }),
})

type Ctx = { params: Promise<{ id: string }> }

function parseNumber(id: string): number | null {
  const n = Number(id)
  return Number.isInteger(n) && n > 0 ? n : null
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const g = await requireAuth()
  if (g.error) return g.error
  await ensureDatabase()
  const { id } = await ctx.params
  const number = parseNumber(id)
  if (number === null) return badRequest('Número de venta inválido.')

  const sale = await db.sale.findUnique({
    where: { number },
    include: { user: { select: { name: true, username: true } }, items: true },
  })
  if (!sale) return NextResponse.json({ error: 'Venta no encontrada.' }, { status: 404 })
  return NextResponse.json({ sale })
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const g = await requireAdmin()
  if (g.error) return g.error
  await ensureDatabase()
  const { id } = await ctx.params
  const number = parseNumber(id)
  if (number === null) return badRequest('Número de venta inválido.')

  const body = await req.json().catch(() => null)
  const parsed = statusSchema.safeParse(body)
  if (!parsed.success) return badRequest(firstIssue(parsed.error))

  const sale = await db.sale.findUnique({ where: { number } })
  if (!sale) return NextResponse.json({ error: 'Venta no encontrada.' }, { status: 404 })

  const updated = await db.sale.update({
    where: { number },
    data: { status: parsed.data.status },
    include: { user: { select: { name: true, username: true } }, items: true },
  })
  return NextResponse.json({ sale: updated })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const g = await requireAdmin()
  if (g.error) return g.error
  await ensureDatabase()
  const { id } = await ctx.params
  const number = parseNumber(id)
  if (number === null) return badRequest('Número de venta inválido.')

  const sale = await db.sale.findUnique({ where: { number } })
  if (!sale) return NextResponse.json({ error: 'Venta no encontrada.' }, { status: 404 })

  await db.sale.delete({ where: { number } }) // los ítems se eliminan en cascada
  return NextResponse.json({ ok: true })
}
