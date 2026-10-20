'use client'

import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatBs } from '@/lib/money'
import { PAYMENT_LABELS } from '@/lib/constants'
import {
  Banknote,
  Coins,
  Loader2,
  Package,
  ReceiptText,
  Smartphone,
  TrendingUp,
  UsersRound,
  Wallet,
} from 'lucide-react'

interface StatsResponse {
  today: { count: number; revenue: number }
  month: { count: number; revenue: number }
  byMethod: Record<string, { count: number; total: number }>
  topProducts: { name: string; quantity: number; revenue: number }[]
  recentSales: { number: number; total: number; status: string; createdAt: string; seller: string; itemCount: number }[]
  counts: { usersActive: number; productsActive: number; categoriesCount: number }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Error al cargar estadísticas.')
  return res.json()
}

export function StatsPanel() {
  const now = new Date()
  const todayFrom = new Date(now)
  todayFrom.setHours(0, 0, 0, 0)
  const monthFrom = new Date(now.getFullYear(), now.getMonth(), 1)
  const rangeFrom = new Date(now.getTime() - 30 * 24 * 3600e3)

  const sp = new URLSearchParams({
    todayFrom: todayFrom.toISOString(),
    monthFrom: monthFrom.toISOString(),
    rangeFrom: rangeFrom.toISOString(),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => fetchJson<StatsResponse>(`/api/stats?${sp.toString()}`),
    refetchInterval: 60_000,
  })

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando estadísticas…
      </div>
    )
  }

  const avgTicket = data.today.count > 0 ? Math.round(data.today.revenue / data.today.count) : 0
  const maxQty = Math.max(1, ...data.topProducts.map((p) => p.quantity))

  return (
    <div className="flex flex-col gap-4">
      {/* Tarjetas principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-blue-100 dark:border-slate-800">
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <ReceiptText className="h-3.5 w-3.5" /> Ventas de hoy
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold">{data.today.count}</div>
          </CardContent>
        </Card>
        <Card className="border-blue-100 dark:border-slate-800">
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5" /> Ingresos de hoy
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold text-primary">{formatBs(data.today.revenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" /> Ticket promedio hoy
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold">{formatBs(avgTicket)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Ingresos del mes
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold">{formatBs(data.month.revenue)}</div>
            <div className="text-xs text-muted-foreground">{data.month.count} venta(s)</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Métodos de pago hoy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pagos de hoy por método</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2.5">
            <MethodCard icon={Banknote} label="Efectivo" count={data.byMethod.EFECTIVO?.count || 0} total={data.byMethod.EFECTIVO?.total || 0} />
            <MethodCard icon={Coins} label="Punto" count={data.byMethod.PUNTO?.count || 0} total={data.byMethod.PUNTO?.total || 0} />
            <MethodCard icon={Smartphone} label="Pago móvil" count={data.byMethod.PAGO_MOVIL?.count || 0} total={data.byMethod.PAGO_MOVIL?.total || 0} />
          </CardContent>
        </Card>

        {/* Estado del sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Estado del sistema</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
              <UsersRound className="h-3.5 w-3.5" /> {data.counts.usersActive} usuario(s) activo(s)
            </Badge>
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
              <Package className="h-3.5 w-3.5" /> {data.counts.productsActive} producto(s) activo(s)
            </Badge>
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
              <ReceiptText className="h-3.5 w-3.5" /> {data.counts.categoriesCount} categoría(s)
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top productos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Productos más vendidos (30 días)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Aún no hay ventas registradas en los últimos 30 días.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {data.topProducts.map((p, idx) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="w-5 text-xs font-bold text-muted-foreground">{idx + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium truncate">{p.name}</span>
                        <span className="text-muted-foreground whitespace-nowrap ml-2">
                          {p.quantity} u. · {formatBs(p.revenue)}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.round((p.quantity / maxQty) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimas ventas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Últimas ventas</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aún no hay ventas registradas.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {data.recentSales.map((s) => (
                  <div key={s.number} className="flex items-center justify-between text-sm rounded-md border px-3 py-2">
                    <div className="min-w-0">
                      <span className="font-mono font-semibold">#{String(s.number).padStart(4, '0')}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {format(new Date(s.createdAt), "dd/MM hh:mm a", { locale: es })} · {s.seller} · {s.itemCount} art.
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${s.status === 'ANULADA' ? 'line-through text-muted-foreground' : ''}`}>
                        {formatBs(s.total)}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          s.status === 'COMPLETADA'
                            ? 'text-green-700 border-green-300'
                            : 'text-red-600 border-red-300'
                        }
                      >
                        {s.status === 'COMPLETADA' ? 'OK' : 'ANUL.'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MethodCard({
  icon: Icon,
  label,
  count,
  total,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
  total: number
}) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <Icon className="h-5 w-5 mx-auto text-primary mb-1" />
      <div className="text-xs text-muted-foreground">{PAYMENT_LABELS[label] || label}</div>
      <div className="text-sm font-bold">{count}</div>
      <div className="text-xs text-muted-foreground">{formatBs(total)}</div>
    </div>
  )
}
