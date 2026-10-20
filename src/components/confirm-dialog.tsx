'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2, TriangleAlert } from 'lucide-react'

export interface ConfirmState {
  open: boolean
  title: string
  description?: string
  confirmText?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Confirmar',
  destructive = false,
  loading = false,
  onConfirm,
  onOpenChange,
}: ConfirmState & { onOpenChange: (open: boolean) => void }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {destructive && <TriangleAlert className="h-5 w-5 text-destructive shrink-0" />}
            {title}
          </AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            className={destructive ? 'bg-destructive text-white hover:bg-destructive/90' : ''}
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
