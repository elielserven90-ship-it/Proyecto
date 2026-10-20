'use client'

import { useState } from 'react'
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
import { ROLE_LABELS } from '@/lib/constants'
import type { UserRow } from '@/lib/types'
import {
  KeyRound,
  Loader2,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  UserRoundCheck,
  UserRoundX,
} from 'lucide-react'

interface ApiUserRow extends UserRow {
  salesCount?: number
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Error al cargar los datos.')
  }
  return res.json()
}

interface FormState {
  username: string
  name: string
  password: string
  role: 'ADMIN' | 'VENDEDOR'
  active: boolean
}

const EMPTY_FORM: FormState = { username: '', name: '', password: '', role: 'VENDEDOR', active: true }

export function UsersManager({ myId }: { myId: string }) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchJson<{ users: (UserRow & { _count?: { sales: number } })[] }>('/api/users'),
  })

  const users: ApiUserRow[] = (data?.users || []).map((u) => ({
    ...u,
    createdAt: u.createdAt,
    salesCount: u._count?.sales,
  }))

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(u: UserRow) {
    setEditing(u)
    setForm({ username: u.username, name: u.name, password: '', role: u.role as 'ADMIN' | 'VENDEDOR', active: u.active })
    setDialogOpen(true)
  }

  async function save() {
    if (saving) return
    const name = form.name.trim()
    const username = form.username.trim().toLowerCase()
    if (name.length < 2) {
      toast.error('Ingrese el nombre completo del usuario.')
      return
    }
    if (!editing) {
      if (username.length < 3) {
        toast.error('El nombre de usuario debe tener al menos 3 caracteres.')
        return
      }
      if (!/^[a-z0-9._-]+$/.test(username)) {
        toast.error('El usuario solo admite letras, números, punto, guion y guion bajo (sin espacios).')
        return
      }
      if (form.password.length < 4) {
        toast.error('La contraseña debe tener al menos 4 caracteres.')
        return
      }
    } else if (form.password && form.password.length < 4) {
      toast.error('La nueva contraseña debe tener al menos 4 caracteres.')
      return
    }

    setSaving(true)
    try {
      const url = editing ? `/api/users/${editing.id}` : '/api/users'
      const res = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editing
            ? { name, role: form.role, active: form.active, ...(form.password ? { password: form.password } : {}) }
            : { username, name, password: form.password, role: form.role, active: form.active },
        ),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(result.error || 'No se pudo guardar el usuario.')
        return
      }
      toast.success(editing ? `Usuario "${name}" actualizado.` : `Usuario "${username}" creado correctamente.`)
      setDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    } catch {
      toast.error('Error de conexión.')
    } finally {
      setSaving(false)
    }
  }

  function askToggle(u: UserRow) {
    const action = u.active ? 'desactivar' : 'activar'
    setConfirm({
      open: true,
      title: `¿${action.charAt(0).toUpperCase() + action.slice(1)} al usuario "${u.name}"?`,
      description: u.active
        ? 'Mientras esté desactivado no podrá iniciar sesión, pero se conserva su historial de ventas.'
        : 'El usuario volverá a poder iniciar sesión con su contraseña habitual.',
      confirmText: u.active ? 'Desactivar' : 'Activar',
      destructive: u.active,
      onConfirm: () => toggleActive(u),
    })
    setConfirmOpen(true)
  }

  async function toggleActive(u: UserRow) {
    setConfirmOpen(false)
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !u.active }),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(result.error || 'No se pudo actualizar el estado.')
        return
      }
      toast.success(`Usuario "${u.name}" ${u.active ? 'desactivado' : 'activado'}.`)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    } catch {
      toast.error('Error de conexión.')
    }
  }

  function askDelete(u: UserRow) {
    setConfirm({
      open: true,
      title: `¿Eliminar al usuario "${u.name}" (@${u.username})?`,
      description:
        u.salesCount && u.salesCount > 0
          ? `ATENCIÓN: este usuario tiene ${u.salesCount} venta(s) registradas; el sistema no permitirá eliminarlo. Considere desactivarlo.`
          : 'Esta acción es permanente. El usuario dejará de existir en el sistema.',
      confirmText: 'Eliminar',
      destructive: true,
      onConfirm: () => deleteUser(u),
    })
    setConfirmOpen(true)
  }

  async function deleteUser(u: UserRow) {
    setConfirmOpen(false)
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(result.error || 'No se pudo eliminar el usuario.')
        return
      }
      toast.success(`Usuario "${u.name}" eliminado.`)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    } catch {
      toast.error('Error de conexión.')
    }
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="font-semibold">Usuarios del sistema</h2>
            <p className="text-xs text-muted-foreground">
              Cree cuentas para los vendedores de la cantina. Los vendedores pueden cobrar en el POS; solo los
              administradores gestionan usuarios, productos y ajustes.
            </p>
          </div>
          <Button onClick={openCreate} className="shrink-0">
            <UserPlus className="h-4 w-4" /> Nuevo usuario
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Cargando usuarios…
          </div>
        ) : (
          <div className="overflow-x-auto scroll-area-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Usuario</th>
                  <th className="px-4 py-2.5 font-medium">Rol</th>
                  <th className="px-4 py-2.5 font-medium hidden md:table-cell">Ventas</th>
                  <th className="px-4 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isMe = u.id === myId
                  return (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">
                          @{u.username} {isMe && <span className="text-primary font-medium">· tú</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={u.role === 'ADMIN' ? 'default' : 'secondary'}>
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          {ROLE_LABELS[u.role]}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell">{u.salesCount ?? 0}</td>
                      <td className="px-4 py-2.5">
                        {u.active ? (
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
                            aria-label={`Editar ${u.name}`}
                            onClick={() => openEdit(u)}
                          >
                            <UserCog className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-amber-600 hover:text-amber-700"
                            aria-label={`${u.active ? 'Desactivar' : 'Activar'} ${u.name}`}
                            disabled={isMe}
                            onClick={() => askToggle(u)}
                          >
                            {u.active ? <UserRoundX className="h-4 w-4" /> : <UserRoundCheck className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            aria-label={`Eliminar ${u.name}`}
                            disabled={isMe}
                            onClick={() => askDelete(u)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Diálogo crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              {editing ? `Editar: ${editing.name}` : 'Nuevo usuario'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Modifique los datos. Deje la contraseña en blanco para conservar la actual.'
                : 'Cree la cuenta con la que el vendedor iniciará sesión.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5">
            <div className="grid gap-1.5">
              <Label htmlFor="u-username">Nombre de usuario</Label>
              <Input
                id="u-username"
                placeholder="ej: maria"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                disabled={!!editing || saving}
                autoComplete="off"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="u-name">Nombre y apellido</Label>
              <Input
                id="u-name"
                placeholder="ej: María Pérez"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={saving}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="u-pass">{editing ? 'Nueva contraseña (opcional)' : 'Contraseña'}</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="u-pass"
                  type="text"
                  className="pl-9"
                  placeholder={editing ? 'Sin cambios' : 'Mínimo 4 caracteres'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  disabled={saving}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="u-role">Rol</Label>
              <select
                id="u-role"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as 'ADMIN' | 'VENDEDOR' })}
                disabled={saving}
              >
                <option value="VENDEDOR">Vendedor — cobra en el POS y consulta ventas</option>
                <option value="ADMIN">Administrador — acceso total</option>
              </select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">Cuenta activa</div>
                <div className="text-xs text-muted-foreground">
                  {form.active ? 'Puede iniciar sesión' : 'No podrá iniciar sesión'}
                </div>
              </div>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} disabled={saving} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Guardar cambios' : 'Crear usuario'}
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
    </Card>
  )
}
