import { NextRequest, NextResponse } from 'next/server'
import { getUser, unauthorized, forbidden } from '@/lib/auth'
import { getCarpetasDB } from '@/lib/carpeta-db'

/**
 * Roles con acceso privilegiado a cualquier carpeta personal.
 * Deben coincidir con los roles definidos en db.ts.
 */
const STAFF_ROLES = ['command_staff', 'supervisory'] as const

/**
 * Middleware: requireStaffRole
 *
 * Permite el acceso solo si el usuario autenticado tiene
 * rol "command_staff" o "supervisory". De lo contrario responde 403.
 *
 * @returns NextResponse (401 o 403) si el acceso está denegado, null si se permite continuar.
 */
export function requireStaffRole(req: NextRequest): NextResponse | null {
  const user = getUser(req)
  // Si no hay token válido → 401 No autorizado
  if (!user) return unauthorized()
  // Si el rol no es de staff → 403 Sin permisos
  if (!(STAFF_ROLES as readonly string[]).includes(user.rol)) return forbidden()
  return null
}

/**
 * Middleware: canAccessFolder
 *
 * Verifica si el usuario autenticado puede acceder a la carpeta
 * del agente identificado por `agentId` (username del agente).
 *
 * Condiciones de acceso:
 *   1. El usuario es el propio dueño de la carpeta (username coincide con agentId).
 *   2. El usuario tiene rol "command_staff" o "supervisory".
 *
 * @param req       - Objeto NextRequest con el token de autenticación.
 * @param agentId   - Username del agente dueño de la carpeta.
 * @returns NextResponse (401/403) si está denegado, null si se permite continuar.
 */
export async function canAccessFolder(
  req: NextRequest,
  agentId: string,
): Promise<NextResponse | null> {
  // Verificar que existe un usuario autenticado
  const user = getUser(req)
  if (!user) return unauthorized()

  // Condición 1: el usuario es el dueño de la carpeta
  if (user.username === agentId) return null

  // Condición 2: el usuario tiene rol de staff con acceso global
  if ((STAFF_ROLES as readonly string[]).includes(user.rol)) return null

  // Consultar la BD para confirmar que la carpeta pertenece al agente indicado
  const db = await getCarpetasDB()
  const carpeta = db.get(agentId)

  // Si la carpeta no existe y el usuario no tiene permisos suficientes → 403
  if (!carpeta) return forbidden()

  // La carpeta existe pero el usuario no es dueño ni staff → 403
  return forbidden()
}
