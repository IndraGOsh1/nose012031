export type EstadoTicket = 'abierto' | 'en_proceso' | 'resuelto' | 'cerrado'
export type PrioridadTicket = 'baja' | 'media' | 'alta' | 'urgente'
export type TipoTicket = 'solicitud' | 'reporte' | 'consulta' | 'otro'

export interface ComentarioTicket {
  id:       string
  autor:    string
  contenido:string
  fecha:    string
  interno:  boolean
}

export interface Ticket {
  id:          string
  numeroTicket:string
  titulo:      string
  descripcion: string
  tipo:        TipoTicket
  estado:      EstadoTicket
  prioridad:   PrioridadTicket
  creadoPor:   string
  asignadoA:   string | null
  comentarios: ComentarioTicket[]
  creadoEn:    string
  actualizadoEn:string
  resueltoPor: string | null
  resueltoEn:  string | null
  tags:        string[]
}

import { SupabaseMap, persistentMapDelete, persistentMapSet } from './supabase-map'
import { getSecret } from './secrets'

declare global { var __fibTickets: Map<string, Ticket> | undefined }
declare global { var __fibTicketsDB: Promise<Map<string, Ticket>> | undefined }

if (!global.__fibTickets) {
  global.__fibTickets = new Map()
}

const initialTickets: Ticket[] = [
  {
    id:'tkt-001', numeroTicket:'TKT-001', titulo:'Solicitud de equipamiento ERT',
    descripcion:'Se requieren 4 chalecos nuevos para el equipo ERT tras el último operativo.',
    tipo:'solicitud', estado:'abierto', prioridad:'media',
    creadoPor:'Agente1', asignadoA:null, comentarios:[],
    creadoEn:new Date().toISOString(), actualizadoEn:new Date().toISOString(), resueltoPor:null, resueltoEn:null, tags:['ert','equipamiento'],
  }
]

const isSupabaseEnabled = !!(getSecret('SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)

async function initTicketsDB() {
  if (isSupabaseEnabled) {
    return SupabaseMap.create<'id', Ticket>('tickets', 'id', initialTickets)
  }
  return global.__fibTickets!
}

if (!global.__fibTicketsDB) {
  global.__fibTicketsDB = initTicketsDB()
}

export async function getTicketsDB() {
  return global.__fibTicketsDB!
}

export async function persistTicket(ticket: Ticket) {
  const db = await getTicketsDB()
  await persistentMapSet(db, ticket.id, ticket)
}

export async function deleteTicketById(id: string) {
  const db = await getTicketsDB()
  await persistentMapDelete(db, id)
}

let _ticketsDB: Map<string, Ticket> | null = null
global.__fibTicketsDB!.then(db => { _ticketsDB = db })

export const TicketsDB = new Proxy({} as Map<string, Ticket>, {
  get(_t, prop) {
    if (!_ticketsDB) throw new Error(`[TicketsDB] Acceso antes de inicializar.`)
    return (_ticketsDB as any)[prop]
  }
})

let tkCounter = 2
export function nextTicketNumber() {
  return `TKT-${String(tkCounter++).padStart(3,'0')}`
}
