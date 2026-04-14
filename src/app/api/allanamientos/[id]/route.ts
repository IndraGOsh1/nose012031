import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuid } from 'uuid'
import { getUser, unauthorized, forbidden, notFound, err, isUserFrozen, frozen } from '@/lib/auth'
import { deleteAllanamientoById, getAllanamientosDB, persistAllanamiento, removeAllanamientoAuthorization, updateAllanamientoWithAuthorization, type Firma } from '@/lib/allanamientos-db'
import { getDB } from '@/lib/db'
import { logAllanamiento, logAllanamientoDocumentoGenerado, logAllanamientoHallazgo, logAllanamientoAutorizado, logAllanamientoEjecutado } from '@/lib/webhook'
import { renderAllanamientoPDF, renderAllanamientoPNG } from '@/lib/allanamientos-preview'
import { getRows, findAgent, COL } from '@/lib/sheets'
import { CONFIG } from '@/lib/config'
import { recordAuditEvent } from '@/lib/audit-log'

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
  const isCS = u.rol === 'command_staff'
  const isIndra = String(u.username || '').toLowerCase() === 'indra'
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

  if (accion === 'editar') {
    const canEdit = isCS || isIndra
    if (!canEdit) return forbidden()

    const direccion = body.direccion !== undefined ? String(body.direccion || '').trim() : next.direccion
    const motivacion = body.motivacion !== undefined ? String(body.motivacion || '').trim() : next.motivacion
    const descripcion = body.descripcion !== undefined ? String(body.descripcion || '').trim() : next.descripcion
    const sospechoso = body.sospechoso !== undefined ? String(body.sospechoso || '').trim() : next.sospechoso
    const unidad = body.unidad !== undefined ? String(body.unidad || '').trim() : next.unidad
    const observaciones = body.observaciones !== undefined ? String(body.observaciones || '').trim() : next.observaciones
    const numeroSolicitud = body.numeroSolicitud !== undefined ? String(body.numeroSolicitud || '').trim() : next.numeroSolicitud

    if (!direccion) return err('Direccion es requerida')
    if (!motivacion) return err('Motivacion es requerida')
    if (!numeroSolicitud) return err('Numero de solicitud es requerido')
    if (direccion.length > 180) return err('Direccion demasiado larga (maximo 180)')
    if (motivacion.length > 3000) return err('Motivacion demasiado larga (maximo 3000)')
    if (descripcion.length > 3000) return err('Descripcion demasiado larga (maximo 3000)')
    if (sospechoso.length > 180) return err('Sospechoso demasiado largo (maximo 180)')
    if (unidad.length > 80) return err('Unidad demasiado larga (maximo 80)')
    if (observaciones.length > 1200) return err('Observaciones demasiado largas (maximo 1200)')
    if (numeroSolicitud.length > 80) return err('Numero de solicitud demasiado largo (maximo 80)')

    next.direccion = direccion
    next.motivacion = motivacion
    next.descripcion = descripcion
    next.sospechoso = sospechoso || 'Sin identificar'
    next.unidad = unidad || 'General'
    next.observaciones = observaciones
    next.numeroSolicitud = numeroSolicitud
    next.mensajes.push({
      id: uuid().slice(0,8),
      autor: 'SYSTEM',
      nombre: 'Sistema',
      contenido: `✏️ Solicitud editada por ${u.nombre || u.username}`,
      fecha: now,
      tipo: 'accion',
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
    let solicitanteCallsign = next.callsignSolicitante || null
    let solicitanteNumero = '—'
    let autorizadorCallsign = userProfile?.callsign || null
    let autorizadorNumero = userProfile?.agentNumber || '—'
    try {
      const rows = await getRows(CONFIG.sheets.personal)
      const idxSolic = findAgent(rows, String(next.nombreSolicitante || next.solicitadoPor || ''))
      if (idxSolic >= 0) {
        solicitanteCallsign = rows[idxSolic]?.[COL.APODO] || solicitanteCallsign
        solicitanteNumero = rows[idxSolic]?.[COL.NUMERO] || solicitanteNumero
      }
      const idxAuthByName = findAgent(rows, String(userProfile?.nombre || u.nombre || u.username || ''))
      const idxAuthByNum = autorizadorNumero ? findAgent(rows, String(autorizadorNumero)) : -1
      const idxAuth = idxAuthByName >= 0 ? idxAuthByName : idxAuthByNum
      if (idxAuth >= 0) {
        autorizadorCallsign = rows[idxAuth]?.[COL.APODO] || autorizadorCallsign
        autorizadorNumero = rows[idxAuth]?.[COL.NUMERO] || autorizadorNumero
      }
    } catch {
      // Fallback to local profile metadata when sheets is unavailable.
    }
    // Update numero with both callsigns
    next.numeroSolicitud = updateAllanamientoWithAuthorization(next.numeroSolicitud, autorizadorCallsign || u.username)

    // Reuse the same preview endpoint rendered in UI to keep Discord and app in sync.
    afterPersist.push(async () => {
      let pngBuffer: Buffer | undefined
      try {
        pngBuffer = await renderAllanamientoPNG(next)
      } catch (pngError) {
        console.error('[PATCH autorizar] Failed to render PNG for webhook:', pngError)
        void recordAuditEvent({
          level: 'error',
          source: 'allanamientos',
          event: 'autorizar_render_png_failed',
          message: 'Failed to render PNG during authorize flow',
          actor: u.username,
          meta: { id: next.id, numeroSolicitud: next.numeroSolicitud, error: pngError instanceof Error ? pngError.message : String(pngError) },
        }).catch(() => {})
      }
      let pdfBuffer: Buffer | undefined
      try {
        pdfBuffer = await renderAllanamientoPDF(next)
      } catch (pdfError) {
        console.error('[PATCH autorizar] Failed to render PDF for webhook:', pdfError)
        void recordAuditEvent({
          level: 'error',
          source: 'allanamientos',
          event: 'autorizar_render_pdf_failed',
          message: 'Failed to render PDF during authorize flow',
          actor: u.username,
          meta: { id: next.id, numeroSolicitud: next.numeroSolicitud, error: pdfError instanceof Error ? pdfError.message : String(pdfError) },
        }).catch(() => {})
      }
      return logAllanamientoAutorizado({
        numero: next.numeroSolicitud,
        autorizadoPor: u.nombre || u.username,
        callsignAutorizador: autorizadorCallsign,
        numeroAgenteAutorizador: autorizadorNumero,
        pngBuffer,
        pdfBuffer,
      }).catch(err => console.error('[PATCH autorizar]', err))
    })
  }

  if (accion === 'quitar_autorizacion') {
    const canRevoke = isCS || isIndra
    if (!canRevoke) return forbidden()
    if (!['autorizado', 'ejecutado'].includes(next.estado)) return err('Solo se puede quitar autorizacion en estado autorizado/ejecutado')

    next.estado = 'pendiente'
    next.fechaEjecucion = undefined
    next.motivoDenegacion = null
    next.numeroSolicitud = removeAllanamientoAuthorization(next.numeroSolicitud)
    next.firmas = []
    next.mensajes.push({
      id: uuid().slice(0,8),
      autor: 'SYSTEM',
      nombre: 'Sistema',
      contenido: `↩️ Autorizacion retirada por ${u.nombre || u.username}`,
      fecha: now,
      tipo: 'accion',
    })

    afterPersist.push(() => logAllanamiento('↩️ Autorización Retirada', `Solicitud ${next.numeroSolicitud} - Retirada por ${u.username}`))
  }

  if (accion === 'denegar' && isSuperv) {
    const motivo = String(body.motivo || '').trim()
    if (!motivo || motivo.length > 500) return err('Motivo invalido (1-500 caracteres)')
    next.estado = 'denegado'
    next.motivoDenegacion = motivo
    next.mensajes.push({ id:uuid().slice(0,8), autor:'SYSTEM', nombre:'Sistema',
      contenido:`❌ Denegado por ${u.nombre||u.username}: ${next.motivoDenegacion}`, fecha:now, tipo:'accion' })
    afterPersist.push(() => logAllanamiento('❌ Allanamiento Denegado', `Solicitud ${next.numeroSolicitud} - Motivo: ${next.motivoDenegacion}`))
  }

  if (accion === 'ejecutar' && isSuperv) {
    next.estado = 'ejecutado'; next.fechaEjecucion = now
    next.mensajes.push({ id:uuid().slice(0,8), autor:'SYSTEM', nombre:'Sistema',
      contenido:`✅ Marcado como ejecutado por ${u.nombre||u.username}`, fecha:now, tipo:'accion' })

    let ejecutorCallsign = userProfile?.callsign || null
    let ejecutorNumero = userProfile?.agentNumber || '—'
    try {
      const rows = await getRows(CONFIG.sheets.personal)
      const idxByName = findAgent(rows, String(userProfile?.nombre || u.nombre || u.username || ''))
      const idxByNum = ejecutorNumero ? findAgent(rows, String(ejecutorNumero)) : -1
      const idx = idxByName >= 0 ? idxByName : idxByNum
      if (idx >= 0) {
        ejecutorCallsign = rows[idx]?.[COL.APODO] || ejecutorCallsign
        ejecutorNumero = rows[idx]?.[COL.NUMERO] || ejecutorNumero
      }
    } catch {
      // Fallback to local profile metadata when sheets is unavailable.
    }

    afterPersist.push(async () => {
      let pngBuffer: Buffer | undefined
      try {
        pngBuffer = await renderAllanamientoPNG(next)
      } catch (pngError) {
        console.error('[PATCH ejecutar] Failed to render PNG for webhook:', pngError)
        void recordAuditEvent({
          level: 'error',
          source: 'allanamientos',
          event: 'ejecutar_render_png_failed',
          message: 'Failed to render PNG during execute flow',
          actor: u.username,
          meta: { id: next.id, numeroSolicitud: next.numeroSolicitud, error: pngError instanceof Error ? pngError.message : String(pngError) },
        }).catch(() => {})
      }
      return logAllanamientoEjecutado({
        numero: next.numeroSolicitud,
        ejecutadoPor: u.nombre || u.username,
        callsignEjecutor: ejecutorCallsign,
        numeroAgenteEjecutor: ejecutorNumero,
        pngBuffer,
      }).catch(err => console.error('[PATCH ejecutar]', err))
    })
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
    const canReport = isSuperv || isIndra || next.solicitadoPor === u.username
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

    let nombreSheet = userProfile?.nombre || u.nombre || u.username
    let numeroAgente = userProfile?.agentNumber || '—'
    let callsign = userProfile?.callsign || '—'
    let lineaSheet = '—'

    try {
      const rows = await getRows(CONFIG.sheets.personal)
      const byName = findAgent(rows, String(userProfile?.nombre || u.nombre || u.username || ''))
      const byNumber = numeroAgente ? findAgent(rows, String(numeroAgente)) : -1
      const idx = byName >= 0 ? byName : byNumber
      if (idx >= 0) {
        const row = rows[idx]
        nombreSheet = row?.[COL.NOMBRE] || nombreSheet
        numeroAgente = row?.[COL.NUMERO] || numeroAgente
        callsign = row?.[COL.APODO] || callsign
        lineaSheet = String(idx + 1)
      }
    } catch {
      // If spreadsheet is unavailable, fallback to user profile metadata.
    }

    const contenido = [
      '📌 Informe de Hallazgo (Allanamiento)',
      `Nombre (columna A): ${nombreSheet}`,
      `Linea de hoja: ${lineaSheet}`,
      `N° Agente (columna H): ${numeroAgente}`,
      `Callsign (columna B): ${callsign}`,
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

  if (accion && !['autorizar', 'quitar_autorizacion', 'denegar', 'ejecutar', 'firmar', 'generar_pdf', 'reporte_hallazgo', 'editar'].includes(accion)) {
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
  const isIndra = String(u.username || '').toLowerCase() === 'indra'
  if (u.rol !== 'command_staff' && !isIndra) return forbidden()
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
