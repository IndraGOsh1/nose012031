import { SupabaseMap, persistentMapSet } from './supabase-map'
import { createClient } from '@supabase/supabase-js'
import { getSecret } from './secrets'

export interface Anotacion {
  id: string
  titulo: string
  contenido: string
  fecha: string
  privada: boolean
}

export interface CarpetaDocumento {
  id: string
  nombre: string
  descripcion: string
  fecha: string
}

export interface MensajeHiloCarpeta {
  id: string
  autor: string
  nombre: string
  contenido: string
  fecha: string
  sistema?: boolean
}

export interface HiloCarpeta {
  id: string
  titulo: string
  descripcion: string
  estado: 'abierto' | 'cerrado'
  creadoPor: string
  creadoEn: string
  participantes: string[]
  mensajes: MensajeHiloCarpeta[]
}

export interface CarpetaPersonal {
  username: string
  anotaciones: Anotacion[]
  documentos: CarpetaDocumento[]
  hilos: HiloCarpeta[]
}

declare global {
  // eslint-disable-next-line no-var
  var __fibCarpetas: Map<string, CarpetaPersonal> | undefined
  // eslint-disable-next-line no-var
  var __fibCarpetasInit: Promise<Map<string, CarpetaPersonal>> | undefined
}

const isSupabaseEnabled = !!(getSecret('SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)

let _carpetaClient: ReturnType<typeof createClient> | null = null

function getCarpetaClient() {
  if (_carpetaClient) return _carpetaClient
  const url = getSecret('SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const key =
    getSecret('SUPABASE_SERVICE_ROLE_KEY') ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  if (!url || !key) return null
  _carpetaClient = createClient(url, key)
  return _carpetaClient
}

async function initCarpetas() {
  if (isSupabaseEnabled) {
    return SupabaseMap.create<'username', CarpetaPersonal>('carpetas', 'username')
  }
  if (!global.__fibCarpetas) global.__fibCarpetas = new Map<string, CarpetaPersonal>()
  return global.__fibCarpetas
}

if (!global.__fibCarpetasInit) {
  global.__fibCarpetasInit = initCarpetas().then(db => {
    global.__fibCarpetas = db
    return db
  })
}

export async function getCarpetasDB() {
  return global.__fibCarpetasInit as Promise<Map<string, CarpetaPersonal>>
}

export async function getCarpeta(username: string): Promise<CarpetaPersonal> {
  const db = await getCarpetasDB()
  if (!db.has(username)) {
    await persistentMapSet(db, username, { username, anotaciones: [], documentos: [], hilos: [] })
  }
  return db.get(username) as CarpetaPersonal
}

export function canAccessCarpetaHilo(hilo: HiloCarpeta, viewerUsername: string, ownerUsername: string) {
  return viewerUsername === ownerUsername || hilo.participantes.includes(viewerUsername)
}

export async function persistCarpeta(carpeta: CarpetaPersonal) {
  const db = await getCarpetasDB()
  await persistentMapSet(db, carpeta.username, carpeta)
}
