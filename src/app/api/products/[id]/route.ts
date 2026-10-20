import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ensureDatabase } from '@/lib/bootstrap'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { firstIssue, badRequest } from '@/lib/api-helpers'

const productUpdateSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(80).optional(),
  price: z
    .number({ message: 'Precio inválido.' })
    .int('Precio inválido.')
    .min(1, 'El precio debe ser mayor a cero.')
    .max(100_000_000, 'Precio demasiado alto.')
    .optional(),
  categoryId: z.string().trim().nullable().optional(),
  active: z.boolean().optional(),
})

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const g = await requireAdmin()
  if (g.error) return g.error
  await ensureDatabase()
  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  const parsed = productUpdateSchema.safeParse(body)
  if (!parsed.success) return badRequest(firstIssue(parsed.error))
  const data = parsed.data

  const product = await db.product.findUnique({ where: { id } })
  if (!product) return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 })

  if (data.categoryId) {
    const cat = await db.category.findUnique({ where: { id: data.categoryId } })
    if (!cat) return badRequest('La categoría seleccionada no existe.')
  }

  if (data.name && data.name !== product.name) {
    const dup = await db.product.findFirst({ where: { name: data.name, id: { not: id } } })
    if (dup) return NextResponse.json({ error: `El producto "${data.name}" ya existe.` }, { status: 409 })
  }

  const updated = await db.product.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.price !== undefined && { price: data.price }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId || null }),
      ...(data.active !== undefined && { active: data.active }),
    },
    include: { category: true },
  })
  return NextResponse.json({ product: updated })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const g = await requireAdmin()
  if (g.error) return g.error
  await ensureDatabase()
  const { id } = await ctx.params

  const product = await db.product.findUnique({ where: { id } })
  if (!product) return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 })

  // Las ventas históricas conservan el snapshot del ítem (productId queda en null)
  await db.product.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
