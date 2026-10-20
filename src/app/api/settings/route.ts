import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ensureDatabase } from '@/lib/bootstrap'
import { db } from '@/lib/db'
import { requireAdmin, requireAuth } from '@/lib/auth'
import { firstIssue } from '@/lib/api-helpers'
import { DEFAULT_SETTINGS, type SettingsMap } from '@/lib/constants'

export async function GET() {
  const g = await requireAuth()
  if (g.error) return g.error
  await ensureDatabase()
  const rows = await db.setting.findMany()
  const settings: SettingsMap = { ...DEFAULT_SETTINGS }
  for (const row of rows) settings[row.key] = row.value
  return NextResponse.json({ settings })
}

const settingsSchema = z.object({
  businessName: z.string().trim().min(2, 'Nombre demasiado corto.').max(60).optional(),
  businessTagline: z.string().trim().max(120).optional(),
  address: z.string().trim().max(200).optional(),
  rif: z.string().trim().max(20).optional(),
  taxRate: z
    .number({ message: 'Tasa de IVA inválida.' })
    .int('La tasa de IVA debe ser un número entero.')
    .min(0, 'La tasa de IVA no puede ser negativa.')
    .max(50, 'La tasa de IVA no puede exceder 50%.')
    .optional(),
  currency: z.string().trim().min(1).max(6).optional(),
})

export async function PUT(req: NextRequest) {
  const g = await requireAdmin()
  if (g.error) return g.error
  await ensureDatabase()
  const body = await req.json().catch(() => null)
  const parsed = settingsSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 })

  const entries = Object.entries(parsed.data).map(([key, value]) => ({
    key,
    value: String(value),
  }))
  for (const { key, value } of entries) {
    await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
  }

  const rows = await db.setting.findMany()
  const settings: SettingsMap = { ...DEFAULT_SETTINGS }
  for (const row of rows) settings[row.key] = row.value
  return NextResponse.json({ settings })
}
