import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ensureDatabase } from '@/lib/bootstrap'
import { db } from '@/lib/db'
import { requireAdmin, requireAuth } from '@/lib/auth'
import { firstIssue, badRequest } from '@/lib/api-helpers'

const productCreateSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(80, 'Nombre demasiado largo.'),
  price: z
    .number({ message: 'Precio inválido.' })
    .int('Precio inválido.')
    .min(1, 'El precio debe ser mayor a cero.')
    .max(100_000_000, 'Precio demasiado alto.'),
  categoryId: z.string().trim().nullable().optional(),
  active: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const g = await requireAuth()
  if (g.error) return g.error
  await ensureDatabase()

  const includeInactive = req.nextUrl.searchParams.get('includeInactive') === '1' && g.session.role === 'ADMIN'
  const products = await db.product.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: [{ name: 'asc' }],
    include: { category: true },
  })
  return NextResponse.json({ products })
}

export async function POST(req: NextRequest) {
  const g = await requireAdmin()
  if (g.error) return g.error
  await ensureDatabase()
  const body = await req.json().catch(() => null)
  const parsed = productCreateSchema.safeParse(body)
  if (!parsed.success) return badRequest(firstIssue(parsed.error))
  const { name, price, categoryId = null, active = true } = parsed.data

  if (categoryId) {
    const cat = await db.category.findUnique({ where: { id: categoryId } })
    if (!cat) return badRequest('La categoría seleccionada no existe.')
  }

  const dup = await db.product.findFirst({ where: { name } })
  if (dup) return NextResponse.json({ error: `El producto "${name}" ya existe.` }, { status: 409 })

  const product = await db.product.create({
    data: { name, price, categoryId, active },
    include: { category: true },
  })
  return NextResponse.json({ product }, { status: 201 })
}
