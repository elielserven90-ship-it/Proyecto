'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatsPanel } from '@/components/admin/stats-panel'
import { UsersManager } from '@/components/admin/users-manager'
import { ProductsManager } from '@/components/admin/products-manager'
import { SettingsManager } from '@/components/admin/settings-manager'
import { BarChart3, Package, SlidersHorizontal, UsersRound } from 'lucide-react'

export function AdminView({ myId }: { myId: string }) {
  return (
    <Tabs defaultValue="resumen">
      <TabsList className="mb-4 h-auto flex-wrap">
        <TabsTrigger value="resumen" className="gap-1.5">
          <BarChart3 className="h-4 w-4" /> Resumen
        </TabsTrigger>
        <TabsTrigger value="usuarios" className="gap-1.5">
          <UsersRound className="h-4 w-4" /> Usuarios
        </TabsTrigger>
        <TabsTrigger value="productos" className="gap-1.5">
          <Package className="h-4 w-4" /> Productos
        </TabsTrigger>
        <TabsTrigger value="ajustes" className="gap-1.5">
          <SlidersHorizontal className="h-4 w-4" /> Ajustes
        </TabsTrigger>
      </TabsList>
      <TabsContent value="resumen">
        <StatsPanel />
      </TabsContent>
      <TabsContent value="usuarios">
        <UsersManager myId={myId} />
      </TabsContent>
      <TabsContent value="productos">
        <ProductsManager />
      </TabsContent>
      <TabsContent value="ajustes">
        <SettingsManager />
      </TabsContent>
    </Tabs>
  )
}
