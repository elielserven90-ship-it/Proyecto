export const PAYMENT_METHODS = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'PUNTO', label: 'Punto de venta' },
  { value: 'PAGO_MOVIL', label: 'Pago móvil' },
] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value']

export const PAYMENT_LABELS: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  PUNTO: 'Punto de venta',
  PAGO_MOVIL: 'Pago móvil',
}

export const ORDER_TYPES = [
  { value: 'SALON', label: 'Salón' },
  { value: 'LLEVAR', label: 'Para llevar' },
] as const
export type OrderType = (typeof ORDER_TYPES)[number]['value']

export const ORDER_TYPE_LABELS: Record<string, string> = {
  SALON: 'Salón',
  LLEVAR: 'Para llevar',
}

export const ROLES = ['ADMIN', 'VENDEDOR'] as const
export type RoleValue = (typeof ROLES)[number]

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  VENDEDOR: 'Vendedor',
}

export const SALE_STATUS_LABELS: Record<string, string> = {
  COMPLETADA: 'Completada',
  ANULADA: 'Anulada',
}

/** Interfaz de ajustes del negocio (modelo Setting clave/valor) */
export interface SettingsMap {
  businessName: string
  businessTagline: string
  address: string
  rif: string
  taxRate: string
  currency: string
  [key: string]: string
}

export const DEFAULT_SETTINGS: SettingsMap = {
  businessName: 'Cantina UPTPC',
  businessTagline: 'Universidad Politécnica Territorial de Puerto Cabello',
  address: 'Zona Industrial Santa Rosa, Circuito Comunal 8, Parroquia Juan José Flores, Puerto Cabello, Edo. Carabobo',
  rif: 'G-20005608-8',
  taxRate: '16',
  currency: 'Bs.',
}
