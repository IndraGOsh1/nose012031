import { NextRequest, NextResponse } from 'next/server'
import { requireStaffRole } from '@/lib/folder-middleware'
import { getCarpetasDB } from '@/lib/carpeta-db'
import { persistentMapSet } from '@/lib/supabase-map'

/**
 * POST /api/folders/[agentId]/create
 *
 * Crea una carpeta nueva para el agente indicado, siempre que no tenga
 * una carpeta ya vinculada. Solo accesible para "command_staff" o "supervisory".
 *
 * Lógica:
 *   - Si el agente ya tiene una carpeta registrada → responde 409 con mensaje de error.
 *   - Si no tiene carpeta → crea una nueva carpeta vacía y la persiste.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await params

  // Verificar que el solicitante tiene rol de staff
  const deny = requireStaffRole(req)
  if (deny) return deny

  const db = await getCarpetasDB()

  // Verificar si el agente ya tiene una carpeta vinculada
  if (db.has(agentId)) {
    // El agente ya tiene carpeta: no se puede crear una nueva
    return NextResponse.json(
      { error: 'El agente ya tiene una carpeta vinculada' },
      { status: 409 },
    )
  }

  // Crear carpeta nueva vacía para el agente
  const nuevaCarpeta = {
    username: agentId,
    anotaciones: [],
    documentos: [],
    hilos: [],
    acceso: [],
  }

  // Persistir la nueva carpeta en la BD
  await persistentMapSet(db, agentId, nuevaCarpeta)

  return NextResponse.json(
    { success: true, mensaje: `✅ Carpeta creada para el agente ${agentId}`, carpeta: nuevaCarpeta },
    { status: 201 },
  )
}
