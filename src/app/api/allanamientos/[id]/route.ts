import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuid } from 'uuid'
import { getUser, unauthorized, forbidden, notFound, err, isUserFrozen, frozen } from '@/lib/auth'
import { deleteAllanamientoById, getAllanamientosDB, persistAllanamiento, type Firma } from '@/lib/allanamientos-db'
import { getDB } from '@/lib/db'
import { logAllanamiento, logAllanamientoAutorizadoCard, logAllanamientoDocumentoGenerado, logAllanamientoHallazgo } from '@/lib/webhook'

type P = { params: Promise<{id:string}> }

function getPublicBaseUrl(req: NextRequest) {
  const envBase =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.URL
  if (envBase) return envBase.replace(/\/$/, '')
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  if (host) return `${proto}://${host}`
  return new URL(req.url).origin
}

function buildPreviewUrl(req: NextRequest, allanamientoId: string) {
  const base = getPublicBaseUrl(req)
  return `${base}/api/allanamientos/${allanamientoId}/preview-image.png?t=${Date.now()}`
}

export async function GET(req: NextRequest, { params }:P) {
  const u = getUser(req); if (!u) return unauthorized()
  const { id } = await params
  const db = await getAllanamientosDB()
  const a = db.get(id); if (!a) return notFound()
  if (u.rol==='federal_agent' && a.solicitadoPor!==u.username) return forbidden()
  return NextResponse.json(a)
}

export async function PATCH(req: NextRequest, { params }:P) {
  const u = getUser(req); if (!u) return unauthorized()
  if (await isUserFrozen(u.id)) return frozen()
  const { id } = await params
  const [allDB, userDB] = await Promise.all([getAllanamientosDB(), getDB()])
  const a = allDB.get(id); if (!a) return notFound()
  const body = await req.json().catch(()=>({}))
  const now  = new Date().toISOString()
  const isSuperv = ['command_staff','supervisory'].includes(u.rol)
  const userProfile = Array.from(userDB.users.values()).find(us => us.username === u.username)
  const accion = String(body.accion || '')
  const next = JSON.parse(JSON.stringify(a)) as typeof a
  const afterPersist: Array<() => Promise<void> | void> = []

  if (body.mensaje) {
    const canMessage = isSuperv || (next.solicitadoPor === u.username && next.estado === 'pendiente')
    if (!canMessage) return forbidden()
    const contenido = String(body.mensaje).trim()
    if (!contenido || contenido.length > 2000) return err('Mensaje invalido (1-2000 caracteres)')
    next.mensajes.push({
      id: uuid().slice(0,8), autor:u.username, nombre:u.nombre||u.username,
      contenido, fecha:now, tipo:'mensaje'
    })
  }

  if (accion === 'autorizar' && isSuperv) {
    next.estado = 'autorizado'
    const firma: Firma = {
      username:u.username, nombre:u.nombre||u.username,
      callsign:userProfile?.callsign||null, rol:u.rol,
      fecha:now, tipo:'autorizacion'
    }
    next.firmas.push(firma)
    next.mensajes.push({ id:uuid().slice(0,8), autor:'SYSTEM', nombre:'Sistema',
      contenido:`✅ Autorizado por ${u.nombre||u.username} (${u.rol})`, fecha:now, tipo:'accion' })
    if (body.observaciones !== undefined) {
      const observaciones = String(body.observaciones).trim()
      if (observaciones.length > 1200) return err('Observaciones demasiado largas (maximo 1200)')
      next.observaciones = observaciones
    }
    const previewUrl = buildPreviewUrl(req, next.id)
    afterPersist.push(() => logAllanamiento('Autorizado', next.numeroSolicitud, u.username))
    afterPersist.push(() => logAllanamientoAutorizadoCard({
      numero: next.numeroSolicitud,
      direccion: next.direccion,
      solicitadoPor: next.nombreSolicitante,
      autorizadoPor: u.nombre || u.username,
      observaciones: next.observaciones,
      previewUrl,
    }))
  }

  if (accion === 'denegar' && isSuperv) {
    const motivo = String(body.motivo || '').trim()
    if (!motivo || motivo.length > 500) return err('Motivo invalido (1-500 caracteres)')
    next.estado = 'denegado'
    next.motivoDenegacion = motivo
    next.mensajes.push({ id:uuid().slice(0,8), autor:'SYSTEM', nombre:'Sistema',
      contenido:`❌ Denegado por ${u.nombre||u.username}: ${next.motivoDenegacion}`, fecha:now, tipo:'accion' })
    afterPersist.push(() => logAllanamiento('Denegado', next.numeroSolicitud ?? undefined, u.username, next.motivoDenegacion ?? undefined))
  }

  if (accion === 'ejecutar' && isSuperv) {
    next.estado = 'ejecutado'; next.fechaEjecucion = now
    next.mensajes.push({ id:uuid().slice(0,8), autor:'SYSTEM', nombre:'Sistema',
      contenido:`✅ Marcado como ejecutado por ${u.nombre||u.username}`, fecha:now, tipo:'accion' })
  }

  if (accion === 'firmar' && isSuperv) {
    const yaFirmo = next.firmas.some(f => f.username === u.username)
    if (!yaFirmo) {
      const tipoFirmaRaw = String(body.tipoFirma || 'supervisor')
      const tipoFirma = ['autorizacion', 'fiscal', 'supervisor'].includes(tipoFirmaRaw) ? tipoFirmaRaw : 'supervisor'
      next.firmas.push({ username:u.username, nombre:u.nombre||u.username,
        callsign:userProfile?.callsign||null, rol:u.rol, fecha:now, tipo:tipoFirma as any })
      next.mensajes.push({ id:uuid().slice(0,8), autor:'SYSTEM', nombre:'Sistema',
        contenido:`✍️ Firmado por ${u.nombre||u.username}`, fecha:now, tipo:'accion' })
    }
  }

  if (accion === 'generar_pdf') {
    const canGenerate = isSuperv || next.solicitadoPor === u.username
    if (!canGenerate) return forbidden()
    const previewUrl = buildPreviewUrl(req, next.id)
    next.mensajes.push({
      id: uuid().slice(0,8),
      autor: 'SYSTEM',
      nombre: 'Sistema',
      contenido: `📄 Documento generado por ${u.nombre || u.username}`,
      fecha: now,
      tipo: 'documento',
      htmlSnapshot: previewUrl,
    })
    afterPersist.push(() => logAllanamientoDocumentoGenerado({
      numero: next.numeroSolicitud,
      direccion: next.direccion,
      generadoPor: u.nombre || u.username,
      previewUrl,
    }))
  }

  if (accion === 'reporte_hallazgo') {
    const canReport = isSuperv || next.solicitadoPor === u.username
    if (!canReport) return forbidden()

    const hallazgo = String(body.hallazgo || '').trim()
    const propiedad = String(body.propiedad || '').trim()
    const evidenciaUrl = String(body.evidenciaUrl || '').trim()
    if (!hallazgo || !propiedad) return err('hallazgo y propiedad son requeridos')
    if (hallazgo.length > 1200 || propiedad.length > 600) return err('Texto demasiado largo en informe')

    if (evidenciaUrl) {
      const isValidUrl = /^https?:\/\//i.test(evidenciaUrl)
      const maybeImage = /(imgur\.com|\.png($|\?)|\.jpg($|\?)|\.jpeg($|\?)|\.webp($|\?))/i.test(evidenciaUrl)
      if (!isValidUrl || !maybeImage) return err('Evidencia invalida. Usa URL de imagen (Imgur/PNG/JPG)')
    }

    const contenido = [
      '📌 Informe de Hallazgo',
      `Hallazgo: ${hallazgo}`,
      `Propiedad/Ubicación: ${propiedad}`,
      evidenciaUrl ? `Evidencia: ${evidenciaUrl}` : 'Evidencia: —',
    ].join('\n')

    next.mensajes.push({
      id: uuid().slice(0, 8),
      autor: u.username,
      nombre: u.nombre || u.username,
      contenido,
      fecha: now,
      tipo: 'informe',
    })

    afterPersist.push(() => logAllanamientoHallazgo({
      numero: next.numeroSolicitud,
      reportadoPor: u.nombre || u.username,
      hallazgo,
      propiedad,
      evidenciaUrl,
    }))
  }

  if (accion && !['autorizar', 'denegar', 'ejecutar', 'firmar', 'generar_pdf', 'reporte_hallazgo'].includes(accion)) {
    return err('Accion invalida')
  }

  next.actualizadoEn = now
  try {
    await persistAllanamiento(next)
  } catch {
    return err('No se pudo persistir el allanamiento. Reintenta.', 503)
  }
  await Promise.allSettled(afterPersist.map((task) => Promise.resolve(task())))
  return NextResponse.json({ mensaje:'✅ Actualizado', estado:next.estado })
}

export async function DELETE(req: NextRequest, { params }:P) {
  const u = getUser(req); if (!u) return unauthorized()
  if (await isUserFrozen(u.id)) return frozen()
  if (u.rol !== 'command_staff') return forbidden()
  const { id } = await params
  const db = await getAllanamientosDB()
  if (!db.has(id)) return notFound()
  try {
    await deleteAllanamientoById(id)
  } catch {
    return err('No se pudo eliminar el allanamiento. Reintenta.', 503)
  }
  return NextResponse.json({ mensaje:'✅ Eliminado' })
}
