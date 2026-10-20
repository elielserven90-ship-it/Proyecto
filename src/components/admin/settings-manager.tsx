'use client'

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DEFAULT_SETTINGS, type SettingsMap } from '@/lib/constants'
import { formatBs } from '@/lib/money'
import { CloudCog, Database, Loader2, Save, TriangleAlert } from 'lucide-react'

interface FormState {
  businessName: string
  businessTagline: string
  address: string
  rif: string
  taxRate: string
  currency: string
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Error al cargar los datos.')
  }
  return res.json()
}

export function SettingsManager() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>({
    businessName: DEFAULT_SETTINGS.businessName,
    businessTagline: DEFAULT_SETTINGS.businessTagline,
    address: DEFAULT_SETTINGS.address,
    rif: DEFAULT_SETTINGS.rif,
    taxRate: DEFAULT_SETTINGS.taxRate,
    currency: DEFAULT_SETTINGS.currency,
  })
  const [saving, setSaving] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetchJson<{ settings: SettingsMap }>('/api/settings'),
  })

  useEffect(() => {
    if (data?.settings) {
      setForm({
        businessName: data.settings.businessName || DEFAULT_SETTINGS.businessName,
        businessTagline: data.settings.businessTagline ?? DEFAULT_SETTINGS.businessTagline,
        address: data.settings.address ?? DEFAULT_SETTINGS.address,
        rif: data.settings.rif ?? DEFAULT_SETTINGS.rif,
        taxRate: String(data.settings.taxRate ?? DEFAULT_SETTINGS.taxRate),
        currency: data.settings.currency || DEFAULT_SETTINGS.currency,
      })
    }
  }, [data])

  async function save() {
    if (saving) return
    const taxRate = parseInt(form.taxRate, 10)
    if (isNaN(taxRate) || taxRate < 0 || taxRate > 50) {
      toast.error('La tasa de IVA debe ser un número entero entre 0 y 50.')
      return
    }
    if (form.businessName.trim().length < 2) {
      toast.error('Ingrese el nombre del negocio.')
      return
    }
    if (form.currency.trim().length < 1) {
      toast.error('Ingrese el símbolo de la moneda.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: form.businessName.trim(),
          businessTagline: form.businessTagline.trim(),
          address: form.address.trim(),
          rif: form.rif.trim(),
          taxRate,
          currency: form.currency.trim(),
        }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(result.error || 'No se pudo guardar los ajustes.')
        return
      }
      toast.success('Ajustes guardados correctamente.')
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    } catch {
      toast.error('Error de conexión.')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando ajustes…
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4 items-start">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Save className="h-4 w-4 text-primary" /> Datos del negocio
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3.5">
          <div className="grid gap-1.5">
            <Label htmlFor="s-name">Nombre del negocio</Label>
            <Input
              id="s-name"
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              maxLength={60}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="s-tagline">Subtítulo / institución</Label>
            <Input
              id="s-tagline"
              value={form.businessTagline}
              onChange={(e) => setForm({ ...form, businessTagline: e.target.value })}
              maxLength={120}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="s-address">Dirección</Label>
            <Textarea
              id="s-address"
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              maxLength={200}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="s-rif">RIF</Label>
              <Input id="s-rif" value={form.rif} onChange={(e) => setForm({ ...form, rif: e.target.value })} maxLength={20} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="s-currency">Moneda</Label>
              <Input
                id="s-currency"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                maxLength={6}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="s-tax">IVA (%)</Label>
            <Input
              id="s-tax"
              inputMode="numeric"
              value={form.taxRate}
              onChange={(e) => setForm({ ...form, taxRate: e.target.value.replace(/[^\d]/g, '') })}
              maxLength={2}
            />
            <p className="text-xs text-muted-foreground">
              Se agrega sobre el subtotal. Ejemplo con {form.taxRate || 0}%: un pedido de{' '}
              {formatBs(10000, form.currency)} paga {formatBs(10000 + Math.round((10000 * (parseInt(form.taxRate, 10) || 0)) / 100), form.currency)} en total.
            </p>
          </div>
          <Button onClick={save} disabled={saving} className="w-full sm:w-auto sm:self-end">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar ajustes
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        {/* Vista previa del encabezado del ticket */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vista previa del encabezado del ticket</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border bg-white text-black p-4 font-mono text-[12px] text-center">
              <div className="font-bold text-[13px] uppercase">{form.businessName || '—'}</div>
              <div className="text-[10px]">{form.businessTagline || '—'}</div>
              <div className="text-[10px]">RIF: {form.rif || '—'}</div>
              <div className="text-[9px] mt-0.5">{form.address || '—'}</div>
              <div className="mt-2 border-t border-dashed border-black/40 pt-2 text-[10px]">
                ¡Gracias por su compra!
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información de despliegue */}
        <Card className="border-blue-100 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CloudCog className="h-4 w-4 text-primary" /> Despliegue Vercel + Turso
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground flex flex-col gap-2">
            <p className="flex items-start gap-2">
              <Database className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              Los datos se guardan en la base de datos Turso (libSQL) configurada en las variables de entorno{' '}
              <code className="bg-muted px-1 rounded text-foreground">TURSO_DATABASE_URL</code> y{' '}
              <code className="bg-muted px-1 rounded text-foreground">TURSO_AUTH_TOKEN</code>.
            </p>
            <p>
              El sistema crea automáticamente sus tablas y datos iniciales la primera vez que se conecta, así que no
              es necesario ejecutar migraciones en Vercel.
            </p>
            <p className="flex items-start gap-2">
              <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
              Recuerde definir también <code className="bg-muted px-1 rounded text-foreground">AUTH_SECRET</code> en
              las variables de entorno de producción para firmar las sesiones.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
