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

let counter = 1
export function nextAllNumber() {
  return 'ALL-' + new Date().getFullYear() + '-' + String(counter++).padStart(3,'0')
}
