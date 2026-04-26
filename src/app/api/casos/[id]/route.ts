import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuid } from 'uuid'
import { getUser, unauthorized, forbidden, notFound, err, isUserFrozen, frozen } from '@/lib/auth'
import { deleteCasoById, getCasosDB, CasosDB, persistCaso, canAccessCaso } from '@/lib/casos-db'

const ESTADOS = new Set(['abierto', 'en_progreso', 'cerrado', 'archivado'])
const PRIORIDADES = new Set(['baja', 'media', 'alta', 'critica'])

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = getUser(req); if (!u) return unauthorized()
  const { id } = await params
  const CasosDB = await getCasosDB()
  const c = CasosDB.get(id); if (!c) return notFound()
  if (!canAccessCaso(c, u.username, u.rol)) return forbidden()
  return NextResponse.json(c)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = getUser(req); if (!u) return unauthorized()
  if (await isUserFrozen(u.id)) return frozen()
  const { id } = await params
  const CasosDB = await getCasosDB()
  const c = CasosDB.get(id); if (!c) return notFound()
  if (!['command_staff','supervisory'].includes(u.rol) && c.creadoPor!==u.username) return forbidden()
  const body = await req.json().catch(()=>({}))
  const now  = new Date().toISOString()
  const next = JSON.parse(JSON.stringify(c)) as typeof c
  if (body.titulo !== undefined) {
    const titulo = String(body.titulo).trim()
    if (!titulo || titulo.length > 180) return err('Titulo invalido (1-180 caracteres)')
    next.titulo = titulo
  }
  if (body.descripcion !== undefined) {
    const descripcion = String(body.descripcion).trim()
    if (descripcion.length > 4000) return err('Descripcion demasiado larga (maximo 4000)')
    next.descripcion = descripcion
  }
  if (body.estado       !== undefined) {
    const estado = String(body.estado)
    if (!ESTADOS.has(estado)) return err('Estado invalido')
    next.estado = estado as any
    if (estado === 'cerrado') next.cerradoEn = now
    const motivo = String(body.motivo || '').slice(0, 300)
    next.timeline.push({ id:uuid().slice(0,8), fecha:now, accion:`Estado: ${estado}`, detalle:motivo, autor:u.username })
  }
  if (body.prioridad !== undefined) {
    const prioridad = String(body.prioridad)
    if (!PRIORIDADES.has(prioridad)) return err('Prioridad invalida')
    next.prioridad = prioridad as any
  }
  if (body.agentesAsignados !== undefined) {
    if (!Array.isArray(body.agentesAsignados)) return err('agentesAsignados debe ser un arreglo')
    const agentes = body.agentesAsignados.map((x: any) => String(x).trim()).filter(Boolean)
    if (agentes.length > 50) return err('Demasiados agentes asignados')
    next.agentesAsignados = agentes
    // Sincronizar agentesAcceso: agregar nuevos agentes asignados, mantener los que ya tenían acceso explícito
    const accesoActual = new Set(next.agentesAcceso || [])
    agentes.forEach((a: string) => accesoActual.add(a))
    next.agentesAcceso = Array.from(accesoActual)
  }
  if (body.addSospechoso) {
    const nombre = String(body.addSospechoso?.nombre || '').trim()
    if (!nombre || nombre.length > 160) return err('Sospechoso invalido: nombre requerido (maximo 160)')
    const sospechoso = {
      id: uuid().slice(0,8),
      nombre,
      alias: String(body.addSospechoso?.alias || '').slice(0, 120),
      descripcion: String(body.addSospechoso?.descripcion || '').slice(0, 500),
      estado: ['buscado','detenido','liberado','profugo', 'prófugo'].includes(String(body.addSospechoso?.estado || 'buscado'))
        ? (String(body.addSospechoso?.estado || 'buscado') === 'profugo' ? 'prófugo' : String(body.addSospechoso?.estado || 'buscado'))
        : 'buscado',
    }
      next.sospechosos.push(sospechoso as any)
      next.timeline.push({ id:uuid().slice(0,8), fecha:now, accion:'Sospechoso agregado', detalle:nombre, autor:u.username })
  }
  if (body.addEvidencia) {
    const titulo = String(body.addEvidencia?.titulo || '').trim()
    if (!titulo || titulo.length > 180) return err('Evidencia invalida: titulo requerido (maximo 180)')
    const evidencia = {
      id: uuid().slice(0,8),
      titulo,
      tipo: String(body.addEvidencia?.tipo || 'otro').slice(0, 80),
      descripcion: String(body.addEvidencia?.descripcion || '').slice(0, 1200),
      subidoPor: u.username,
      fecha: now,
      url: body.addEvidencia?.url ? String(body.addEvidencia.url).slice(0, 1000) : undefined,
    }
    next.evidencias.push(evidencia as any)
    next.timeline.push({ id:uuid().slice(0,8), fecha:now, accion:'Evidencia agregada', detalle:titulo, autor:u.username })
  }
  if (body.addNota) {
    const contenido = String(body.addNota?.contenido || '').trim()
    if (!contenido || contenido.length > 3000) return err('Nota invalida (1-3000 caracteres)')
    next.notas.push({ id:uuid().slice(0,8), autor:u.username, fecha:now, contenido, privada:!!body.addNota?.privada })
  }
  if (body.addLinea) {
    const titulo = String(body.addLinea?.titulo || '').trim()
    if (!titulo || titulo.length > 160) return err('Linea invalida: titulo requerido (maximo 160)')
    if (!next.lineas) next.lineas = []
    next.lineas.push({ id:uuid().slice(0,8), titulo, detalle:String(body.addLinea?.detalle||'').slice(0,1000), estado:['activa','descartada','confirmada'].includes(body.addLinea?.estado)?body.addLinea.estado:'activa', autor:u.username, fecha:now })
    next.timeline.push({ id:uuid().slice(0,8), fecha:now, accion:'Línea de investigación', detalle:titulo, autor:u.username })
  }
  if (body.updateLinea) {
    if (!next.lineas) next.lineas = []
    const idx = next.lineas.findIndex((l:any) => l.id === body.updateLinea.id)
    if (idx >= 0) {
      next.lineas[idx] = { ...next.lineas[idx], ...body.updateLinea, autor:u.username }
    }
  }
  if (body.removeLinea) {
    if (!next.lineas) next.lineas = []
    next.lineas = next.lineas.filter((l:any) => l.id !== body.removeLinea)
  }
  if (body.addCasoRelacionado) {
    const { casoId, numeroCaso, titulo, relacion } = body.addCasoRelacionado
    if (!casoId || !numeroCaso) return err('casoId y numeroCaso son requeridos')
    if (!next.casosRelacionados) next.casosRelacionados = []
    if (!next.casosRelacionados.find((r:any) => r.casoId === casoId)) {
      next.casosRelacionados.push({ casoId, numeroCaso, titulo:titulo||'', relacion:relacion||'relacionado', fecha:now, autor:u.username })
      next.timeline.push({ id:uuid().slice(0,8), fecha:now, accion:'Caso relacionado vinculado', detalle:`${numeroCaso} — ${titulo||''}`, autor:u.username })
      // Auto-vincular el otro caso (best-effort)
      try {
        const otherCaso = CasosDB.get(casoId)
        if (otherCaso) {
          if (!otherCaso.casosRelacionados) otherCaso.casosRelacionados = []
          if (!otherCaso.casosRelacionados.find((r:any) => r.casoId === id)) {
            otherCaso.casosRelacionados.push({ casoId:id, numeroCaso:next.numeroCaso, titulo:next.titulo, relacion:relacion||'relacionado', fecha:now, autor:u.username })
            otherCaso.timeline = [...(otherCaso.timeline||[]), { id:uuid().slice(0,8), fecha:now, accion:'Caso relacionado vinculado', detalle:`${next.numeroCaso} — ${next.titulo}`, autor:u.username }]
            otherCaso.actualizadoEn = now
            await persistCaso(otherCaso)
          }
        }
      } catch { /* non-fatal */ }
    }
  }
  if (body.removeCasoRelacionado) {
    if (!next.casosRelacionados) next.casosRelacionados = []
    next.casosRelacionados = next.casosRelacionados.filter((r:any) => r.casoId !== body.removeCasoRelacionado)
    // Auto-desvincular el otro caso (bidireccional)
    try {
      const otherCaso = CasosDB.get(body.removeCasoRelacionado)
      if (otherCaso) {
        otherCaso.casosRelacionados = (otherCaso.casosRelacionados || []).filter((r:any) => r.casoId !== id)
        otherCaso.timeline = [...(otherCaso.timeline||[]), { id:uuid().slice(0,8), fecha:now, accion:'Vínculo eliminado', detalle:`Desvinculado de ${next.numeroCaso}`, autor:u.username }]
        otherCaso.actualizadoEn = now
        await persistCaso(otherCaso)
      }
    } catch { /* non-fatal */ }
  }
  if (body.addTimeline) {
    const accion = String(body.addTimeline?.accion || '').trim()
    if (!accion || accion.length > 120) return err('Timeline invalido: accion requerida (maximo 120)')
    const detalle = String(body.addTimeline?.detalle || '').slice(0, 600)
    next.timeline.push({ id:uuid().slice(0,8), fecha:now, accion, detalle, autor:u.username })
  }
  next.actualizadoEn = now
  try {
    await persistCaso(next)
  } catch {
    return err('No se pudo persistir el caso. Reintenta.', 503)
  }
  return NextResponse.json({ mensaje:'✅ Caso actualizado' })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = getUser(req); if (!u) return unauthorized()
  if (await isUserFrozen(u.id)) return frozen()
  if (u.rol !== 'command_staff') return forbidden()
  const { id } = await params
  const CasosDB = await getCasosDB()
  if (!CasosDB.has(id)) return notFound()
  try {
    await deleteCasoById(id)
  } catch {
    return err('No se pudo eliminar el caso. Reintenta.', 503)
  }
  return NextResponse.json({ mensaje:'✅ Caso eliminado' })
}
