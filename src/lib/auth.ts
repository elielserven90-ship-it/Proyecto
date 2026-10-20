import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const SESSION_COOKIE = 'uptpc_session'
export type Role = 'ADMIN' | 'VENDEDOR'

export interface SessionPayload {
  userId: string
  username: string
  name: string
  role: Role
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || process.env.TURSO_AUTH_TOKEN || 'uptpc-pos-dev-secret'
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (typeof payload.userId !== 'string' || typeof payload.username !== 'string') return null
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 7, // 7 días
  path: '/',
}

// ── Guardas para rutas API ─────────────────────────────────────
type Guard = { session: SessionPayload; error?: never } | { session?: never; error: NextResponse }

export async function requireAuth(): Promise<Guard> {
  const session = await getSession()
  if (!session) {
    return { error: NextResponse.json({ error: 'No autenticado. Inicie sesión nuevamente.' }, { status: 401 }) }
  }
  return { session }
}

export async function requireAdmin(): Promise<Guard> {
  const r = await requireAuth()
  if (r.error) return r
  if (r.session.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Solo el administrador puede realizar esta acción.' }, { status: 403 }) }
  }
  return r
}
