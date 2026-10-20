import { redirect } from 'next/navigation'
import { ensureDatabase } from '@/lib/bootstrap'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { AppShell } from '@/components/app-shell'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  await ensureDatabase()
  const user = await db.user.findUnique({ where: { id: session.userId } })
  if (!user || !user.active) {
    // Cuenta eliminada o desactivada por el administrador
    redirect('/login?desactivado=1')
  }

  return (
    <AppShell
      user={{ id: user.id, username: user.username, name: user.name, role: user.role }}
    >
      {children}
    </AppShell>
  )
}
