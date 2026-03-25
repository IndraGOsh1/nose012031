import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuid } from 'uuid'
import { getUser, unauthorized, err, isUserFrozen, frozen } from '@/lib/auth'
import { getAllanamientosDB, nextAllNumber, persistAllanamiento, type Allanamiento } from '@/lib/allanamientos-db'
import { getDB } from '@/lib/db'
import { logAllanamiento } from '@/lib/webhook'

export async function GET(req: NextRequest) {
  const u = getUser(req); if (!u) return unauthorized()
  const { searchParams } = new URL(req.url)
  const estado = searchParams.get('estado')
  const db = await getAllanamientosDB()
  let lista = Array.from(db.values())
  if (u.rol === 'federal_agent') lista = lista.filter(a => a.solicitadoPor === u.username)
  if (estado) lista = lista.filter(a => a.estado === estado)
  lista.sort((a,b) => new Date(b.fechaSolicitud).getTime() - new Date(a.fechaSolicitud).getTime())
  return NextResponse.json(lista)
}

export async function POST(req: NextRequest) {
  const u = getUser(req); if (!u) return unauthorized()
  if (await isUserFrozen(u.id)) return frozen()
  const { direccion, motivacion, descripcion, sospechoso, casoVinculado, unidad } = await req.json().catch(()=>({}))
  if (!direccion?.trim() || !motivacion?.trim()) return err('direccion y motivacion son requeridos')
  const [allDB, userDB] = await Promise.all([getAllanamientosDB(), getDB()])
  const userProfile = Array.from(userDB.users.values()).find(us => us.username === u.username)
  const now = new Date().toISOString()
  const numeroSolicitud = nextAllNumber()
  const all: Allanamiento = {
    id: 'all-' + uuid().slice(0,8),
    numeroSolicitud,
    direccion:direccion.trim(), motivacion:motivacion.trim(),
    descripcion:descripcion?.trim()||'',
    sospechoso:sospechoso||'Sin identificar',
    casoVinculado:casoVinculado||null,
    estado:'pendiente',
    solicitadoPor:u.username, nombreSolicitante:u.nombre||u.username,
    callsignSolicitante: userProfile?.callsign||null,
    unidad:unidad||'General',
    fechaSolicitud:now, firmas:[],
    motivoDenegacion:null, observaciones:'',
    mensajes:[{
      id:uuid().slice(0,8), autor:'SYSTEM', nombre:'Sistema',
      contenido:`Solicitud ${numeroSolicitud} creada por ${u.nombre||u.username}`,
      fecha:now, tipo:'sistema'
    }],
    actualizadoEn:now,
  }
  try {
    await persistAllanamiento(all)
  } catch {
    return err('No se pudo persistir la solicitud de allanamiento. Reintenta.', 503)
  }
  logAllanamiento('Creada', all.numeroSolicitud, u.username, direccion)
  return NextResponse.json({ mensaje:'✅ Solicitud enviada', id:all.id, numero:all.numeroSolicitud }, { status:201 })
}
