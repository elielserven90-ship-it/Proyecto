'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatBs } from '@/lib/money'
import { ORDER_TYPE_LABELS, PAYMENT_LABELS, SALE_STATUS_LABELS, type SettingsMap } from '@/lib/constants'
import type { SaleRow } from '@/lib/types'
import { Printer, X } from 'lucide-react'

interface Props {
  sale: SaleRow
  settings: SettingsMap
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Acción opcional adicional (ej. anular venta desde Ventas) */
  extraAction?: React.ReactNode
}

export function ReceiptDialog({ sale, settings, open, onOpenChange, extraAction }: Props) {
  const currency = settings.currency || 'Bs.'
  const when = new Date(sale.createdAt)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Ticket #{String(sale.number).padStart(4, '0')}
            {sale.status === 'ANULADA' && (
              <span className="text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950 px-2 py-0.5 rounded-full">
                {SALE_STATUS_LABELS.ANULADA}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>Comprobante de venta · {format(when, "dd/MM/yyyy hh:mm a", { locale: es })}</DialogDescription>
        </DialogHeader>

        {/* ── Área imprimible ─────────────────────────────── */}
        <div
          id="receipt-print"
          className="rounded-md border bg-white text-black p-4 font-mono text-[12px] leading-relaxed max-h-[45vh] overflow-y-auto scroll-area-thin"
        >
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              { }
              <img src="/logos/logo_uptpc.png" alt="UPTPC" className="h-9 w-auto" />
              { }
              <img src="/logos/logo_pnf.png" alt="PNF Informática" className="h-8 w-8 object-contain" />
            </div>
            <div className="font-bold text-[13px] uppercase">{settings.businessName}</div>
            <div className="text-[10px]">{settings.businessTagline}</div>
            <div className="text-[10px]">RIF: {settings.rif}</div>
            <div className="text-[9px] mt-0.5">{settings.address}</div>
          </div>

          <div className="my-2 border-t border-dashed border-black/40" />

          <div className="flex justify-between">
            <span>Ticket</span>
            <span className="font-bold">#{String(sale.number).padStart(4, '0')}</span>
          </div>
          <div className="flex justify-between">
            <span>Fecha</span>
            <span>{format(when, 'dd/MM/yyyy hh:mm a', { locale: es })}</span>
          </div>
          <div className="flex justify-between">
            <span>Cajero(a)</span>
            <span>{sale.user.name}</span>
          </div>
          <div className="flex justify-between">
            <span>Cliente</span>
            <span>{sale.customerName || 'Ocasional'}</span>
          </div>
          <div className="flex justify-between">
            <span>Modo</span>
            <span>{ORDER_TYPE_LABELS[sale.orderType] || sale.orderType}</span>
          </div>

          <div className="my-2 border-t border-dashed border-black/40" />

          <table className="w-full">
            <tbody>
              {sale.items.map((i) => (
                <tr key={i.id}>
                  <td className="align-top w-6">{i.quantity}x</td>
                  <td className="align-top">{i.name}</td>
                  <td className="align-top text-right whitespace-nowrap">{formatBs(i.subtotal, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="my-2 border-t border-dashed border-black/40" />

          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatBs(sale.subtotal, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span>IVA ({sale.taxRate}%)</span>
            <span>{formatBs(sale.tax, currency)}</span>
          </div>
          <div className="flex justify-between font-bold text-[14px]">
            <span>TOTAL</span>
            <span>{formatBs(sale.total, currency)}</span>
          </div>

          <div className="my-2 border-t border-dashed border-black/40" />

          <div className="flex justify-between">
            <span>Pago</span>
            <span>{PAYMENT_LABELS[sale.paymentMethod] || sale.paymentMethod}</span>
          </div>
          {sale.paymentRef && (
            <div className="flex justify-between">
              <span>Referencia</span>
              <span>{sale.paymentRef}</span>
            </div>
          )}
          {sale.paymentMethod === 'EFECTIVO' && sale.cashReceived != null && (
            <>
              <div className="flex justify-between">
                <span>Recibido</span>
                <span>{formatBs(sale.cashReceived, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cambio</span>
                <span>{formatBs(sale.changeGiven ?? 0, currency)}</span>
              </div>
            </>
          )}
          {sale.status === 'ANULADA' && (
            <div className="mt-2 text-center font-bold text-red-700">*** VENTA ANULADA ***</div>
          )}

          <div className="mt-3 border-t border-dashed border-black/40 pt-2 text-center text-[10px]">
            ¡Gracias por su compra!
            <br />
            Cantina UPTPC · Servicio de Alimentación
            <br />
            Desarrollado por PNF en Informática
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {extraAction}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" /> Cerrar
          </Button>
          <Button onClick={() => window.print()} className="print:hidden">
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
