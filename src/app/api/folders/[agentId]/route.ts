import { NextRequest, NextResponse } from 'next/server'
import { canAccessFolder } from '@/lib/folder-middleware'
import { getCarpeta } from '@/lib/carpeta-db'

/**
 * GET /api/folders/[agentId]
 *
 * Retorna la carpeta personal del agente indicado.
 * Acceso permitido solo para:
 *   - El propio dueño de la carpeta.
 *   - Usuarios con rol "command_staff" o "supervisory".
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await params

  // Verificar permisos con el middleware canAccessFolder
  const deny = await canAccessFolder(req, agentId)
  if (deny) return deny

  // Obtener la carpeta del agente (se crea vacía si aún no existe)
  const carpeta = await getCarpeta(agentId)

  return NextResponse.json({ success: true, carpeta })
}
