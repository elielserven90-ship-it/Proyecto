import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

/**
 * Hash de contraseñas con scrypt (nativo de Node, sin dependencias).
 * Formato almacenado: scrypt:<salt hex>:<hash hex>
 */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(plain, salt, 64).toString('hex')
  return `scrypt:${salt}:${hash}`
}

export function verifyPassword(plain: string, stored: string): boolean {
  try {
    const [scheme, salt, hash] = stored.split(':')
    if (scheme !== 'scrypt' || !salt || !hash) return false
    const candidate = scryptSync(plain, salt, 64)
    const expected = Buffer.from(hash, 'hex')
    return candidate.length === expected.length && timingSafeEqual(candidate, expected)
  } catch {
    return false
  }
}
