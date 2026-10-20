import { NextResponse } from 'next/server'
import type { ZodError } from 'zod'

/** Devuelve el primer mensaje de error de validación legible */
export function firstIssue(err: ZodError): string {
  return err.issues[0]?.message || 'Datos inválidos'
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function serverError(message = 'Error interno del servidor') {
  return NextResponse.json({ error: message }, { status: 500 })
}
