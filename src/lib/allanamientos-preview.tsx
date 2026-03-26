// Shared renderer for allanamiento preview PNG.
// Used by both the preview-image route and the Discord webhook
// to avoid self-referencing HTTP calls on serverless.
import { ImageResponse } from 'next/og'
import { PDFDocument } from 'pdf-lib'

function statusLabel(raw: string) {
  if (raw === 'autorizado') return 'AUTORIZADO'
  if (raw === 'denegado') return 'DENEGADO'
  if (raw === 'ejecutado') return 'EJECUTADO'
  return 'PENDIENTE'
}

function statusColor(raw: string) {
  if (raw === 'autorizado') return '#22c55e'
  if (raw === 'denegado') return '#ef4444'
  if (raw === 'ejecutado') return '#3b82f6'
  return '#eab308'
}

function parseNumeroSolicitud(raw: string) {
  const value = String(raw || '').trim()
  const parts = value.split('//').map((p) => p.trim())
  return { principal: parts[0] || value, detalle: parts[1] || '' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function renderAllanamientoPNG(item: any): Promise<Buffer> {
  const estado = statusLabel(item.estado)
  const estadoColor = statusColor(item.estado)
  const fecha = new Date(item.fechaSolicitud).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const supervisorFirma    = item.firmas?.find((f: any) => f.tipo === 'supervisor')    || item.firmas?.[0] || null
  const autorizacionFirma  = item.firmas?.find((f: any) => f.tipo === 'autorizacion')  || item.firmas?.[0] || null
  const solicitante = `${item.nombreSolicitante}${item.callsignSolicitante ? ` [${item.callsignSolicitante}]` : ''}`
  const stampColor =
    item.estado === 'autorizado' ? 'rgba(34,197,94,0.16)'  :
    item.estado === 'denegado'   ? 'rgba(239,68,68,0.16)'  :
    item.estado === 'ejecutado'  ? 'rgba(59,130,246,0.16)' :
                                   'rgba(234,179,8,0.16)'
  const motivacion    = String(item.motivacion    || '—').slice(0, 700)
  const descripcion   = String(item.descripcion   || '—').slice(0, 640)
  const observaciones = String(item.observaciones || '').trim()
  const casoVinculado = String(item.casoVinculado || '').trim()
  const numeroSolicitud = parseNumeroSolicitud(item.numeroSolicitud)
  const sigFecha = (f: any) => f?.fecha ? new Date(f.fecha).toLocaleDateString('es-ES') : '—'
  const sigRol   = (f: any) => String((f?.rol || 'sin firma').replace(/_/g, ' ')).toUpperCase()

  const ir = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          background: '#f8f3e8',
          color: '#0f172a',
          fontFamily: '"Segoe UI", Trebuchet MS, Arial, sans-serif',
        }}
      >
        {/* Top accent bars */}
        <div style={{ display: 'flex', height: 10, background: '#111827' }} />
        <div style={{ display: 'flex', height: 5,  background: '#c9a227' }} />

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '34px 88px 22px', gap: 28 }}>
          {/* Logo + title */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 26, flex: 1, minWidth: 0 }}>
            <img src="https://i.imgur.com/7NxeszI.png" width={114} height={114} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#a16207', fontSize: 15, letterSpacing: 3, fontFamily: 'monospace' }}>Federal Investigation Bureau — HQ</span>
              <span style={{ color: '#111827', fontSize: 52, fontWeight: 700, letterSpacing: 1, lineHeight: 1, marginTop: 8 }}>SOLICITUD DE ALLANAMIENTO</span>
              <span style={{ color: '#64748b', fontSize: 14, letterSpacing: 6, fontFamily: 'monospace', marginTop: 7 }}>REPORTE OPERATIVO CLASIFICADO</span>
            </div>
          </div>
          {/* Number / date / status */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: 400, flexShrink: 0 }}>
            <span style={{ color: '#64748b', fontSize: 11, letterSpacing: 4, fontFamily: 'monospace' }}>N° SOLICITUD</span>
            <span style={{ color: '#0f172a', fontSize: 40, fontWeight: 700, marginTop: 4, textAlign: 'right', lineHeight: 1 }}>{numeroSolicitud.principal}</span>
            {numeroSolicitud.detalle ? (
              <span style={{ color: '#475569', fontSize: 12, fontFamily: 'monospace', marginTop: 4, textAlign: 'right' }}>{numeroSolicitud.detalle}</span>
            ) : null}
            <span style={{ color: '#64748b', fontSize: 13, fontFamily: 'monospace', marginTop: 8 }}>{fecha}</span>
            <div style={{ display: 'flex', marginTop: 10, border: `2px solid ${estadoColor}`, padding: '5px 20px' }}>
              <span style={{ color: estadoColor, fontSize: 13, letterSpacing: 3, fontFamily: 'monospace', fontWeight: 700 }}>{estado}</span>
            </div>
          </div>
        </div>

        {/* Gold rule */}
        <div style={{ display: 'flex', height: 2, background: '#c9a227', margin: '0 88px' }} />

        {/* Unit / agent bar */}
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', background: '#111827', padding: '11px 88px', marginTop: 14 }}>
          <span style={{ color: '#9ca3af', fontSize: 14, fontFamily: 'monospace', letterSpacing: 2 }}>{'UNIDAD: ' + String(item.unidad || 'General').toUpperCase()}</span>
          <span style={{ color: '#22c55e',  fontSize: 14, fontFamily: 'monospace', letterSpacing: 2 }}>{'AGENTE: ' + String(item.nombreSolicitante || '').slice(0, 42)}</span>
        </div>

        {/* ── CONTENT ── */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '24px 88px 0', gap: 22 }}>

          {/* OBJETIVO */}
          <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '5px solid #c9a227', paddingLeft: 20 }}>
            <span style={{ color: '#64748b', fontSize: 11, letterSpacing: 5, fontFamily: 'monospace', marginBottom: 8 }}>OBJETIVO</span>
            <span style={{ fontSize: 34, lineHeight: 1.22, color: '#0f172a', fontFamily: 'Georgia, serif' }}>{'Dirección: ' + String(item.direccion || '—').slice(0, 130)}</span>
            <span style={{ fontSize: 34, lineHeight: 1.22, color: '#0f172a', fontFamily: 'Georgia, serif', marginTop: 7 }}>{'Sospechoso(s): ' + String(item.sospechoso || 'Sin identificar').slice(0, 130)}</span>
          </div>

          {/* MOTIVACION */}
          <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '5px solid #c9a227', paddingLeft: 20 }}>
            <span style={{ color: '#64748b', fontSize: 11, letterSpacing: 5, fontFamily: 'monospace', marginBottom: 8 }}>MOTIVACIÓN / FUNDAMENTO LEGAL</span>
            <span style={{ fontSize: 31, lineHeight: 1.38, color: '#1e293b', fontFamily: 'Georgia, serif' }}>{motivacion}</span>
          </div>

          {/* DESCRIPCION */}
          <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '5px solid #c9a227', paddingLeft: 20 }}>
            <span style={{ color: '#64748b', fontSize: 11, letterSpacing: 5, fontFamily: 'monospace', marginBottom: 8 }}>DESCRIPCIÓN OPERATIVA</span>
            <span style={{ fontSize: 31, lineHeight: 1.38, color: '#1e293b', fontFamily: 'Georgia, serif' }}>{descripcion}</span>
          </div>

          {/* OBSERVACIONES (conditional) */}
          {observaciones ? (
            <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '5px solid #3b82f6', paddingLeft: 20 }}>
              <span style={{ color: '#3b82f6', fontSize: 11, letterSpacing: 5, fontFamily: 'monospace', marginBottom: 8 }}>OBSERVACIONES</span>
              <span style={{ fontSize: 30, lineHeight: 1.38, color: '#334155', fontFamily: 'Georgia, serif' }}>{observaciones.slice(0, 440)}</span>
            </div>
          ) : null}

          {/* CASO VINCULADO (conditional) */}
          {casoVinculado ? (
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 14, background: '#1e293b', padding: '11px 18px' }}>
              <span style={{ color: '#94a3b8', fontSize: 13, fontFamily: 'monospace', letterSpacing: 2 }}>CASO VINCULADO:</span>
              <span style={{ color: '#e2e8f0', fontSize: 14, fontFamily: 'monospace' }}>{casoVinculado.slice(0, 90)}</span>
            </div>
          ) : null}

        </div>

        {/* Spacer */}
        <div style={{ display: 'flex', flex: 1, minHeight: 32 }} />

        {/* ── SIGNATURES ── */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: 26, padding: '0 88px 28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, border: '1px solid #c9a227', padding: '20px 24px', minHeight: 178 }}>
            <span style={{ color: '#a16207', fontSize: 11, letterSpacing: 4, fontFamily: 'monospace' }}>FIRMA DE SUPERVISOR</span>
            <div style={{ display: 'flex', flex: 1 }} />
            <div style={{ display: 'flex', height: 1, background: '#c9a227', marginBottom: 10 }} />
            <span style={{ color: '#111827', fontSize: 25 }}>{supervisorFirma?.nombre || 'Pendiente'}</span>
            <span style={{ color: '#64748b', fontSize: 11, letterSpacing: 2, fontFamily: 'monospace', marginTop: 4 }}>{sigRol(supervisorFirma)}</span>
            <span style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'monospace', marginTop: 2 }}>{sigFecha(supervisorFirma)}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, border: '1px solid #c9a227', padding: '20px 24px', minHeight: 178 }}>
            <span style={{ color: '#a16207', fontSize: 11, letterSpacing: 4, fontFamily: 'monospace' }}>AUTORIZACIÓN OFICIAL</span>
            <div style={{ display: 'flex', flex: 1 }} />
            <div style={{ display: 'flex', height: 1, background: '#c9a227', marginBottom: 10 }} />
            <span style={{ color: '#111827', fontSize: 25 }}>{autorizacionFirma?.nombre || 'Pendiente'}</span>
            <span style={{ color: '#64748b', fontSize: 11, letterSpacing: 2, fontFamily: 'monospace', marginTop: 4 }}>{sigRol(autorizacionFirma)}</span>
            <span style={{ color: '#94a3b8', fontSize: 11, fontFamily: 'monospace', marginTop: 2 }}>{sigFecha(autorizacionFirma)}</span>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ display: 'flex', height: 2, background: '#c9a227' }} />
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', background: '#111827', padding: '12px 88px' }}>
          <span style={{ color: '#9ca3af', fontSize: 12, letterSpacing: 2, fontFamily: 'monospace' }}>{'SOLICITANTE: ' + solicitante}</span>
          <span style={{ color: '#4b5563', fontSize: 12, letterSpacing: 2, fontFamily: 'monospace' }}>FIB HQ — DOCUMENTO CONFIDENCIAL</span>
        </div>
        <div style={{ display: 'flex', height: 5, background: '#c9a227' }} />
        <div style={{ display: 'flex', height: 8, background: '#111827' }} />

        {/* Watermark stamp */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: 430,
            top: 860,
            fontSize: 148,
            letterSpacing: 8,
            fontWeight: 700,
            color: stampColor,
            fontFamily: '"Segoe UI", Arial, sans-serif',
            transform: 'rotate(-28deg)',
          }}
        >
          {estado}
        </div>
      </div>
    ),
    { width: 1480, height: 1600 }
  )

  return Buffer.from(await ir.arrayBuffer())
}

export async function renderAllanamientoPDF(item: any): Promise<Buffer> {
  const pngBuffer = await renderAllanamientoPNG(item)
  const pdf = await PDFDocument.create()
  const pngImage = await pdf.embedPng(pngBuffer)
  const page = pdf.addPage([pngImage.width, pngImage.height])
  page.drawImage(pngImage, {
    x: 0,
    y: 0,
    width: pngImage.width,
    height: pngImage.height,
  })
  const bytes = await pdf.save()
  return Buffer.from(bytes)
}
