import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuid } from 'uuid'
import { getUser, unauthorized, forbidden, notFound, isUserFrozen, frozen } from '@/lib/auth'
import { deleteTicketById, getTicketsDB, persistTicket } from '@/lib/tickets-db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = getUser(req); if (!u) return unauthorized()
  const { id } = await params
  const TicketsDB = await getTicketsDB()
  const t = TicketsDB.get(id); if (!t) return notFound()
  if (u.rol==='federal_agent' && t.creadoPor!==u.username && t.asignadoA!==u.username) return forbidden()
  return NextResponse.json(t)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = getUser(req); if (!u) return unauthorized()
  if (await isUserFrozen(u.id)) return frozen()
  const { id } = await params
  const TicketsDB = await getTicketsDB()
  const t = TicketsDB.get(id); if (!t) return notFound()
  if (u.rol === 'federal_agent' && t.creadoPor !== u.username && t.asignadoA !== u.username) return forbidden()
  const body = await req.json().catch(()=>({}))
  const now  = new Date().toISOString()
  const isSuperv = ['command_staff','supervisory'].includes(u.rol)
  const next = JSON.parse(JSON.stringify(t)) as typeof t
  if (body.estado !== undefined && isSuperv) {
    next.estado = body.estado
    if (body.estado === 'resuelto') { next.resueltoPor = u.username; next.resueltoEn = now }
  }
  if (body.asignadoA !== undefined && isSuperv) next.asignadoA = body.asignadoA
  if (body.prioridad !== undefined && isSuperv) next.prioridad = body.prioridad
  if (body.comentario) {
    const comentario = String(body.comentario).trim()
    if (comentario.length > 2000) {
      return NextResponse.json({ error: 'Comentario demasiado largo (máximo 2000)' }, { status: 400 })
    }
    next.comentarios.push({ id:uuid().slice(0,8), autor:u.username, contenido:comentario, fecha:now, interno:body.interno||false })
  }
  next.actualizadoEn = now
  try {
    await persistTicket(next)
  } catch {
    return NextResponse.json({ error: 'No se pudo persistir el ticket. Reintenta.' }, { status: 503 })
  }
  return NextResponse.json({ mensaje:'✅ Ticket actualizado' })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = getUser(req); if (!u) return unauthorized()
  if (await isUserFrozen(u.id)) return frozen()
  if (u.rol !== 'command_staff') return forbidden()
  const { id } = await params
  const TicketsDB = await getTicketsDB()
  if (!TicketsDB.has(id)) return notFound()
  try {
    await deleteTicketById(id)
  } catch {
    return NextResponse.json({ error: 'No se pudo eliminar el ticket. Reintenta.' }, { status: 503 })
  }
  return NextResponse.json({ mensaje:'✅ Eliminado' })
}
