export type EstadoOperativo = 'borrador' | 'pendiente' | 'publicado' | 'archivado'
export type TipoContenido   = 'operativo' | 'informe'

export interface Archivo {
  nombre:  string
  url:     string
  tipo:    string
  tamaño:  number
}

export interface MediaItem {
  id:        string
  tipo:      'imagen' | 'video' | 'documento'
  url:       string
  titulo:    string
  fecha:     string
  subidoPor: string
}

export interface BloqueContenido {
  tipo:     'texto' | 'imagen' | 'separador'
  contenido:string
  caption?: string
}

export interface Operativo {
  id:          string
  tipo:        TipoContenido
  titulo:      string
  descripcion: string
  contenido:   string
  bloques:     BloqueContenido[]
  estado:      EstadoOperativo
  clasificacion: 'publico' | 'interno' | 'confidencial'
  unidad:      string
  archivos:    Archivo[]
  media:       MediaItem[]
  imagenes:    string[]
  creadoPor:   string
  nombreAutor: string
  creadoEn:    string
  actualizadoEn: string
  aprobadoPor: string | null
  aprobadoEn:  string | null
  tags:        string[]
}

import { SupabaseMap, persistentMapDelete, persistentMapSet } from './supabase-map'
import { getSecret } from './secrets'

declare global {
  // eslint-disable-next-line no-var
  var __fibOps: Map<string, Operativo> | undefined
  var __fibOpsDB: Promise<Map<string, Operativo>> | undefined
}

if (!global.__fibOps) {
  global.__fibOps = new Map()
}

const isSupabaseEnabled = !!(getSecret('SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)

const initialOps: Operativo[] = [
  {
    id: 'op-001',
    tipo: 'operativo',
    titulo: 'Operativo Trueno Azul',
    descripcion: 'Operación de vigilancia en zona norte del distrito.',
    contenido: 'Se llevó a cabo el operativo de vigilancia en coordinación con unidades ERT y CIRG.',
    estado: 'publicado',
    clasificacion: 'publico',
    unidad: 'ERT',
    archivos: [], media: [], bloques: [], imagenes: [],
    creadoPor: 'Director', nombreAutor: 'Director FIB',
    creadoEn: new Date(Date.now() - 86400000 * 3).toISOString(),
    actualizadoEn: new Date(Date.now() - 86400000 * 2).toISOString(),
    aprobadoPor: 'Director', aprobadoEn: new Date(Date.now() - 86400000 * 2).toISOString(),
    tags: ['vigilancia','zona-norte','ert'],
  },
  {
    id: 'inf-001',
    tipo: 'informe',
    titulo: 'Informe Mensual — Noviembre 2025',
    descripcion: 'Resumen de actividades y estadísticas del mes de noviembre.',
    contenido: 'Durante el mes de noviembre se registraron diversas actividades operativas.',
    estado: 'pendiente',
    clasificacion: 'interno',
    unidad: 'General',
    archivos: [], media: [], bloques: [], imagenes: [],
    creadoPor: 'Supervisor', nombreAutor: 'Jefe Supervisory',
    creadoEn: new Date(Date.now() - 86400000).toISOString(),
    actualizadoEn: new Date(Date.now() - 86400000).toISOString(),
    aprobadoPor: null, aprobadoEn: null,
    tags: ['mensual','noviembre','estadisticas'],
  },
]

async function initOpsDB() {
  if (isSupabaseEnabled) {
    return SupabaseMap.create<'id', Operativo>('operativos', 'id', initialOps)
  }
  return global.__fibOps!
}

if (!global.__fibOpsDB) {
  global.__fibOpsDB = initOpsDB()
}

export async function getOpsDB() {
  return global.__fibOpsDB!
}

export async function persistOperativo(operativo: Operativo) {
  const db = await getOpsDB()
  await persistentMapSet(db, operativo.id, operativo)
}

export async function deleteOperativoById(id: string) {
  const db = await getOpsDB()
  await persistentMapDelete(db, id)
}

let _opsDB: Map<string, Operativo> | null = null
global.__fibOpsDB!.then(db => { _opsDB = db })

export const OpsDB = new Proxy({} as Map<string, Operativo>, {
  get(_t, prop) {
    if (!_opsDB) throw new Error(`[OpsDB] Acceso antes de inicializar.`)
    return (_opsDB as any)[prop]
  }
})
