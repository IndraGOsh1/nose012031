import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuid } from 'uuid'
import { getUser, unauthorized, err, isUserFrozen, frozen } from '@/lib/auth'
import { getTicketsDB, nextTicketNumber, persistTicket, type Ticket } from '@/lib/tickets-db'

export async function GET(req: NextRequest) {
  const u = getUser(req); if (!u) return unauthorized()
  const { searchParams } = new URL(req.url)
  const estado = searchParams.get('estado')
  const tipo   = searchParams.get('tipo')

  const TicketsDB = await getTicketsDB()
  let lista = Array.from(TicketsDB.values())
  if (u.rol === 'federal_agent') lista = lista.filter(t => t.creadoPor===u.username || t.asignadoA===u.username)
  if (estado) lista = lista.filter(t => t.estado===estado)
  if (tipo)   lista = lista.filter(t => t.tipo===tipo)
  lista.sort((a,b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime())
  return NextResponse.json(lista)
}

export async function POST(req: NextRequest) {
  const u = getUser(req); if (!u) return unauthorized()
  if (await isUserFrozen(u.id)) return frozen()
  const { titulo, descripcion, tipo, prioridad, tags } = await req.json().catch(()=>({}))
  if (!titulo?.trim() || !tipo) return err('titulo y tipo son requeridos')

  const TicketsDB = await getTicketsDB()
  const now = new Date().toISOString()
  const tkt: Ticket = {
    id: `tkt-${uuid().slice(0,8)}`,
    numeroTicket: nextTicketNumber(),
    titulo: titulo.trim(), descripcion: descripcion?.trim()||'',
    tipo, estado:'abierto', prioridad: prioridad||'media',
    creadoPor:u.username, asignadoA:null, comentarios:[],
    creadoEn:now, actualizadoEn:now, resueltoPor:null, resueltoEn:null,
    tags: Array.isArray(tags)?tags:[],
  }
  try {
    await persistTicket(tkt)
  } catch {
    return err('No se pudo persistir el ticket. Reintenta.', 503)
  }
  return NextResponse.json({ mensaje:'✅ Ticket creado', id:tkt.id, numero:tkt.numeroTicket }, { status:201 })
}
