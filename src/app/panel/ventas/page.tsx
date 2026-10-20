import { ensureDatabase } from '@/lib/bootstrap'
import { getSession } from '@/lib/auth'
import { VentasView } from '@/components/ventas/ventas-view'
import { DEFAULT_SETTINGS, type SettingsMap } from '@/lib/constants'
import { db } from '@/lib/db'

export default async function VentasPage() {
  const session = await getSession()
  await ensureDatabase()
  const rows = await db.setting.findMany()
  const settings: SettingsMap = { ...DEFAULT_SETTINGS }
  for (const r of rows) settings[r.key] = r.value
  return (
    <VentasView
      isAdmin={session?.role === 'ADMIN'}
      currency={settings.currency || 'Bs.'}
    />
  )
}
