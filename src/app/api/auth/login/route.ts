import { NextRequest, NextResponse } from 'next/server'
import { ensureDatabase } from '@/lib/bootstrap'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/hash'
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions, type Role } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    await ensureDatabase()
    const body = await req.json().catch(() => null)
    const username = String(body?.username ?? '').trim().toLowerCase()
    const password = String(body?.password ?? '')

    if (!username || !password) {
      return NextResponse.json({ error: 'Ingrese usuario y contraseña.' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { username } })
    if (!user || !user.active || !verifyPassword(password, user.password)) {
      return NextResponse.json(
        { error: 'Credenciales inválidas o usuario inactivo.' },
        { status: 401 },
      )
    }

    const token = await createSessionToken({
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role as Role,
    })

    const res = NextResponse.json({
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
    })
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions)
    return res
  } catch (e) {
    console.error('[login]', e)
    return NextResponse.json({ error: 'Error al iniciar sesión. Intente de nuevo.' }, { status: 500 })
  }
}
