/**
 * Utilidades de dinero. Todos los importes se manejan en céntimos (Int)
 * para evitar errores de redondeo de punto flotante.
 */

/** Formato venezolano: "Bs. 1.234,56" */
export function formatBs(cents: number, currency = 'Bs.'): string {
  const abs = Math.abs(Math.round(cents))
  const int = Math.floor(abs / 100)
  const dec = String(abs % 100).padStart(2, '0')
  const intStr = String(int).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const sign = cents < 0 ? '-' : ''
  return `${currency} ${sign}${intStr},${dec}`
}

/** Solo la parte numérica: "1.234,56" */
export function formatAmount(cents: number): string {
  return formatBs(cents, '').trim()
}

/**
 * Convierte texto de precio a céntimos. Acepta "1.234,56", "1234.56", "1234", "1234,5".
 * Devuelve null si no es válido.
 */
export function parseBsToCents(raw: string): number | null {
  let s = raw.trim().replace(/[^\d.,]/g, '')
  if (!s) return null
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma > -1 && lastDot > -1) {
    // El último separador que aparece es el decimal
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.')
    } else {
      s = s.replace(/,/g, '')
    }
  } else if (lastComma > -1) {
    const decimals = s.length - lastComma - 1
    if (decimals === 3 && /^\d{1,3}(,\d{3})+$/.test(s)) {
      s = s.replace(/,/g, '') // separador de miles
    } else {
      s = s.replace(',', '.')
    }
  } else if (lastDot > -1) {
    const decimals = s.length - lastDot - 1
    if (decimals === 3 && /^\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, '') // separador de miles
    }
  }
  const n = Number(s)
  if (!isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}
