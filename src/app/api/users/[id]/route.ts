import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ensureDatabase } from '@/lib/bootstrap'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { hashPassword } from '@/lib/hash'
import { firstIssue, badRequest } from '@/lib/api-helpers'

const userUpdateSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(80).optional(),
  role: z.enum(['ADMIN', 'VENDEDOR']).optional(),
  active: z.boolean().optional(),
  password: z.string().min(4, 'La contraseña debe tener al menos 4 caracteres.').max(64).optional(),
})

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const g = await requireAdmin()
  if (g.error) return g.error
  await ensureDatabase()
  const { id } = await ctx.params
  const body = await req.json().catch(() => null)
  const parsed = userUpdateSchema.safeParse(body)
  if (!parsed.success) return badRequest(firstIssue(parsed.error))
  const data = parsed.data

  const target = await db.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })

  // Protección: no auto-degradarse ni auto-desactivarse
  if (target.id === g.session.userId) {
    if (data.active === false) return badRequest('No puedes desactivar tu propia cuenta.')
    if (data.role && data.role !== 'ADMIN') return badRequest('No puedes cambiar tu propio rol de administrador.')
  }

  // Protección: siempre debe existir un administrador activo
  if (target.role === 'ADMIN' && target.active) {
    const losingAdmin =
      (data.active === false && target.id !== g.session.userId) ||
      (data.role === 'VENDEDOR' && target.id !== g.session.userId)
    if (losingAdmin) {
      const otherAdmins = await db.user.count({
        where: { role: 'ADMIN', active: true, id: { not: target.id } },
      })
      if (otherAdmins === 0) return badRequest('Debe existir al menos un administrador activo en el sistema.')
    }
  }

  const updated = await db.user.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.role !== undefined && { role: data.role }),
      ...(data.active !== undefined && { active: data.active }),
      ...(data.password !== undefined && { password: hashPassword(data.password) }),
    },
    select: { id: true, username: true, name: true, role: true, active: true, createdAt: true },
  })
  return NextResponse.json({ user: updated })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const g = await requireAdmin()
  if (g.error) return g.error
  await ensureDatabase()
  const { id } = await ctx.params

  const target = await db.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 })

  if (target.id === g.session.userId) {
    return badRequest('No puedes eliminar tu propia cuenta.')
  }

  if (target.role === 'ADMIN' && target.active) {
    const otherAdmins = await db.user.count({
      where: { role: 'ADMIN', active: true, id: { not: id } },
    })
    if (otherAdmins === 0) return badRequest('No puedes eliminar al último administrador activo.')
  }

  const salesCount = await db.sale.count({ where: { userId: id } })
  if (salesCount > 0) {
    return NextResponse.json(
      {
        error: `El usuario tiene ${salesCount} venta(s) registradas y no puede eliminarse. Desactívelo en su lugar.`,
      },
      { status: 409 },
    )
  }

  await db.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
