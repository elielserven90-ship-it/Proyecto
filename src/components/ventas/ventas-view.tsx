'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog, type ConfirmState } from '@/components/confirm-dialog'
import { ReceiptDialog } from '@/components/pos/receipt-dialog'
import { formatBs } from '@/lib/money'
import { DEFAULT_SETTINGS, ORDER_TYPE_LABELS, PAYMENT_LABELS, type SettingsMap } from '@/lib/constants'
import type { SaleRow } from '@/lib/types'
import {
  Ban,
  Download,
  Eye,
  Loader2,
  ReceiptText,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react'

type Period = 'today' | '7d' | '30d' | 'all'

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoy',
  '7d': '7 días',
  '30d': '30 días',
  all: 'Todo',
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Error al cargar los datos.')
  }
  return res.json()
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function VentasView({ isAdmin, currency }: { isAdmin: boolean; currency: string }) {
  const queryClient = useQueryClient()
  const [period, setPeriod] = useState<Period>('today')
  const [method, setMethod] = useState<string>('all')
  const [status, setStatus] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState<SaleRow | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const params = useMemo(() => {
    const sp = new URLSearchParams()
    if (period !== 'all') {
      const now = new Date()
      const from =
        period === 'today' ? startOfDay(now) : new Date(now.getTime() - Number(period.replace('d', '')) * 24 * 3600e3)
      sp.set('from', from.toISOString())
    }
    if (method !== 'all') sp.set('method', method)
    if (status !== 'all') sp.set('status', status)
    if (search.trim()) sp.set('q', search.trim())
    return sp.toString()
  }, [period, method, status, search])

  const { data, isLoading } = useQuery({
    queryKey: ['sales', params],
    queryFn: () => fetchJson<{ sales: SaleRow[] }>(`/api/sales?${params}`),
  })

  const sales = data?.sales || []

  const summary = useMemo(() => {
    const completed = sales.filter((s) => s.status === 'COMPLETADA')
    const revenue = completed.reduce((a, s) => a + s.total, 0)
    const byM: Record<string, number> = { EFECTIVO: 0, PUNTO: 0, PAGO_MOVIL: 0 }
    for (const s of completed) if (byM[s.paymentMethod] !== undefined) byM[s.paymentMethod] += s.total
    return { count: completed.length, revenue, byM, voided: sales.length - completed.length }
  }, [sales])

  function askConfirm(state: ConfirmState) {
    setConfirm(state)
    setConfirmOpen(true)
  }

  async function setSaleStatus(sale: SaleRow, newStatus: 'COMPLETADA' | 'ANULADA') {
    setConfirmOpen(false)
    try {
      const res = await fetch(`/api/sales/${sale.number}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'No se pudo actualizar la venta.')
        return
      }
      toast.success(
        newStatus === 'ANULADA'
          ? `Venta #${String(sale.number).padStart(4, '0')} anulada.`
          : `Venta #${String(sale.number).padStart(4, '0')} restaurada.`,
      )
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      setDetail((d) => (d && d.number === sale.number ? { ...d, status: newStatus } : d))
    } catch {
      toast.error('Error de conexión.')
    }
  }

  async function deleteSale(sale: SaleRow) {
    setConfirmOpen(false)
    try {
      const res = await fetch(`/api/sales/${sale.number}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'No se pudo eliminar la venta.')
        return
      }
      toast.success(`Venta #${String(sale.number).padStart(4, '0')} eliminada permanentemente.`)
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      setDetail((d) => (d && d.number === sale.number ? null : d))
    } catch {
      toast.error('Error de conexión.')
    }
  }

  function exportCsv() {
    if (sales.length === 0) {
      toast.error('No hay ventas para exportar en el período seleccionado.')
      return
    }
    const header = ['Ticket', 'Fecha', 'Hora', 'Cajero(a)', 'Cliente', 'Modo', 'Método', 'Referencia', 'Subtotal', 'IVA', 'Total', 'Estado', 'Artículos']
    const rows = sales.map((s) => [
      String(s.number).padStart(4, '0'),
      format(new Date(s.createdAt), 'dd/MM/yyyy'),
      format(new Date(s.createdAt), 'hh:mm a'),
      s.user.name,
      s.customerName || 'Ocasional',
      ORDER_TYPE_LABELS[s.orderType] || s.orderType,
      PAYMENT_LABELS[s.paymentMethod] || s.paymentMethod,
      s.paymentRef || '',
      (s.subtotal / 100).toFixed(2).replace('.', ','),
      (s.tax / 100).toFixed(2).replace('.', ','),
      (s.total / 100).toFixed(2).replace('.', ','),
      s.status === 'COMPLETADA' ? 'Completada' : 'Anulada',
      String(s.items.reduce((a, i) => a + i.quantity, 0)),
    ])
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ventas_uptpc_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Archivo CSV exportado (${sales.length} venta(s)).`)
  }

  const settingsForReceipt: SettingsMap = { ...DEFAULT_SETTINGS, currency }

  return (
    <div className="flex flex-col gap-4">
      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
        <Card className="border-blue-100 dark:border-slate-800">
          <CardContent className="p-3.5">
            <div className="text-xs text-muted-foreground">Ventas del período</div>
            <div className="text-xl font-bold">{summary.count}</div>
          </CardContent>
        </Card>
        <Card className="border-blue-100 dark:border-slate-800 lg:col-span-2">
          <CardContent className="p-3.5">
            <div className="text-xs text-muted-foreground">Total cobrado</div>
            <div className="text-xl font-bold text-primary">{formatBs(summary.revenue, currency)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3.5">
            <div className="text-xs text-muted-foreground">Efectivo / Punto</div>
            <div className="text-sm font-semibold">
              {formatBs(summary.byM.EFECTIVO, currency)} · {formatBs(summary.byM.PUNTO, currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3.5">
            <div className="text-xs text-muted-foreground">Pago móvil / Anuladas</div>
            <div className="text-sm font-semibold">
              {formatBs(summary.byM.PAGO_MOVIL, currency)} · {summary.voided}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-2 md:items-center">
        <div className="flex gap-1 flex-wrap">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? 'default' : 'outline'}
              onClick={() => setPeriod(p)}
            >
              {PERIOD_LABELS[p]}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 md:ml-auto flex-wrap items-center">
          <select
            aria-label="Filtrar por método de pago"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="all">Todos los métodos</option>
            <option value="EFECTIVO">Efectivo</option>
            <option value="PUNTO">Punto de venta</option>
            <option value="PAGO_MOVIL">Pago móvil</option>
          </select>
          <select
            aria-label="Filtrar por estado"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            <option value="COMPLETADA">Completadas</option>
            <option value="ANULADA">Anuladas</option>
          </select>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ticket o cliente…"
              className="pl-8 w-40"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Cargando ventas…
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ReceiptText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              No hay ventas con los filtros seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto scroll-area-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                    <th className="px-3 py-2.5 font-medium">Ticket</th>
                    <th className="px-3 py-2.5 font-medium">Fecha</th>
                    <th className="px-3 py-2.5 font-medium hidden md:table-cell">Cajero(a)</th>
                    <th className="px-3 py-2.5 font-medium hidden lg:table-cell">Cliente</th>
                    <th className="px-3 py-2.5 font-medium hidden lg:table-cell">Método</th>
                    <th className="px-3 py-2.5 font-medium text-right">Total</th>
                    <th className="px-3 py-2.5 font-medium">Estado</th>
                    <th className="px-3 py-2.5 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => (
                    <tr key={s.number} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2.5 font-mono font-semibold">#{String(s.number).padStart(4, '0')}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {format(new Date(s.createdAt), 'dd/MM/yy hh:mm a', { locale: es })}
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell">{s.user.name}</td>
                      <td className="px-3 py-2.5 hidden lg:table-cell max-w-36 truncate">
                        {s.customerName || '—'}
                      </td>
                      <td className="px-3 py-2.5 hidden lg:table-cell">
                        <Badge variant="outline">{PAYMENT_LABELS[s.paymentMethod]}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold">
                        {s.status === 'COMPLETADA' ? formatBs(s.total, currency) : `(${formatBs(s.total, currency)})`}
                      </td>
                      <td className="px-3 py-2.5">
                        {s.status === 'COMPLETADA' ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-950 dark:text-green-300">
                            Completada
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-950 dark:text-red-300">
                            Anulada
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            aria-label={`Ver ticket #${s.number}`}
                            onClick={() => setDetail(s)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isAdmin && s.status === 'COMPLETADA' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-amber-600 hover:text-amber-700"
                              aria-label={`Anular venta #${s.number}`}
                              onClick={() =>
                                askConfirm({
                                  open: true,
                                  title: `¿Anular venta #${String(s.number).padStart(4, '0')}?`,
                                  description:
                                    'La venta quedará marcada como anulada y dejará de contar en los totales. Podrá restaurarla más tarde.',
                                  confirmText: 'Anular venta',
                                  destructive: true,
                                  onConfirm: () => setSaleStatus(s, 'ANULADA'),
                                })
                              }
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                          {isAdmin && s.status === 'ANULADA' && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-green-700 hover:text-green-800"
                                aria-label={`Restaurar venta #${s.number}`}
                                onClick={() =>
                                  askConfirm({
                                    open: true,
                                    title: `¿Restaurar venta #${String(s.number).padStart(4, '0')}?`,
                                    description: 'La volverá a contar como completada en los totales.',
                                    confirmText: 'Restaurar',
                                    onConfirm: () => setSaleStatus(s, 'COMPLETADA'),
                                  })
                                }
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                aria-label={`Eliminar venta #${s.number}`}
                                onClick={() =>
                                  askConfirm({
                                    open: true,
                                    title: `¿Eliminar definitivamente la venta #${String(s.number).padStart(4, '0')}?`,
                                    description:
                                      'Esta acción no se puede deshacer: la venta y sus artículos se borrarán de la base de datos.',
                                    confirmText: 'Eliminar',
                                    destructive: true,
                                    onConfirm: () => deleteSale(s),
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalle / ticket */}
      {detail && (
        <ReceiptDialog
          sale={detail}
          settings={settingsForReceipt}
          open={!!detail}
          onOpenChange={(o) => {
            if (!o) setDetail(null)
          }}
          extraAction={
            isAdmin ? (
              <Button
                variant={detail.status === 'COMPLETADA' ? 'outline' : 'default'}
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={() => {
                  const target = detail.status === 'COMPLETADA' ? 'ANULADA' : 'COMPLETADA'
                  setDetail(null)
                  askConfirm(
                    target === 'ANULADA'
                      ? {
                          open: true,
                          title: `¿Anular venta #${String(detail.number).padStart(4, '0')}?`,
                          description: 'Dejará de contar en los totales. Podrá restaurarla más tarde.',
                          confirmText: 'Anular venta',
                          destructive: true,
                          onConfirm: () => setSaleStatus(detail, 'ANULADA'),
                        }
                      : {
                          open: true,
                          title: `¿Restaurar venta #${String(detail.number).padStart(4, '0')}?`,
                          description: 'Volverá a contar como completada en los totales.',
                          confirmText: 'Restaurar',
                          onConfirm: () => setSaleStatus(detail, 'COMPLETADA'),
                        },
                  )
                }}
              >
                {detail.status === 'COMPLETADA' ? 'Anular' : 'Restaurar'}
              </Button>
            ) : undefined
          }
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={confirm?.title || ''}
        description={confirm?.description}
        confirmText={confirm?.confirmText}
        destructive={confirm?.destructive}
        onConfirm={() => confirm?.onConfirm()}
      />
    </div>
  )
}
