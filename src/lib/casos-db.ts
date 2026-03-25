export type EstadoCaso = 'abierto' | 'en_progreso' | 'cerrado' | 'archivado'
export type PrioridadCaso = 'baja' | 'media' | 'alta' | 'critica'

export interface Sospechoso {
  id:       string
  nombre:   string
  alias:    string
  descripcion: string
  estado:   'buscado' | 'detenido' | 'liberado' | 'prófugo'
}

export interface Evidencia {
  id:       string
  titulo:   string
  tipo:     string
  descripcion: string
  subidoPor: string
  fecha:    string
  url?:     string
}

export interface EntradaTimeline {
  id:       string
  fecha:    string
  accion:   string
  detalle:  string
  autor:    string
}

export interface Nota {
  id:       string
  contenido:string
  autor:    string
  fecha:    string
  privada:  boolean
}

export interface Caso {
  id:           string
  numeroCaso:   string
  titulo:       string
  descripcion:  string
  tipo:         string
  estado:       EstadoCaso
  prioridad:    PrioridadCaso
  unidad:       string
  agenteLead:   string
  agentesAsignados: string[]
  sospechosos:  Sospechoso[]
  evidencias:   Evidencia[]
  notas:        Nota[]
  timeline:     EntradaTimeline[]
  creadoPor:    string
  creadoEn:     string
  actualizadoEn:string
  cerradoEn?:   string
  clasificacion: 'interno' | 'confidencial'
}

import { SupabaseMap, persistentMapDelete, persistentMapSet } from './supabase-map'
import { getSecret } from './secrets'

declare global { var __fibCasos: Map<string, Caso> | undefined }
declare global { var __fibCasosDB: Promise<Map<string, Caso>> | undefined }

if (!global.__fibCasos) {
  global.__fibCasos = new Map()
}

const initialCasos: Caso[] = [
  {
    id: 'caso-001', numeroCaso: 'FIB-2024-001',
    titulo: 'Caso Los Fantasmas', descripcion: 'Investigación sobre red de tráfico en zona portuaria.',
    tipo: 'Crimen Organizado', estado: 'en_progreso', prioridad: 'alta',
    unidad: 'CIRG', agenteLead: 'Director', agentesAsignados: ['Director','Supervisor'],
    sospechosos: [{ id:'s1', nombre:'John Doe', alias:'El Fantasma', descripcion:'Líder presunto de la organización', estado:'prófugo' }],
    evidencias: [{ id:'e1', titulo:'Fotografías del puerto', tipo:'imagen', descripcion:'Capturas de vigilancia nocturna', subidoPor:'Director', fecha:new Date().toISOString() }],
    notas: [{ id:'n1', contenido:'Fuente confidencial confirmó reunión el martes.', autor:'Director', fecha:new Date().toISOString(), privada:true }],
    timeline: [
      { id:'t1', fecha:new Date().toISOString(), accion:'Caso abierto', detalle:'Apertura oficial del caso por denuncia anónima', autor:'Director' },
    ],
    creadoPor:'Director', creadoEn:new Date().toISOString(), actualizadoEn:new Date().toISOString(), clasificacion:'confidencial',
  }
]

const isSupabaseEnabled = !!(getSecret('SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)

async function initCasosDB() {
  if (isSupabaseEnabled) {
    return SupabaseMap.create<'id', Caso>('casos', 'id', initialCasos)
  }
  return global.__fibCasos!
}

if (!global.__fibCasosDB) {
  global.__fibCasosDB = initCasosDB()
}

export async function getCasosDB() {
  return global.__fibCasosDB!
}

export async function persistCaso(caso: Caso) {
  const db = await getCasosDB()
  await persistentMapSet(db, caso.id, caso)
}

export async function deleteCasoById(id: string) {
  const db = await getCasosDB()
  await persistentMapDelete(db, id)
}

let _casosDB: Map<string, Caso> | null = null
global.__fibCasosDB!.then(db => { _casosDB = db })

export const CasosDB = new Proxy({} as Map<string, Caso>, {
  get(_t, prop) {
    if (!_casosDB) throw new Error(`[CasosDB] Acceso antes de inicializar.`)
    return (_casosDB as any)[prop]
  }
})

let casoCounter = 2
export function nextCaseNumber() {
  const n = String(casoCounter++).padStart(3,'0')
  return `FIB-${new Date().getFullYear()}-${n}`
}
