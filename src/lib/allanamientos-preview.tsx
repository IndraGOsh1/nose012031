// Shared renderer for allanamiento preview PNG.
// Used by both the preview-image route and the Discord webhook
// to avoid self-referencing HTTP calls on serverless.
import { ImageResponse } from 'next/og'

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
  const fecha = new Date(item.fechaSolicitud).toLocaleDateString('es')
  const solicitante = `${item.nombreSolicitante}${item.callsignSolicitante ? ` [${item.callsignSolicitante}]` : ''}`
  const firmante = item.firmas?.[0]?.nombre || 'Pendiente'
  const firmanteCallsign = item.firmas?.[0]?.callsign || '—'
  const firmaFecha = item.firmas?.[0]?.fecha
    ? new Date(item.firmas[0].fecha).toLocaleString('es')
    : 'Sin firma registrada'
  const lines = [
    `Direccion: ${item.direccion}`,
    `Sospechoso(s): ${item.sospechoso || 'Sin identificar'}`,
    item.descripcion ? `Descripcion: ${item.descripcion}` : '',
  ].filter(Boolean)
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
          padding: '110px 120px 90px',
          fontFamily: '"Segoe UI", Trebuchet MS, Arial, sans-serif',
          flexDirection: 'column',
        }}
      >
        <div style={{ position: 'absolute', top: 110, left: 120, right: 120, height: 10, background: '#111827' }} />
        <div style={{ position: 'absolute', top: 121, left: 120, right: 120, height: 5, background: '#c9a227' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 52, gap: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            <span style={{ color: '#a16207', fontSize: 28, letterSpacing: 3, fontFamily: 'monospace' }}>Federal Investigation Bureau - HQ</span>
            <span style={{ color: '#111827', fontSize: 86, fontWeight: 700, letterSpacing: 2, marginTop: 22 }}>SOLICITUD DE ALLANAMIENTO</span>
            <span style={{ color: '#334155', fontSize: 24, letterSpacing: 6, fontFamily: 'monospace', marginTop: 8 }}>REPORTE OPERATIVO CLASIFICADO</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: 560, flexShrink: 0 }}>
            <span style={{ color: '#475569', fontSize: 20, letterSpacing: 2, fontFamily: 'monospace' }}>N° SOLICITUD</span>
            <span style={{ color: '#0f172a', fontSize: 48, fontWeight: 700, marginTop: 18, maxWidth: '100%', textAlign: 'right' }}>{numeroSolicitud.principal}</span>
            {!!numeroSolicitud.detalle && (
              <span style={{ color: '#475569', fontSize: 21, fontFamily: 'monospace', marginTop: 4, maxWidth: '100%', textAlign: 'right' }}>{numeroSolicitud.detalle}</span>
            )}
            <span style={{ color: '#475569', fontSize: 24, fontFamily: 'monospace', marginTop: 8 }}>{fecha}</span>
            <span style={{ color: estadoColor, fontSize: 26, fontFamily: 'monospace', marginTop: 12 }}>{estado}</span>
          </div>
        </div>

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            marginTop: 40,
            background: '#ffffff',
            border: '1px solid #e2d9c3',
            padding: '58px 56px',
            minHeight: 420,
            gap: 22,
            overflow: 'hidden',
          }}
        >
          {lines.map((line) => (
            <div key={line} style={{ fontSize: 48, lineHeight: 1.22, color: '#0f172a', fontFamily: 'Georgia, serif' }}>
              {line}
            </div>
          ))}

          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '56%',
              transform: 'translate(-50%, -50%) rotate(-28deg)',
              fontSize: 136,
              fontWeight: 700,
              letterSpacing: 5,
              color: item.estado === 'autorizado' ? 'rgba(34,197,94,0.12)' : item.estado === 'denegado' ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.12)',
              whiteSpace: 'nowrap',
            }}
          >
            {estado}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 60, marginTop: 40 }}>
          <div style={{ flex: 1, height: 170, border: '1px solid #c9a227', padding: '34px 30px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#a16207', fontSize: 18, letterSpacing: 2, fontFamily: 'monospace' }}>SOLICITANTE</span>
            <span style={{ color: '#0f172a', fontSize: 42, marginTop: 40 }}>{solicitante}</span>
          </div>
          <div style={{ flex: 1, height: 170, border: '1px solid #c9a227', padding: '26px 30px', display: 'flex', flexDirection: 'column', position: 'relative', background: '#fffaf0' }}>
            <span style={{ color: '#a16207', fontSize: 18, letterSpacing: 2, fontFamily: 'monospace' }}>AUTORIZACION OFICIAL</span>
            <span style={{ color: 'rgba(15,23,42,0.32)', fontSize: 14, letterSpacing: 5, marginTop: 12, fontFamily: 'monospace' }}>FIRMA DIGITAL</span>
            <span style={{ color: '#0f172a', fontSize: 40, marginTop: 6, fontFamily: 'cursive', transform: 'rotate(-2deg)' }}>{firmante}</span>
            <span style={{ color: '#64748b', fontSize: 18, marginTop: 2 }}>{firmanteCallsign !== '—' ? `[${firmanteCallsign}]` : '—'}</span>
            <div style={{ position: 'absolute', right: 24, top: 22, width: 76, height: 76, border: `3px solid ${item.firmas?.length ? '#16a34a' : '#9ca3af'}`, borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.firmas?.length ? '#16a34a' : '#9ca3af', fontSize: 11, fontFamily: 'monospace' }}>VALIDADA</div>
            <div style={{ position: 'absolute', left: 30, right: 120, bottom: 34, height: 2, background: '#94a3b8', opacity: 0.8 }} />
            <span style={{ color: '#64748b', fontSize: 15, marginTop: 2, fontFamily: 'monospace' }}>{firmaFecha}</span>
          </div>
        </div>
      </div>
    ),
    { width: 1920, height: 1080 }
  )

  return Buffer.from(await ir.arrayBuffer())
}
