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
  const solicitante = `${item.nombreSolicitante}${item.callsignSolicitante ? ` [${item.callsignSolicitante}]` : ''}`
  const supervisorFirma = item.firmas?.find((f: any) => f.tipo === 'supervisor') || item.firmas?.[0] || null
  const autorizacionFirma = item.firmas?.find((f: any) => f.tipo === 'autorizacion') || item.firmas?.[0] || null
  const stampColor = item.estado === 'autorizado' ? 'rgba(34,197,94,0.14)' : item.estado === 'denegado' ? 'rgba(239,68,68,0.14)' : 'rgba(59,130,246,0.14)'
  const motivacion = String(item.motivacion || '—').slice(0, 460)
  const descripcion = String(item.descripcion || '—').slice(0, 420)
  const numeroSolicitud = parseNumeroSolicitud(item.numeroSolicitud)

  const ir = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: '#f5f0e8',
          color: '#0f172a',
          padding: '66px 82px 64px',
          fontFamily: '"Segoe UI", Trebuchet MS, Arial, sans-serif',
          flexDirection: 'column',
        }}
      >
        <div style={{ position: 'absolute', top: 66, left: 82, right: 82, height: 6, background: '#111827' }} />
        <div style={{ position: 'absolute', top: 72, left: 82, right: 82, height: 3, background: '#c9a227' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 34, gap: 30 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flex: 1, minWidth: 0 }}>
            <div style={{ width: 80, height: 80, border: '2px solid #111827', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontWeight: 700, fontSize: 26, color: '#111827' }}>
              FIB
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#a16207', fontSize: 14, letterSpacing: 3, fontFamily: 'monospace' }}>Federal Investigation Bureau - HQ</span>
              <span style={{ color: '#111827', fontSize: 54, fontWeight: 700, letterSpacing: 2, marginTop: 8 }}>SOLICITUD DE ALLANAMIENTO</span>
              <span style={{ color: '#475569', fontSize: 14, letterSpacing: 6, fontFamily: 'monospace', marginTop: 4 }}>REPORTE OPERATIVO CLASIFICADO</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: 420, flexShrink: 0 }}>
            <span style={{ color: '#475569', fontSize: 11, letterSpacing: 3, fontFamily: 'monospace' }}>N° SOLICITUD</span>
            <span style={{ color: '#0f172a', fontSize: 42, fontWeight: 700, marginTop: 6, maxWidth: '100%', textAlign: 'right', lineHeight: 1 }}>{numeroSolicitud.principal}</span>
            {!!numeroSolicitud.detalle && (
              <span style={{ color: '#475569', fontSize: 12, fontFamily: 'monospace', marginTop: 4, maxWidth: '100%', textAlign: 'right' }}>{numeroSolicitud.detalle}</span>
            )}
            <span style={{ color: '#475569', fontSize: 12, fontFamily: 'monospace', marginTop: 6 }}>{fecha}</span>
            <span style={{ color: estadoColor, fontSize: 12, fontFamily: 'monospace', marginTop: 4, letterSpacing: 1 }}>{estado}</span>
          </div>
        </div>

        <div style={{ marginTop: 16, height: 2, background: '#c9a227' }} />

        <div style={{ marginTop: 16, background: '#111827', color: '#f8fafc', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', fontFamily: 'monospace', fontSize: 13, letterSpacing: 1 }}>
          <span>UNIDAD: {String(item.unidad || 'General')}</span>
          <span style={{ color: '#22c55e' }}>AGENTE: {String(item.nombreSolicitante || '').slice(0, 30) || '—'}</span>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 18,
            gap: 12,
          }}
        >
          <div style={{ borderLeft: '4px solid #c9a227', paddingLeft: 14, display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#64748b', fontSize: 11, letterSpacing: 5, fontFamily: 'monospace' }}>OBJETIVO</span>
            <div style={{ marginTop: 8, fontSize: 36, lineHeight: 1.18, color: '#0f172a', fontFamily: 'Georgia, serif' }}>Direccion: {String(item.direccion || '—').slice(0, 120)}</div>
            <div style={{ marginTop: 4, fontSize: 36, lineHeight: 1.18, color: '#0f172a', fontFamily: 'Georgia, serif' }}>Sospechoso(s): {String(item.sospechoso || 'Sin identificar').slice(0, 120)}</div>
          </div>

          <div style={{ borderLeft: '4px solid #c9a227', paddingLeft: 14, display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#64748b', fontSize: 11, letterSpacing: 5, fontFamily: 'monospace' }}>MOTIVACION / FUNDAMENTO LEGAL</span>
            <div style={{ marginTop: 8, fontSize: 34, lineHeight: 1.2, color: '#0f172a', fontFamily: 'Georgia, serif' }}>
              {motivacion}
            </div>
          </div>

          <div style={{ borderLeft: '4px solid #c9a227', paddingLeft: 14, display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#64748b', fontSize: 11, letterSpacing: 5, fontFamily: 'monospace' }}>DESCRIPCION OPERATIVA</span>
            <div style={{ marginTop: 8, fontSize: 34, lineHeight: 1.2, color: '#0f172a', fontFamily: 'Georgia, serif' }}>
              {descripcion}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 26, marginTop: 20 }}>
          <div style={{ flex: 1, minHeight: 208, border: '1px solid #c9a227', padding: '18px 18px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#a16207', fontSize: 11, letterSpacing: 4, fontFamily: 'monospace' }}>FIRMA DE SUPERVISOR</span>
            <div style={{ flex: 1 }} />
            <div style={{ height: 1, background: '#c9a227', marginBottom: 8 }} />
            <span style={{ color: '#111827', fontSize: 26 }}>{supervisorFirma?.nombre || 'Pendiente'}</span>
            <span style={{ color: '#64748b', fontSize: 11, letterSpacing: 2, fontFamily: 'monospace', marginTop: 2 }}>
              {String((supervisorFirma?.rol || 'sin firma').replace('_', ' ').toUpperCase())} - {supervisorFirma?.fecha ? new Date(supervisorFirma.fecha).toLocaleDateString('es-ES') : '—'}
            </span>
          </div>
          <div style={{ flex: 1, minHeight: 208, border: '1px solid #c9a227', padding: '18px 18px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#a16207', fontSize: 11, letterSpacing: 4, fontFamily: 'monospace' }}>AUTORIZACION OFICIAL</span>
            <div style={{ flex: 1 }} />
            <div style={{ height: 1, background: '#c9a227', marginBottom: 8 }} />
            <span style={{ color: '#111827', fontSize: 26 }}>{autorizacionFirma?.nombre || 'Pendiente'}</span>
            <span style={{ color: '#64748b', fontSize: 11, letterSpacing: 2, fontFamily: 'monospace', marginTop: 2 }}>
              {String((autorizacionFirma?.rol || 'sin firma').replace('_', ' ').toUpperCase())} - {autorizacionFirma?.fecha ? new Date(autorizacionFirma.fecha).toLocaleDateString('es-ES') : '—'}
            </span>
          </div>
        </div>

        <div style={{ position: 'absolute', left: '50%', top: '64%', transform: 'translate(-50%, -50%) rotate(-34deg)', fontSize: 112, letterSpacing: 8, fontWeight: 700, color: stampColor, whiteSpace: 'nowrap' }}>
          {estado}
        </div>

        <div style={{ position: 'absolute', left: 84, bottom: 24, fontSize: 13, color: '#9ca3af', letterSpacing: 2, fontFamily: 'monospace' }}>
          SOLICITANTE: {solicitante}
        </div>
      </div>
    ),
    { width: 1480, height: 1100 }
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
