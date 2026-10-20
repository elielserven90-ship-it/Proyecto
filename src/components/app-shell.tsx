'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ROLE_LABELS } from '@/lib/constants'
import { CheckCircle2, LogOut, ReceiptText, Settings, ShoppingCart, UtensilsCrossed } from 'lucide-react'

export interface ShellUser {
  id: string
  username: string
  name: string
  role: string
}

const NAV_ITEMS = [
  { href: '/panel/pos', label: 'POS', icon: ShoppingCart, roles: ['ADMIN', 'VENDEDOR'] },
  { href: '/panel/ventas', label: 'Ventas', icon: ReceiptText, roles: ['ADMIN', 'VENDEDOR'] },
  { href: '/panel/admin', label: 'Administración', icon: Settings, roles: ['ADMIN'] },
]

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      toast.success('Sesión cerrada correctamente.')
      router.replace('/login')
      router.refresh()
    } catch {
      toast.error('No se pudo cerrar la sesión. Intente de nuevo.')
    }
  }

  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const items = NAV_ITEMS.filter((i) => i.roles.includes(user.role))

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 flex items-center gap-3 h-14">
          <Link href="/panel/pos" className="flex items-center gap-2.5 min-w-0">
            { }
            <img
              src="/logos/logo_uptpc.png"
              alt="Logo UPTPC"
              className="h-8 w-auto bg-white rounded-md p-0.5"
            />
            <div className="min-w-0 leading-tight">
              <div className="font-bold text-sm sm:text-base flex items-center gap-1.5">
                <UtensilsCrossed className="h-4 w-4 shrink-0" />
                Cantina UPTPC
              </div>
              <div className="text-[10px] sm:text-xs text-blue-100 truncate hidden sm:block">
                Universidad Politécnica Territorial de Puerto Cabello
              </div>
            </div>
          </Link>

          {/* Navegación (desktop) */}
          <nav className="ml-6 hidden md:flex items-center gap-1" aria-label="Navegación principal">
            {items.map((item) => {
              const active = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-blue-50 hover:bg-blue-500/30'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="text-primary-foreground hover:bg-blue-500/30 gap-2 px-2"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-blue-500/40 text-white text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm max-w-[140px] truncate">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground font-normal">@{user.username}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                  <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                    {ROLE_LABELS[user.role] || user.role}
                  </Badge>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" /> Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Navegación (móvil) */}
        <nav
          className="md:hidden flex items-stretch border-t border-blue-400/20"
          aria-label="Navegación principal"
        >
          {items.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                  active ? 'bg-white text-primary' : 'text-blue-50 hover:bg-blue-500/30'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 pb-24 lg:pb-8">{children}</main>

      <footer className="mt-auto hidden lg:block border-t bg-background">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Cantina UPTPC · RIF {process.env.NEXT_PUBLIC_RIF_HINT || 'G-20005608-8'} · Sistema POS institucional
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Desarrollado por PNF en Informática
          </span>
        </div>
      </footer>
    </div>
  )
}
