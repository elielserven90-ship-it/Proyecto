'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Loader2, Lock, LogIn, User } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('desactivado') === '1') {
      toast.error('Su cuenta fue desactivada por el administrador. Contacte al responsable del sistema.')
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    if (!username.trim() || !password) {
      toast.error('Complete usuario y contraseña.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'No se pudo iniciar sesión.')
        return
      }
      toast.success(`¡Bienvenido, ${data.user.name}!`)
      const next = new URLSearchParams(window.location.search).get('next')
      if (next && next.startsWith('/')) {
        router.replace(next)
      } else if (data.user.role === 'ADMIN') {
        router.replace('/panel/admin')
      } else {
        router.replace('/panel/pos')
      }
      router.refresh()
    } catch {
      toast.error('Error de conexión. Verifique su red e intente de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-sky-50 to-blue-100 dark:from-slate-950 dark:via-blue-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        {/* Logos institucionales */}
        <div className="flex items-center gap-5 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-blue-100 dark:border-slate-800 px-6 py-4">
          { }
          <img src="/logos/logo_uptpc.png" alt="Logo UPTPC" className="h-14 w-auto" />
          <div className="h-10 w-px bg-border" />
          { }
          <img src="/logos/logo_pnf.png" alt="Logo PNF Informática" className="h-12 w-12 object-contain" />
        </div>

        <Card className="w-full shadow-lg border-blue-100 dark:border-slate-800">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary">Cantina UPTPC</CardTitle>
            <CardDescription>
              Sistema de Punto de Venta
              <br />
              <span className="text-xs">
                Universidad Politécnica Territorial de Puerto Cabello
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="username">Usuario</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    autoComplete="username"
                    placeholder="admin"
                    className="pl-9"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="pl-9 pr-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full mt-1" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Verificando…
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" /> Iniciar sesión
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="w-full bg-blue-50/60 dark:bg-slate-900/60 border-blue-100 dark:border-slate-800">
          <CardContent className="py-3 text-xs text-muted-foreground text-center">
            <span className="font-medium text-foreground">Acceso inicial:</span> usuario{' '}
            <code className="bg-blue-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-primary">admin</code>{' '}
            · contraseña{' '}
            <code className="bg-blue-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-primary">admin</code>
            <br />
            Por seguridad, cambie la contraseña desde Administración → Usuarios.
          </CardContent>
        </Card>

        <p className="text-[11px] text-muted-foreground text-center">
          RIF G-20005608-8 · Zona Industrial Santa Rosa, Puerto Cabello, Edo. Carabobo
        </p>
      </div>
    </main>
  )
}
