'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { PaymentDialog } from '@/components/pos/payment-dialog'
import { ReceiptDialog } from '@/components/pos/receipt-dialog'
import { formatBs } from '@/lib/money'
import type { SaleRow } from '@/lib/types'
import { DEFAULT_SETTINGS } from '@/lib/constants'
import {
  Coffee,
  CupSoda,
  Croissant,
  CakeSlice,
  Loader2,
  Minus,
  Package,
  Plus,
  ReceiptText,
  Search,
  ShoppingBag,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'

export interface ProductRow {
  id: string
  name: string
  price: number
  active: boolean
  category: { id: string; name: string } | null
}

export interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
}

interface Props {
  taxRate: number
  currency: string
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Comidas: Coffee,
  Bebidas: CupSoda,
  Postres: CakeSlice,
  Dulces: Croissant,
}

function categoryIcon(name?: string | null) {
  return CATEGORY_ICONS[name || ''] || Package
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Error al cargar los datos.')
  }
  return res.json()
}

export function PosView({ taxRate, currency }: Props) {
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState<string>('all')
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderType, setOrderType] = useState<'SALON' | 'LLEVAR'>('LLEVAR')
  const [customerName, setCustomerName] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const [lastSale, setLastSale] = useState<SaleRow | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['products', 'pos'],
    queryFn: () => fetchJson<{ products: ProductRow[] }>('/api/products'),
  })

  const categories = useMemo(() => {
    const set = new Map<string, string>()
    for (const p of products?.products || []) {
      if (p.category) set.set(p.category.id, p.category.name)
    }
    return [...set.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [products])

  const filtered = useMemo(() => {
    const list = products?.products || []
    const q = search.trim().toLowerCase()
    return list.filter((p) => {
      if (activeCat === 'all') return q ? p.name.toLowerCase().includes(q) : true
      if (p.category?.id !== activeCat) return false
      return q ? p.name.toLowerCase().includes(q) : true
    })
  }, [products, search, activeCat])

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; items: ProductRow[] }>()
    for (const p of filtered) {
      const key = p.category?.id || 'sin'
      const label = p.category?.name || 'Sin categoría'
      if (!map.has(key)) map.set(key, { name: label, items: [] })
      map.get(key)!.items.push(p)
    }
    return [...map.values()]
  }, [filtered])

  const subtotal = cart.reduce((a, i) => a + i.price * i.quantity, 0)
  const tax = Math.round((subtotal * taxRate) / 100)
  const total = subtotal + tax
  const itemCount = cart.reduce((a, i) => a + i.quantity, 0)

  function addToCart(p: ProductRow) {
    setCart((prev) => {
      const found = prev.find((i) => i.productId === p.id)
      if (found) {
        return prev.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i))
      }
      return [...prev, { productId: p.id, name: p.name, price: p.price, quantity: 1 }]
    })
  }

  function changeQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0),
    )
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((i) => i.productId !== productId))
  }

  function clearCart() {
    setCart([])
    setCustomerName('')
  }

  const cartPanel = (
    <CartPanelContent
      cart={cart}
      subtotal={subtotal}
      tax={tax}
      taxRate={taxRate}
      total={total}
      currency={currency}
      orderType={orderType}
      setOrderType={setOrderType}
      customerName={customerName}
      setCustomerName={setCustomerName}
      changeQty={changeQty}
      removeItem={removeItem}
      onCharge={() => {
        if (cart.length === 0) {
          toast.error('Agregue al menos un producto al pedido.')
          return
        }
        setSheetOpen(false)
        setPayOpen(true)
      }}
      onClear={() => {
        clearCart()
        toast.info('Pedido vaciado.')
      }}
    />
  )

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-4 items-start">
      {/* ── Productos ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scroll-area-thin">
            <Button
              size="sm"
              variant={activeCat === 'all' ? 'default' : 'outline'}
              className="shrink-0"
              onClick={() => setActiveCat('all')}
            >
              Todos
            </Button>
            {categories.map((c) => (
              <Button
                key={c.id}
                size="sm"
                variant={activeCat === c.id ? 'default' : 'outline'}
                className="shrink-0"
                onClick={() => setActiveCat(c.id)}
              >
                {c.name}
              </Button>
            ))}
          </div>
        </div>

        {loadingProducts ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Cargando productos…
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
              No hay productos que coincidan.
              {products?.products.length === 0 && (
                <p className="text-sm mt-1">El administrador puede crear productos en Administración → Productos.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          grouped.map((group) => {
            const Icon = categoryIcon(group.name)
            return (
              <section key={group.name}>
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground mb-2">
                  <Icon className="h-4 w-4" /> {group.name}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                  {group.items.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addToCart(p)}
                      className="group text-left rounded-xl border bg-card p-3 shadow-sm transition-all hover:border-primary hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[88px] flex flex-col"
                      aria-label={`Agregar ${p.name} al pedido`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-medium text-sm leading-tight">{p.name}</span>
                        <span className="rounded-full bg-primary/10 p-1 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                          <Plus className="h-3.5 w-3.5" />
                        </span>
                      </div>
                      <span className="mt-auto pt-2 font-bold text-primary">
                        {formatBs(p.price, currency)}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )
          })
        )}
      </div>

      {/* ── Carrito (desktop) ─────────────────────────────────── */}
      <Card className="hidden lg:block sticky top-20 shadow-md border-blue-100 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-4 w-4" /> Pedido actual
            {itemCount > 0 && <Badge className="ml-auto">{itemCount}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">{cartPanel}</CardContent>
      </Card>

      {/* ── Carrito (móvil: barra inferior + sheet) ───────────── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button className="w-full h-12 text-base justify-between px-4" disabled={itemCount === 0}>
              <span className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                {itemCount} artículo{itemCount === 1 ? '' : 's'}
              </span>
              <span className="font-bold">{formatBs(total, currency)}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] flex flex-col">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" /> Pedido actual
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 pb-4 scroll-area-thin">{cartPanel}</div>
          </SheetContent>
        </Sheet>
      </div>

      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        cart={cart}
        subtotal={subtotal}
        tax={tax}
        taxRate={taxRate}
        total={total}
        currency={currency}
        orderType={orderType}
        customerName={customerName}
        onSaleComplete={(sale) => {
          setPayOpen(false)
          clearCart()
          setLastSale(sale)
        }}
      />
      {lastSale && (
        <ReceiptDialog
          sale={lastSale}
          settings={{ ...DEFAULT_SETTINGS, taxRate: String(taxRate), currency }}
          open={!!lastSale}
          onOpenChange={(o) => {
            if (!o) setLastSale(null)
          }}
        />
      )}
    </div>
  )
}

/* ── Panel del carrito (compartido desktop/móvil) ─────────────── */
function CartPanelContent(props: {
  cart: CartItem[]
  subtotal: number
  tax: number
  taxRate: number
  total: number
  currency: string
  orderType: 'SALON' | 'LLEVAR'
  setOrderType: (v: 'SALON' | 'LLEVAR') => void
  customerName: string
  setCustomerName: (v: string) => void
  changeQty: (id: string, d: number) => void
  removeItem: (id: string) => void
  onCharge: () => void
  onClear: () => void
}) {
  const { cart, subtotal, tax, taxRate, total, currency } = props
  return (
    <div className="flex flex-col gap-3">
      {/* Modo de servicio */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={props.orderType === 'SALON' ? 'default' : 'outline'}
          size="sm"
          onClick={() => props.setOrderType('SALON')}
          className="justify-start"
        >
          <UtensilsCrossed className="h-4 w-4" /> Salón
        </Button>
        <Button
          type="button"
          variant={props.orderType === 'LLEVAR' ? 'default' : 'outline'}
          size="sm"
          onClick={() => props.setOrderType('LLEVAR')}
          className="justify-start"
        >
          <ShoppingBag className="h-4 w-4" /> Para llevar
        </Button>
      </div>

      <Input
        placeholder="Nombre del cliente (opcional)"
        value={props.customerName}
        onChange={(e) => props.setCustomerName(e.target.value)}
        maxLength={80}
      />

      {cart.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-8">
          <ReceiptText className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Toque un producto para agregarlo al pedido.
        </div>
      ) : (
        <ScrollArea className="max-h-[38vh] lg:max-h-64 -mx-1 px-1 scroll-area-thin">
          <div className="flex flex-col gap-1.5">
            {cart.map((i) => (
              <div
                key={i.productId}
                className="flex items-center gap-2 rounded-lg border bg-muted/40 px-2.5 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{i.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatBs(i.price, currency)} × {i.quantity} ={' '}
                    <span className="font-semibold text-foreground">{formatBs(i.price * i.quantity, currency)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    aria-label={`Quitar un ${i.name}`}
                    onClick={() => props.changeQty(i.productId, -1)}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-6 text-center text-sm font-semibold">{i.quantity}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    aria-label={`Agregar un ${i.name}`}
                    onClick={() => props.changeQty(i.productId, +1)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    aria-label={`Eliminar ${i.name}`}
                    onClick={() => props.removeItem(i.productId)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Totales */}
      <div className="rounded-lg bg-muted/60 p-3 text-sm flex flex-col gap-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatBs(subtotal, currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">IVA ({taxRate}%)</span>
          <span className="font-medium">{formatBs(tax, currency)}</span>
        </div>
        <div className="flex justify-between border-t pt-1.5 text-base font-bold">
          <span>Total</span>
          <span className="text-primary">{formatBs(total, currency)}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={props.onClear} disabled={cart.length === 0}>
          Vaciar
        </Button>
        <Button className="flex-1 h-11 text-base" onClick={props.onCharge} disabled={cart.length === 0}>
          Cobrar {cart.length > 0 ? formatBs(total, currency) : ''}
        </Button>
      </div>
    </div>
  )
}
