import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ensureDatabase } from '@/lib/bootstrap'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { firstIssue, badRequest } from '@/lib/api-helpers'

const renameSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(40),
})

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const g = await requireAdmin()
  if (g.error) return g.error
  await ensureDatabase()
  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  const parsed = renameSchema.safeParse(body)
  if (!parsed.success) return badRequest(firstIssue(parsed.error))

  const category = await db.category.findUnique({ where: { id } })
  if (!category) return NextResponse.json({ error: 'Categoría no encontrada.' }, { status: 404 })

  const dup = await db.category.findFirst({ where: { name: parsed.data.name, id: { not: id } } })
  if (dup) return NextResponse.json({ error: `La categoría "${parsed.data.name}" ya existe.` }, { status: 409 })

  const updated = await db.category.update({ where: { id }, data: { name: parsed.data.name } })
  return NextResponse.json({ category: updated })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const g = await requireAdmin()
  if (g.error) return g.error
  await ensureDatabase()
  const { id } = await ctx.params

  const category = await db.category.findUnique({ where: { id }, include: { _count: { select: { products: true } } } })
  if (!category) return NextResponse.json({ error: 'Categoría no encontrada.' }, { status: 404 })

  if (category._count.products > 0) {
    return NextResponse.json(
      { error: `La categoría tiene ${category._count.products} producto(s) asignados. Reasígnelos primero.` },
      { status: 409 },
    )
  }

  await db.category.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
