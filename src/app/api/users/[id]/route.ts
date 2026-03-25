import { NextRequest, NextResponse } from 'next/server'
import { getUser, unauthorized, forbidden, notFound } from '@/lib/auth'
import { deleteUserById, getDB, persistUser, type Rol } from '@/lib/db'
import { logKeyAction, logRegistroImportante } from '@/lib/webhook'

const ROLES: Rol[] = ['command_staff', 'supervisory', 'federal_agent', 'visitante']
const VALID_CLASSES = ['RRHH', 'CIRG', 'Task Force', 'UO', 'General']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id:string }> }) {
  const u = getUser(req); if (!u) return unauthorized()
  if (!['command_staff','supervisory'].includes(u.rol)) return forbidden()
  const { id } = await params
  const db = await getDB()
  const usr = db.users.get(id); if (!usr) return notFound('Usuario no encontrado')
  if (u.rol === 'supervisory' && usr.rol === 'command_staff') return forbidden()
  const { rol, activo, discordId, agentNumber, nombre, callsign, vetado, vetoReason, congelado, congeladoReason, clases } = await req.json().catch(()=>({}))
  const nextUser = { ...usr }

  if (u.rol === 'command_staff') {
    if (rol !== undefined) {
      if (!ROLES.includes(rol)) return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
      nextUser.rol = rol
    }
    if (typeof activo === 'boolean') nextUser.activo = activo
    if (discordId !== undefined) nextUser.discordId = discordId
    if (agentNumber !== undefined) nextUser.agentNumber = agentNumber
    if (nombre !== undefined) nextUser.nombre = nombre
    if (clases !== undefined) {
      if (!Array.isArray(clases)) return NextResponse.json({ error: 'Clases inválidas' }, { status: 400 })
      nextUser.clases = clases
        .map((x: any) => String(x || '').trim())
        .filter((x: string) => VALID_CLASSES.includes(x))
        .slice(0, 6)
    }
    // Freeze / unfreeze: read-only mode, user can view but cannot mutate
    if (typeof congelado === 'boolean') {
      nextUser.congelado = congelado
      nextUser.congeladoReason = congelado ? (String(congeladoReason || '').trim() || 'Sin motivo especificado') : null
      nextUser.congeladoAt = congelado ? new Date().toISOString() : null
      nextUser.congeladoPor = congelado ? u.username : null
      logRegistroImportante('Freeze', nextUser.username, u.username, congelado ? `Congelado. Motivo: ${nextUser.congeladoReason}` : 'Congelación retirada')
    }
  }

  if (u.rol === 'supervisory') {
    if (rol !== undefined || activo !== undefined || discordId !== undefined || agentNumber !== undefined || nombre !== undefined || vetado !== undefined || vetoReason !== undefined || clases !== undefined) {
      return forbidden()
    }
  }

  if (u.rol === 'command_staff' && typeof vetado === 'boolean') {
    nextUser.vetado = vetado
    nextUser.vetoReason = vetado ? (String(vetoReason || '').trim() || 'Sin motivo especificado') : null
    nextUser.vetoAt = vetado ? new Date().toISOString() : null
    nextUser.vetoBy = vetado ? u.username : null
    logRegistroImportante('Veto', nextUser.username, u.username, vetado ? `Vetado. Motivo: ${nextUser.vetoReason}` : 'Veto retirado')
  }

  if (callsign   !== undefined) {
    nextUser.callsign = callsign
    logKeyAction('Callsign asignado', u.username, `${nextUser.username} → ${callsign}`)
  }
  try {
    await persistUser(nextUser)
  } catch {
    return NextResponse.json({ error: 'No se pudo persistir el usuario en base de datos. Reintenta.' }, { status: 503 })
  }
  db.users.set(id, nextUser)
  const { passwordHash:_, ...safe } = nextUser
  return NextResponse.json({ mensaje:'✅ Usuario actualizado', usuario:safe })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id:string }> }) {
  const u = getUser(req); if (!u) return unauthorized()
  if (u.rol !== 'command_staff') return forbidden()

  const { id } = await params
  const db = await getDB()
  const usr = db.users.get(id); if (!usr) return notFound('Usuario no encontrado')

  if (usr.id === u.id) {
    return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 })
  }

  try {
    await deleteUserById(id)
  } catch {
    return NextResponse.json({ error: 'No se pudo eliminar el usuario en base de datos. Reintenta.' }, { status: 503 })
  }
  db.users.delete(id)
  return NextResponse.json({ mensaje: '✅ Usuario eliminado' })
}
