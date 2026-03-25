import { ImageResponse } from 'next/og'
import { getAllanamientosDB } from '@/lib/allanamientos-db'

export const runtime = 'nodejs'

type P = { params: Promise<{ id: string }> }

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

function buildInfoLines(item: any) {
  return [
    `Direccion: ${item.direccion}`,
    `Sospechoso(s): ${item.sospechoso || 'Sin identificar'}`,
    item.descripcion ? `Descripcion: ${item.descripcion}` : '',
  ].filter(Boolean)
}

export async function GET(_req: Request, { params }: P) {
  const { id } = await params
  const db = await getAllanamientosDB()
  const item = db.get(id)

  if (!item) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0b1220',
            color: '#d1d5db',
            fontSize: 56,
          }}
        >
          No encontrado
        </div>
      ),
      { width: 1920, height: 1080 }
    )
  }

  const estado = statusLabel(item.estado)
  const estadoColor = statusColor(item.estado)
  const fecha = new Date(item.fechaSolicitud).toLocaleDateString('es')
  const solicitante = `${item.nombreSolicitante}${item.callsignSolicitante ? ` [${item.callsignSolicitante}]` : ''}`
  const firmante = item.firmas?.[0]?.nombre || 'Pendiente'
  const lines = buildInfoLines(item)

  return new ImageResponse(
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
          fontFamily: 'Arial, sans-serif',
          flexDirection: 'column',
        }}
      >
        <div style={{ position: 'absolute', top: 110, left: 120, right: 120, height: 10, background: '#111827' }} />
        <div style={{ position: 'absolute', top: 121, left: 120, right: 120, height: 5, background: '#c9a227' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 52 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#a16207', fontSize: 28, letterSpacing: 3, fontFamily: 'monospace' }}>Federal Investigation Bureau - HQ</span>
            <span style={{ color: '#111827', fontSize: 86, fontWeight: 700, letterSpacing: 2, marginTop: 22 }}>SOLICITUD DE ALLANAMIENTO</span>
            <span style={{ color: '#334155', fontSize: 24, letterSpacing: 6, fontFamily: 'monospace', marginTop: 8 }}>REPORTE OPERATIVO CLASIFICADO</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ color: '#475569', fontSize: 20, letterSpacing: 2, fontFamily: 'monospace' }}>N° SOLICITUD</span>
            <span style={{ color: '#0f172a', fontSize: 74, fontWeight: 700, marginTop: 18 }}>{item.numeroSolicitud}</span>
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
          <div style={{ flex: 1, height: 170, border: '1px solid #c9a227', padding: '34px 30px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#a16207', fontSize: 18, letterSpacing: 2, fontFamily: 'monospace' }}>AUTORIZACION OFICIAL</span>
            <span style={{ color: '#0f172a', fontSize: 42, marginTop: 40 }}>{firmante}</span>
          </div>
        </div>
      </div>
    ),
    { width: 1920, height: 1080 }
  )
}