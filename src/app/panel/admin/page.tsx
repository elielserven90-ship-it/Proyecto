import { redirect } from 'next/navigation'
import { ensureDatabase } from '@/lib/bootstrap'
import { getSession } from '@/lib/auth'
import { AdminView } from '@/components/admin/admin-view'

export default async function AdminPage() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') redirect('/panel/pos')
  await ensureDatabase()
  return <AdminView myId={session.userId} />
}
