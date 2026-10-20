'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatBs, parseBsToCents } from '@/lib/money'
import { PAYMENT_LABELS } from '@/lib/constants'
import type { CartItem } from '@/components/pos/pos-view'
import type { SaleRow } from '@/lib/types'
import { Banknote, CreditCard, Loader2, Smartphone, Wallet } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  cart: CartItem[]
  subtotal: number
  tax: number
  taxRate: number
  total: number
  currency: string
  orderType: 'SALON' | 'LLEVAR'
  customerName: string
  onSaleComplete: (sale: SaleRow) => void
}

type Method = 'EFECTIVO' | 'PUNTO' | 'PAGO_MOVIL'

const QUICK_AMOUNTS = [10000, 20000, 50000, 100000] // céntimos: 100, 200, 500, 1000

export function PaymentDialog({
  open,
  onOpenChange,
  cart,
  subtotal,
  tax,
  taxRate,
  total,
  currency,
  orderType,
  customerName,
  onSaleComplete,
}: Props) {
  const [method, setMethod] = useState<Method>('EFECTIVO')
  const [cashText, setCashText] = useState('')
  const [reference, setReference] = useState('')
  const [processing, setProcessing] = useState(false)

  const cashCents = parseBsToCents(cashText) ?? 0
  const change = cashCents - total
  const cashOk = method !== 'EFECTIVO' || change >= 0

  function reset() {
    setMethod('EFECTIVO')
    setCashText('')
    setReference('')
  }

  async function confirmSale() {
    if (processing) return
    if (cart.length === 0) {
      toast.error('El pedido está vacío.')
      return
    }
    if (method === 'EFECTIVO' && cashCents < total) {
      toast.error('El monto recibido es menor que el total a cobrar.')
      return
    }
    setProcessing(true)
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          customerName: customerName.trim() || null,
          orderType,
          paymentMethod: method,
          paymentRef: method !== 'EFECTIVO' ? reference.trim() || null : null,
          cashReceived: method === 'EFECTIVO' ? cashCents : null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'No se pudo registrar la venta.')
        return
      }
      toast.success(`Venta #${String(data.sale.number).padStart(4, '0')} registrada correctamente.`)
      reset()
      onSaleComplete(data.sale as SaleRow)
    } catch {
      toast.error('Error de conexión al registrar la venta.')
    } finally {
      setProcessing(false)
    }
  }

  const methods: { value: Method; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: 'EFECTIVO', label: 'Efectivo', icon: Banknote },
    { value: 'PUNTO', label: 'Punto', icon: CreditCard },
    { value: 'PAGO_MOVIL', label: 'Pago móvil', icon: Smartphone },
  ]

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !processing) onOpenChange(false)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> Cobrar pedido
          </DialogTitle>
          <DialogDescription>
            {cart.length} artículo{cart.length === 1 ? '' : 's'} ·{' '}
            {customerName.trim() ? `Cliente: ${customerName.trim()}` : 'Cliente ocasional'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Resumen */}
          <div className="rounded-lg bg-muted/60 p-3 text-sm flex flex-col gap-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatBs(subtotal, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IVA ({taxRate}%)</span>
              <span>{formatBs(tax, currency)}</span>
            </div>
            <div className="flex justify-between border-t pt-1.5 text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">{formatBs(total, currency)}</span>
            </div>
          </div>

          {/* Método de pago */}
          <div className="grid grid-cols-3 gap-2">
            {methods.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMethod(m.value)}
                className={`flex flex-col items-center gap-1 rounded-lg border-2 px-2 py-3 text-sm font-medium transition-colors ${
                  method === m.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                }`}
                aria-pressed={method === m.value}
              >
                <m.icon className="h-5 w-5" />
                {m.label}
              </button>
            ))}
          </div>

          {/* Detalles por método */}
          {method === 'EFECTIVO' ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="cash">Monto recibido</Label>
              <Input
                id="cash"
                inputMode="decimal"
                placeholder="0,00"
                value={cashText}
                onChange={(e) => setCashText(e.target.value)}
                autoFocus
              />
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setCashText((total / 100).toFixed(2).replace('.', ','))}
                >
                  Exacto
                </Button>
                {QUICK_AMOUNTS.map((a) => (
                  <Button key={a} type="button" size="sm" variant="outline" onClick={() => setCashText(String(a / 100))}>
                    {formatBs(a, currency)}
                  </Button>
                ))}
              </div>
              <div
                className={`rounded-lg p-3 text-center font-semibold ${
                  change >= 0 ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                }`}
              >
                {change >= 0
                  ? `Cambio: ${formatBs(change, currency)}`
                  : `Faltan ${formatBs(-change, currency)}`}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="ref">
                {method === 'PUNTO' ? 'N.º de operación (opcional)' : 'Referencia del pago (opcional)'}
              </Label>
              <Input
                id="ref"
                placeholder={method === 'PUNTO' ? 'Ej: 4821' : 'Ej: 000123456789'}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                maxLength={40}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Cobro por {PAYMENT_LABELS[method]}. Verifique el aprobado en el terminal bancario antes de confirmar.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Cancelar
          </Button>
          <Button onClick={confirmSale} disabled={processing || !cashOk} className="min-w-36">
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Procesando…
              </>
            ) : (
              <>Confirmar {formatBs(total, currency)}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
