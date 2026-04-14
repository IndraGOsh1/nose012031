import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuid } from 'uuid'
import { getUser, unauthorized, err, isUserFrozen, frozen } from '@/lib/auth'
import { getOpsDB, persistOperativo, type Operativo } from '@/lib/operativos-db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tipo    = searchParams.get('tipo')
  const estado  = searchParams.get('estado')
  const clsf    = searchParams.get('clasificacion')
  const unidad  = searchParams.get('unidad')
  const publica = searchParams.get('publica') === '1'

  const u = getUser(req)
  if (!publica && !u) return unauthorized()

  const OpsDB = await getOpsDB()
  let lista = Array.from(OpsDB.values())

  if (publica) {
    lista = lista.filter(o => o.estado === 'publicado' && o.clasificacion !== 'confidencial')
  } else {
    if (u!.rol !== 'command_staff') {
      lista = lista.filter(o => o.estado !== 'borrador' || o.creadoPor === u!.username)
      lista = lista.filter(o => o.clasificacion !== 'confidencial')
    }
  }

  if (tipo)   lista = lista.filter(o => o.tipo   === tipo)
  if (estado) lista = lista.filter(o => o.estado === estado)
  if (clsf)   lista = lista.filter(o => o.clasificacion === clsf)
  if (unidad) lista = lista.filter(o => o.unidad === unidad)
  lista.sort((a, b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime())

  return NextResponse.json(lista.map(o => ({ ...o, contenido: o.contenido.slice(0, 300) + (o.contenido.length > 300 ? '...' : '') })))
}

export async function POST(req: NextRequest) {
  const u = getUser(req); if (!u) return unauthorized()
  if (await isUserFrozen(u.id)) return frozen()

  const { titulo, descripcion, contenido, bloques, imagenes, tipo, clasificacion, unidad, tags } = await req.json().catch(() => ({}))
  if (!titulo?.trim() || !tipo) return err('titulo y tipo son requeridos')

  const OpsDB = await getOpsDB()
  const id  = tipo === 'operativo' ? `op-${uuid().slice(0,8)}` : `inf-${uuid().slice(0,8)}`
  const now = new Date().toISOString()
  const estadoInicial = u.rol === 'command_staff' ? 'publicado' : 'pendiente'

  const op: Operativo = {
    id, tipo, titulo: titulo.trim(),
    descripcion: descripcion?.trim() || '',
    contenido: contenido?.trim() || '',
    bloques: Array.isArray(bloques) ? bloques : [],
    imagenes: Array.isArray(imagenes) ? imagenes : [],
    estado: estadoInicial,
    clasificacion: clasificacion || 'interno',
    unidad: unidad || 'General',
    archivos: [], media: [],
    creadoPor:   u.username,
    nombreAutor: u.nombre || u.username,
    creadoEn:    now, actualizadoEn: now,
    aprobadoPor: estadoInicial === 'publicado' ? u.username : null,
    aprobadoEn:  estadoInicial === 'publicado' ? now : null,
    tags: Array.isArray(tags) ? tags : [],
  }

  try {
    await persistOperativo(op)
  } catch {
    return err(`No se pudo persistir el ${tipo === 'operativo' ? 'operativo' : 'informe'}. Reintenta.`, 503)
  }
  return NextResponse.json({ mensaje: `✅ ${tipo === 'operativo' ? 'Operativo' : 'Informe'} creado`, id, estado: estadoInicial }, { status: 201 })
}
