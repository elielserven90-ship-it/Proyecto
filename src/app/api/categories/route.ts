import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ensureDatabase } from '@/lib/bootstrap'
import { db } from '@/lib/db'
import { requireAdmin, requireAuth } from '@/lib/auth'
import { firstIssue } from '@/lib/api-helpers'

const categorySchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(40, 'Nombre demasiado largo.'),
})

export async function GET() {
  const g = await requireAuth()
  if (g.error) return g.error
  await ensureDatabase()
  const categories = await db.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  })
  return NextResponse.json({ categories })
}

export async function POST(req: NextRequest) {
  const g = await requireAdmin()
  if (g.error) return g.error
  await ensureDatabase()
  const body = await req.json().catch(() => null)
  const parsed = categorySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })

  const name = parsed.data.name
  const exists = await db.category.findUnique({ where: { name } })
  if (exists) return NextResponse.json({ error: `La categoría "${name}" ya existe.` }, { status: 409 })

  const category = await db.category.create({ data: { name } })
  return NextResponse.json({ category }, { status: 201 })
}
