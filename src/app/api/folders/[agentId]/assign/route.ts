import { NextRequest, NextResponse } from 'next/server'
import { requireStaffRole } from '@/lib/folder-middleware'
import { getCarpetasDB } from '@/lib/carpeta-db'
import { persistentMapSet } from '@/lib/supabase-map'

/**
 * POST /api/folders/[agentId]/assign
 *
 * Asigna (vincula) una carpeta existente al agente indicado.
 * Solo accesible para usuarios con rol "command_staff" o "supervisory".
 *
 * Body esperado:
 *   { folder_id: string }  → username del agente cuya carpeta se quiere vincular
 *
 * Comportamiento:
 *   - Busca la carpeta identificada por `folder_id` en la BD.
 *   - Copia esa carpeta bajo el username del `agentId` destino.
 *   - Si la carpeta fuente no existe → 404.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await params

  // Verificar que el solicitante tiene rol de staff
  const deny = requireStaffRole(req)
  if (deny) return deny

  // Leer el body de la petición
  const body = await req.json().catch(() => ({}))
  const { folder_id } = body

  // El campo folder_id es obligatorio
  if (!folder_id || typeof folder_id !== 'string' || !folder_id.trim()) {
    return NextResponse.json({ error: 'El campo folder_id es requerido' }, { status: 400 })
  }

  const sourceFolderId = folder_id.trim()

  const db = await getCarpetasDB()

  // Verificar que la carpeta fuente existe en la BD
  const sourceFolder = db.get(sourceFolderId)
  if (!sourceFolder) {
    return NextResponse.json(
      { error: `No existe una carpeta con folder_id "${sourceFolderId}"` },
      { status: 404 },
    )
  }

  // Vincular la carpeta fuente al agente destino (se copia bajo el nuevo username)
  const linked = { ...sourceFolder, username: agentId }
  await persistentMapSet(db, agentId, linked)

  return NextResponse.json(
    { success: true, mensaje: `✅ Carpeta vinculada al agente ${agentId}`, carpeta: linked },
    { status: 200 },
  )
}
