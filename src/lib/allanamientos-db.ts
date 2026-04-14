export type EstadoAllanamiento = 'pendiente' | 'autorizado' | 'denegado' | 'ejecutado'

export interface Firma {
  username:  string
  nombre:    string
  callsign:  string | null
  rol:       string
  fecha:     string
  tipo:      'autorizacion' | 'fiscal' | 'supervisor'
}

export interface MensajeAllanamiento {
  id:        string
  autor:     string
  nombre:    string
  contenido: string
  fecha:     string
  tipo:      'mensaje' | 'sistema' | 'accion' | 'documento' | 'informe'
  htmlSnapshot?: string
}

export interface Allanamiento {
  id:               string
  numeroSolicitud:  string
  direccion:        string
  motivacion:       string
  descripcion:      string
  sospechoso:       string
  casoVinculado:    string | null
  estado:           EstadoAllanamiento
  solicitadoPor:    string
  nombreSolicitante:string
  callsignSolicitante: string | null
  unidad:           string
  fechaSolicitud:   string
  fechaEjecucion?:  string
  firmas:           Firma[]
  motivoDenegacion: string | null
  observaciones:    string
  mensajes:         MensajeAllanamiento[]
  actualizadoEn:    string
  albumFotos?:      string[]
}

import { SupabaseMap, persistentMapDelete, persistentMapSet } from './supabase-map'
import { getSecret } from './secrets'

declare global {
  // eslint-disable-next-line no-var
  var __fibAllanamientos: Map<string,Allanamiento> | undefined
  var __fibAllanamientosDB: Promise<Map<string,Allanamiento>> | undefined
}

const isSupabaseEnabled = !!(getSecret('SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)

async function initAllanamientosDB() {
  if (isSupabaseEnabled) {
    return SupabaseMap.create<'id', Allanamiento>('allanamientos', 'id')
  }
  if (!global.__fibAllanamientos) global.__fibAllanamientos = new Map()
  return global.__fibAllanamientos!
}

if (!global.__fibAllanamientosDB) {
  global.__fibAllanamientosDB = initAllanamientosDB().then(db => {
    global.__fibAllanamientos = db
    return db
  })
}

export async function getAllanamientosDB() {
  return global.__fibAllanamientosDB!
}

export async function persistAllanamiento(allanamiento: Allanamiento) {
  const db = await getAllanamientosDB()
  await persistentMapSet(db, allanamiento.id, allanamiento)
}

export async function deleteAllanamientoById(id: string) {
  const db = await getAllanamientosDB()
  await persistentMapDelete(db, id)
}

export const AllanamientosDB = new Proxy({} as Map<string, Allanamiento>, {
  get(_t, prop) {
    if (!global.__fibAllanamientos) throw new Error('[AllanamientosDB] Acceso antes de inicializar.')
    return (global.__fibAllanamientos as any)[prop]
  }
})

export async function nextAllNumber(solicitanteCallsign: string) {
  try {
    const db = await getAllanamientosDB()
    const allCases = Array.from(db.values())
    const totalCount = allCases.length + 1
    const callsign = String(solicitanteCallsign || 'UNKNOWN').trim().slice(0, 20).toUpperCase()
    return `${callsign}-PENDING // Numero de solicitud: ${String(totalCount).padStart(2, '0')}`
  } catch {
    return `${String(solicitanteCallsign || 'UNKNOWN').trim().slice(0, 20).toUpperCase()}-PENDING // Numero de solicitud: 01`
  }
}

export function updateAllanamientoWithAuthorization(numeroSolicitud: string, autorizadorCallsign: string) {
  if (!numeroSolicitud.includes('PENDING')) return numeroSolicitud
  const [callsignPart, resto] = numeroSolicitud.split('-PENDING //')
  const autCallsign = String(autorizadorCallsign || 'UNKNOWN').trim().slice(0, 20).toUpperCase()
  return `${callsignPart}-${autCallsign} //${resto}`
}

export function removeAllanamientoAuthorization(numeroSolicitud: string) {
  const value = String(numeroSolicitud || '').trim()
  if (!value.includes('//')) return value

  const parts = value.split('//')
  const left = parts[0]?.trim() || ''
  const right = parts.slice(1).join('//').trim()
  const lastDash = left.lastIndexOf('-')
  if (lastDash < 0) return value

  const solicitanteCallsign = left.slice(0, lastDash)
  return `${solicitanteCallsign}-PENDING // ${right}`
}
