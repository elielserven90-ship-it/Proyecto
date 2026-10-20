/** Tipos compartidos entre vistas (espejo de las respuestas de la API) */

export interface SaleItemRow {
  id: string
  name: string
  price: number
  quantity: number
  subtotal: number
}

export interface SaleRow {
  number: number
  customerName: string | null
  orderType: string
  paymentMethod: string
  paymentRef: string | null
  cashReceived: number | null
  changeGiven: number | null
  subtotal: number
  taxRate: number
  tax: number
  total: number
  status: string
  createdAt: string
  user: { name: string; username: string }
  items: SaleItemRow[]
}

export interface UserRow {
  id: string
  username: string
  name: string
  role: string
  active: boolean
  createdAt: string
  salesCount?: number
}

export interface ProductAdminRow {
  id: string
  name: string
  price: number
  active: boolean
  category: { id: string; name: string } | null
}

export interface CategoryRow {
  id: string
  name: string
  productsCount: number
}
