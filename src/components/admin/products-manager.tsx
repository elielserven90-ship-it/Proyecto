'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog, type ConfirmState } from '@/components/confirm-dialog'
import { formatBs, formatAmount, parseBsToCents } from '@/lib/money'
import type { CategoryRow, ProductAdminRow } from '@/lib/types'
import {
  FolderPlus,
  Loader2,
  Package,
  PackagePlus,
  Pencil,
  Tag,
  Trash2,
  X,
} from 'lucide-react'

type ApiCategory = CategoryRow
type ApiProduct = ProductAdminRow

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Error al cargar los datos.')
  }
  return res.json()
}

interface ProductForm {
  name: string
  priceText: string
  categoryId: string
  active: boolean
}

export function ProductsManager() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ApiProduct | null>(null)
  const [form, setForm] = useState<ProductForm>({ name: '', priceText: '', categoryId: '', active: true })
  const [saving, setSaving] = useState(false)

  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [catName, setCatName] = useState('')
  const [catEditing, setCatEditing] = useState<CategoryRow | null>(null)

  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data: prodData, isLoading: loadingProducts } = useQuery({
    queryKey: ['products', 'admin'],
    queryFn: () => fetchJson<{ products: ApiProduct[] }>('/api/products?includeInactive=1'),
  })
  const { data: catData, isLoading: loadingCats } = useQuery({
    queryKey: ['categories'],
    queryFn: () =>
      fetchJson<{ categories: (CategoryRow & { _count: { products: number } })[] }>('/api/categories'),
  })

  const products = prodData?.products || []
  const categories: ApiCategory[] = (catData?.categories || []).map((c) => ({
    id: c.id,
    name: c.name,
    productsCount: c._count.products,
  }))

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['products'] })
    queryClient.invalidateQueries({ queryKey: ['categories'] })
  }

  function openCreate() {
    setEditing(null)
    setForm({ name: '', priceText: '', categoryId: categories[0]?.id || '', active: true })
    setDialogOpen(true)
  }

  function openEdit(p: ApiProduct) {
    setEditing(p)
    setForm({
      name: p.name,
      priceText: (p.price / 100).toFixed(2).replace('.', ','),
      categoryId: p.category?.id || '',
      active: p.active,
    })
    setDialogOpen(true)
  }

  async function saveProduct() {
    if (saving) return
    const name = form.name.trim()
    const cents = parseBsToCents(form.priceText)
    if (name.length < 2) {
      toast.error('Ingrese el nombre del producto.')
      return
    }
    if (cents === null || cents <= 0) {
      toast.error('Ingrese un precio válido mayor que cero.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(editing ? `/api/products/${editing.id}` : '/api/products', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          price: cents,
          categoryId: form.categoryId || null,
          active: form.active,
        }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(result.error || 'No se pudo guardar el producto.')
        return
      }
      toast.success(editing ? `Producto "${name}" actualizado.` : `Producto "${name}" creado.`)
      setDialogOpen(false)
      invalidate()
    } catch {
      toast.error('Error de conexión.')
    } finally {
      setSaving(false)
    }
  }

  function askToggleProduct(p: ApiProduct) {
    setConfirm({
      open: true,
      title: `¿${p.active ? 'Desactivar' : 'Activar'} el producto "${p.name}"?`,
      description: p.active
        ? 'Dejará de aparecer en la pantalla del POS.'
        : 'Volverá a aparecer en la pantalla del POS.',
      confirmText: p.active ? 'Desactivar' : 'Activar',
      destructive: p.active,
      onConfirm: () => toggleProduct(p),
    })
    setConfirmOpen(true)
  }

  async function toggleProduct(p: ApiProduct) {
    setConfirmOpen(false)
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !p.active }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(result.error || 'No se pudo actualizar el producto.')
        return
      }
      toast.success(`Producto "${p.name}" ${p.active ? 'desactivado' : 'activado'}.`)
      invalidate()
    } catch {
      toast.error('Error de conexión.')
    }
  }

  function askDeleteProduct(p: ApiProduct) {
    setConfirm({
      open: true,
      title: `¿Eliminar el producto "${p.name}"?`,
      description:
        'Se eliminará del sistema. Las ventas antiguas conservarán el nombre y precio con el que se vendió.',
      confirmText: 'Eliminar',
      destructive: true,
      onConfirm: () => deleteProduct(p),
    })
    setConfirmOpen(true)
  }

  async function deleteProduct(p: ApiProduct) {
    setConfirmOpen(false)
    try {
      const res = await fetch(`/api/products/${p.id}`, { method: 'DELETE' })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(result.error || 'No se pudo eliminar el producto.')
        return
      }
      toast.success(`Producto "${p.name}" eliminado.`)
      invalidate()
    } catch {
      toast.error('Error de conexión.')
    }
  }

  function openCatCreate() {
    setCatEditing(null)
    setCatName('')
    setCatDialogOpen(true)
  }

  function openCatEdit(c: CategoryRow) {
    setCatEditing(c)
    setCatName(c.name)
    setCatDialogOpen(true)
  }

  async function saveCategory() {
    if (saving) return
    const name = catName.trim()
    if (name.length < 2) {
      toast.error('Ingrese el nombre de la categoría.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(catEditing ? `/api/categories/${catEditing.id}` : '/api/categories', {
        method: catEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(result.error || 'No se pudo guardar la categoría.')
        return
      }
      toast.success(catEditing ? `Categoría renombrada a "${name}".` : `Categoría "${name}" creada.`)
      setCatDialogOpen(false)
      invalidate()
    } catch {
      toast.error('Error de conexión.')
    } finally {
      setSaving(false)
    }
  }

  function askDeleteCategory(c: CategoryRow) {
    setConfirm({
      open: true,
      title: `¿Eliminar la categoría "${c.name}"?`,
      description:
        c.productsCount > 0
          ? `Tiene ${c.productsCount} producto(s) asignados: el sistema no permitirá eliminarla hasta reasignarlos.`
          : 'Esta acción es permanente.',
      confirmText: 'Eliminar',
      destructive: true,
      onConfirm: () => deleteCategory(c),
    })
    setConfirmOpen(true)
  }

  async function deleteCategory(c: CategoryRow) {
    setConfirmOpen(false)
    try {
      const res = await fetch(`/api/categories/${c.id}`, { method: 'DELETE' })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(result.error || 'No se pudo eliminar la categoría.')
        return
      }
      toast.success(`Categoría "${c.name}" eliminada.`)
      invalidate()
    } catch {
      toast.error('Error de conexión.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Categorías */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2 text-sm">
              <Tag className="h-4 w-4 text-primary" /> Categorías
            </h2>
            <Button size="sm" variant="outline" onClick={openCatCreate}>
              <FolderPlus className="h-4 w-4" /> Nueva categoría
            </Button>
          </div>
          {loadingCats ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay categorías. Cree al menos una para organizar el menú.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-1.5 rounded-full border bg-muted/40 pl-3 pr-1.5 py-1 text-sm"
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground">({c.productsCount})</span>
                  <button
                    type="button"
                    className="rounded-full p-1 hover:bg-accent text-muted-foreground hover:text-foreground"
                    aria-label={`Renombrar categoría ${c.name}`}
                    onClick={() => openCatEdit(c)}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="rounded-full p-1 hover:bg-red-50 text-muted-foreground hover:text-destructive"
                    aria-label={`Eliminar categoría ${c.name}`}
                    onClick={() => askDeleteCategory(c)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Productos */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h2 className="font-semibold">Productos de la cantina</h2>
              <p className="text-xs text-muted-foreground">
                Solo los productos activos aparecen en el POS. Los precios se expresan en bolívares.
              </p>
            </div>
            <Button onClick={openCreate} className="shrink-0">
              <PackagePlus className="h-4 w-4" /> Nuevo producto
            </Button>
          </div>

          {loadingProducts ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Cargando productos…
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
              No hay productos todavía. Cree el primero con el botón «Nuevo producto».
            </div>
          ) : (
            <div className="overflow-x-auto scroll-area-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Producto</th>
                    <th className="px-4 py-2.5 font-medium">Categoría</th>
                    <th className="px-4 py-2.5 font-medium text-right">Precio</th>
                    <th className="px-4 py-2.5 font-medium">Estado</th>
                    <th className="px-4 py-2.5 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-medium">{p.name}</td>
                      <td className="px-4 py-2.5">
                        {p.category ? (
                          <Badge variant="secondary">{p.category.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Sin categoría</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold">{formatBs(p.price)}</td>
                      <td className="px-4 py-2.5">
                        {p.active ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-950 dark:text-green-300">
                            Activo
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-200 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300">
                            Inactivo
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            aria-label={`Editar ${p.name}`}
                            onClick={() => openEdit(p)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className={`h-8 w-8 ${p.active ? 'text-amber-600 hover:text-amber-700' : 'text-green-700 hover:text-green-800'}`}
                            aria-label={`${p.active ? 'Desactivar' : 'Activar'} ${p.name}`}
                            onClick={() => askToggleProduct(p)}
                          >
                            {p.active ? <X className="h-4 w-4" /> : <PackagePlus className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            aria-label={`Eliminar ${p.name}`}
                            onClick={() => askDeleteProduct(p)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Diálogo producto */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {editing ? `Editar: ${editing.name}` : 'Nuevo producto'}
            </DialogTitle>
            <DialogDescription>
              Defina el nombre, precio y categoría. Ejemplos de formato de precio: <code>50</code>,{' '}
              <code>50,50</code>, <code>1.000,75</code>.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5">
            <div className="grid gap-1.5">
              <Label htmlFor="p-name">Nombre</Label>
              <Input
                id="p-name"
                placeholder="ej: Empanada"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={saving}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-price">Precio (bolívares)</Label>
              <Input
                id="p-price"
                inputMode="decimal"
                placeholder="ej: 50,00"
                value={form.priceText}
                onChange={(e) => setForm({ ...form, priceText: e.target.value })}
                disabled={saving}
              />
              {parseBsToCents(form.priceText) !== null && (
                <p className="text-xs text-muted-foreground">
                  Vista previa: <span className="font-semibold text-foreground">{formatBs(parseBsToCents(form.priceText)!)}</span>
                </p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-cat">Categoría</Label>
              <select
                id="p-cat"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                disabled={saving}
              >
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Producto activo</div>
                <div className="text-xs text-muted-foreground">
                  {form.active ? 'Visible en el POS' : 'Oculto en el POS'}
                </div>
              </div>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} disabled={saving} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={saveProduct} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Guardar cambios' : 'Crear producto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo categoría */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              {catEditing ? 'Renombrar categoría' : 'Nueva categoría'}
            </DialogTitle>
            <DialogDescription>
              Ejemplos: Comidas, Bebidas, Postres, Merienda escolar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="c-name">Nombre</Label>
            <Input
              id="c-name"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              disabled={saving}
              maxLength={40}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={saveCategory} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {catEditing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
