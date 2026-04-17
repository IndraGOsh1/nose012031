import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuid } from 'uuid'
import { getUser, unauthorized, err, isUserFrozen, frozen } from '@/lib/auth'
import { getTicketsDB, nextTicketNumber, persistTicket, type Ticket, type CategoriaTicket } from '@/lib/tickets-db'

function canAccessTicket(t: Ticket, u: { username: string; rol: string }) {
  const isCS = u.rol === 'command_staff'
  const isSuperv = u.rol === 'supervisory'
  const isAgent = u.rol === 'federal_agent'
  if (isCS) return true
  if (isAgent) return t.creadoPor === u.username || t.asignadoA === u.username
  // supervisory:
  if (isSuperv) {
    if (t.categoria === 'contacto_supervisory') return true
    // para directiva/quejas: solo si tiene acceso explícito
    return t.accesoGrantado?.includes(u.username) ?? false
  }
  return false
}

export async function GET(req: NextRequest) {
  const u = getUser(req); if (!u) return unauthorized()
  const { searchParams } = new URL(req.url)
  const estado    = searchParams.get('estado')
  const categoria = searchParams.get('categoria')
  const includeFinalizados = searchParams.get('includeFinalizados') === '1'

  const TicketsDB = await getTicketsDB()
  let lista = Array.from(TicketsDB.values()).filter(t => canAccessTicket(t, u))

  if (estado) {
    lista = lista.filter(t => t.estado === estado)
  } else if (!includeFinalizados) {
    lista = lista.filter(t => t.estado === 'abierto' || t.estado === 'en_proceso')
  }
  if (categoria) lista = lista.filter(t => t.categoria === categoria)
  lista.sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime())
  return NextResponse.json(lista)
}

export async function POST(req: NextRequest) {
  const u = getUser(req); if (!u) return unauthorized()
  if (await isUserFrozen(u.id)) return frozen()
  const { titulo, descripcion, tipo, prioridad, categoria, tags } = await req.json().catch(() => ({}))
  if (!titulo?.trim()) return err('titulo es requerido')
  const cat: CategoriaTicket = (['contacto_supervisory','contacto_directiva','quejas_denuncia'] as const).includes(categoria)
    ? categoria : 'contacto_supervisory'

  const TicketsDB = await getTicketsDB()
  const now = new Date().toISOString()
  const tkt: Ticket = {
    id: `tkt-${uuid().slice(0,8)}`,
    numeroTicket: nextTicketNumber(),
    titulo: titulo.trim(), descripcion: descripcion?.trim() || '',
    tipo: tipo || 'solicitud', categoria: cat,
    estado: 'abierto', prioridad: prioridad || 'media',
    creadoPor: u.username, asignadoA: null, comentarios: [],
    creadoEn: now, actualizadoEn: now, resueltoPor: null, resueltoEn: null,
    tags: Array.isArray(tags) ? tags : [],
    accesoGrantado: [],
  }
  try { await persistTicket(tkt) }
  catch { return err('No se pudo persistir el ticket. Reintenta.', 503) }
  return NextResponse.json({ mensaje: '✅ Ticket creado', id: tkt.id, numero: tkt.numeroTicket }, { status: 201 })
}
