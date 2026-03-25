import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuid } from 'uuid'
import { getUser, unauthorized, err, isUserFrozen, frozen } from '@/lib/auth'
import { getCasosDB, nextCaseNumber, persistCaso, type Caso } from '@/lib/casos-db'

export async function GET(req: NextRequest) {
  const u = getUser(req); if (!u) return unauthorized()
  const { searchParams } = new URL(req.url)
  const estado = searchParams.get('estado')
  const unidad = searchParams.get('unidad')

  const CasosDB = await getCasosDB()
  let lista = Array.from(CasosDB.values())
  if (u.rol === 'federal_agent') lista = lista.filter(c => c.agentesAsignados.includes(u.username) || c.creadoPor === u.username)
  if (u.rol === 'visitante') lista = lista.filter(c => c.clasificacion !== 'confidencial')
  if (estado) lista = lista.filter(c => c.estado === estado)
  if (unidad) lista = lista.filter(c => c.unidad === unidad)
  lista.sort((a,b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime())
  return NextResponse.json(lista)
}

export async function POST(req: NextRequest) {
  const u = getUser(req); if (!u) return unauthorized()
  if (await isUserFrozen(u.id)) return frozen()
  const { titulo, descripcion, tipo, prioridad, unidad, clasificacion, agentesAsignados } = await req.json().catch(()=>({}))
  if (!titulo?.trim() || !tipo) return err('titulo y tipo son requeridos')

  const CasosDB = await getCasosDB()
  const now = new Date().toISOString()
  const caso: Caso = {
    id: `caso-${uuid().slice(0,8)}`,
    numeroCaso: nextCaseNumber(),
    titulo: titulo.trim(), descripcion: descripcion?.trim()||'',
    tipo, estado:'abierto', prioridad: prioridad||'media',
    unidad: unidad||'General', agenteLead: u.username,
    agentesAsignados: agentesAsignados||[u.username],
    sospechosos:[], evidencias:[], notas:[], timeline:[
      { id:uuid().slice(0,8), fecha:now, accion:'Caso abierto', detalle:`Caso creado por ${u.nombre||u.username}`, autor:u.username }
    ],
    clasificacion: clasificacion||'interno',
    creadoPor:u.username, creadoEn:now, actualizadoEn:now,
  }
  try {
    await persistCaso(caso)
  } catch {
    return err('No se pudo persistir el caso. Reintenta.', 503)
  }
  return NextResponse.json({ mensaje:'✅ Caso creado', id:caso.id, numeroCaso:caso.numeroCaso }, { status:201 })
}
