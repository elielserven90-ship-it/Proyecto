import { NextResponse } from 'next/server'
import { ensureDatabase } from '@/lib/bootstrap'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }
  await ensureDatabase()
  const user = await db.user.findUnique({ where: { id: session.userId } })
  if (!user || !user.active) {
    return NextResponse.json({ error: 'Su cuenta fue desactivada por el administrador.' }, { status: 401 })
  }
  return NextResponse.json({
    user: { id: user.id, username: user.username, name: user.name, role: user.role, active: user.active },
  })
}
