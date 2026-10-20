import { ensureDatabase } from '@/lib/bootstrap'
import { db } from '@/lib/db'
import { PosView } from '@/components/pos/pos-view'
import { DEFAULT_SETTINGS, type SettingsMap } from '@/lib/constants'

export default async function PosPage() {
  await ensureDatabase()
  const rows = await db.setting.findMany()
  const settings: SettingsMap = { ...DEFAULT_SETTINGS }
  for (const r of rows) settings[r.key] = r.value
  const taxRate = Math.min(Math.max(parseInt(settings.taxRate, 10) || 0, 0), 50)
  return <PosView taxRate={taxRate} currency={settings.currency || 'Bs.'} />
}
