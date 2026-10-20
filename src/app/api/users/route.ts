import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ensureDatabase } from '@/lib/bootstrap'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { hashPassword } from '@/lib/hash'
import { firstIssue } from '@/lib/api-helpers'

const userCreateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'El usuario debe tener al menos 3 caracteres.')
    .max(24, 'El usuario no puede exceder 24 caracteres.')
    .regex(/^[a-z0-9._-]+$/, 'El usuario solo admite letras, números, punto, guion y guion bajo.'),
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(80, 'Nombre demasiado largo.'),
  password: z.string().min(4, 'La contraseña debe tener al menos 4 caracteres.').max(64, 'Contraseña demasiado larga.'),
  role: z.enum(['ADMIN', 'VENDEDOR'], { message: 'Rol inválido.' }),
  active: z.boolean().optional(),
})

export async function GET() {
  const g = await requireAdmin()
  if (g.error) return g.error
  await ensureDatabase()
  const users = await db.user.findMany({
    orderBy: { username: 'asc' },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
      _count: { select: { sales: true } },
    },
  })
  return NextResponse.json({ users })
}

export async function POST(req: NextRequest) {
  const g = await requireAdmin()
  if (g.error) return g.error
  await ensureDatabase()
  const body = await req.json().catch(() => null)
  const parsed = userCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })
  }
  const { username, name, password, role, active = true } = parsed.data

  const exists = await db.user.findUnique({ where: { username } })
  if (exists) {
    return NextResponse.json({ error: `El usuario "${username}" ya existe.` }, { status: 409 })
  }

  const user = await db.user.create({
    data: { username, name, password: hashPassword(password), role, active },
    select: { id: true, username: true, name: true, role: true, active: true, createdAt: true },
  })
  return NextResponse.json({ user }, { status: 201 })
}
