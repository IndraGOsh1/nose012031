// Discord Webhook Logger
// Sends structured embeds to different webhook channels
import { getSecret } from './secrets'
import sharp from 'sharp'
import { recordAuditEvent } from './audit-log'

type DiscordFilePayload = {
  buffer: Buffer
  filename: string
  contentType: string
}

const WEBHOOKS = {
  extras:    getSecret('DISCORD_WEBHOOK_EXTRAS'),
  keys:      getSecret('DISCORD_WEBHOOK_KEYS'),
  logins:    getSecret('DISCORD_WEBHOOK_LOGINS'),
  important: getSecret('DISCORD_WEBHOOK_IMPORTANTE') || getSecret('DISCORD_WEBHOOK_IMPORTANT'),
<<<<<<< HEAD
  audit:     getSecret('DISCORD_WEBHOOK_AUDIT') || getSecret('DISCORD_WEBHOOK_IMPORTANTE') || getSecret('DISCORD_WEBHOOK_IMPORTANT'),
=======
>>>>>>> 0b7dbbb7becb6da8c167ff2bbb4ed7f1d2b0b74f
}

const ALLANAMIENTO_WEBHOOK =
  getSecret('DISCORD_WEBHOOK_ALLANAMIENTOS')

type WebhookType = keyof typeof WEBHOOKS
type Color = number

const COLORS = {
  green:  0x2ECC71,
  red:    0xE74C3C,
<<<<<<< HEAD
  blue:   0x1B6FFF, // FIB Blue
=======
  blue:   0x3498DB,
>>>>>>> 0b7dbbb7becb6da8c167ff2bbb4ed7f1d2b0b74f
  yellow: 0xF1C40F,
  gray:   0x95A5A6,
  purple: 0x9B59B6,
  orange: 0xE67E22,
  cyan:   0x1ABC9C,
<<<<<<< HEAD
  fib_red: 0xCC0000,
=======
>>>>>>> 0b7dbbb7becb6da8c167ff2bbb4ed7f1d2b0b74f
}

interface EmbedField { name: string; value: string; inline?: boolean }

interface WebhookPayload {
  type:    WebhookType
  title:   string
  color?:  Color
  fields?: EmbedField[]
  description?: string
  footer?: string
<<<<<<< HEAD
  timestamp?: string
=======
>>>>>>> 0b7dbbb7becb6da8c167ff2bbb4ed7f1d2b0b74f
}

declare global {
  // eslint-disable-next-line no-var
  var __fibWebhookMissingWarned: Record<string, boolean> | undefined
}

export async function logWebhook(payload: WebhookPayload) {
  if (!global.__fibWebhookMissingWarned) global.__fibWebhookMissingWarned = {}
  const url = WEBHOOKS[payload.type]
  if (!url) {
    if (!global.__fibWebhookMissingWarned[payload.type]) {
      console.warn(`[webhook] Missing env for channel: ${payload.type}`)
<<<<<<< HEAD
=======
      void recordAuditEvent({
        level: 'warn',
        source: 'webhook',
        event: 'missing_channel_env',
        message: `Missing env for channel: ${payload.type}`,
        meta: { channel: payload.type },
      }).catch(() => {})
>>>>>>> 0b7dbbb7becb6da8c167ff2bbb4ed7f1d2b0b74f
      global.__fibWebhookMissingWarned[payload.type] = true
    }
    return
  }

  const embed = {
    title:       payload.title,
    color:       payload.color ?? COLORS.blue,
    description: payload.description,
    fields:      payload.fields || [],
<<<<<<< HEAD
    timestamp:   payload.timestamp || new Date().toISOString(),
=======
    timestamp:   new Date().toISOString(),
>>>>>>> 0b7dbbb7becb6da8c167ff2bbb4ed7f1d2b0b74f
    footer:      { text: payload.footer || 'FIB HQ System' },
  }

  try {
<<<<<<< HEAD
    await fetch(url, {
=======
    const res = await fetch(url, {
>>>>>>> 0b7dbbb7becb6da8c167ff2bbb4ed7f1d2b0b74f
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ embeds: [embed] }),
    })
<<<<<<< HEAD
  } catch (error) {
    console.error(`[webhook] Error sending to ${payload.type}:`, error)
  }
}

export const logAudit = (entry: any) => {
  const levelColors: Record<string, number> = {
    info: COLORS.blue,
    warn: COLORS.orange,
    error: COLORS.red,
  }

  const metaFields = Object.entries(entry.meta || {})
    .slice(0, 10)
    .map(([k, v]) => ({ name: k, value: String(v).slice(0, 1024), inline: true }))

  return logWebhook({
    type: 'audit',
    title: `📡 Audit: ${entry.event}`,
    color: levelColors[entry.level] || COLORS.gray,
    description: entry.message,
    timestamp: entry.timestamp,
    fields: [
      { name: 'Origen', value: entry.source, inline: true },
      { name: 'Actor', value: entry.actor || '—', inline: true },
      { name: 'Nivel', value: entry.level.toUpperCase(), inline: true },
      ...metaFields,
    ],
  })
}

=======
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      void recordAuditEvent({
        level: 'error',
        source: 'webhook',
        event: 'discord_embed_failed',
        message: `Discord webhook failed (${res.status})`,
        meta: { channel: payload.type, title: payload.title, body: text.slice(0, 300) },
      }).catch(() => {})
      return
    }

    void recordAuditEvent({
      level: 'info',
      source: 'webhook',
      event: 'discord_embed_sent',
      message: payload.title,
      meta: { channel: payload.type },
    }).catch(() => {})
  } catch (error) {
    void recordAuditEvent({
      level: 'error',
      source: 'webhook',
      event: 'discord_embed_exception',
      message: payload.title,
      meta: { channel: payload.type, error: error instanceof Error ? error.message : String(error) },
    }).catch(() => {})
  }
}

>>>>>>> 0b7dbbb7becb6da8c167ff2bbb4ed7f1d2b0b74f
// Helpers
export const logLogin = (username: string, rol: string, ip?: string) =>
  logWebhook({
    type:  'logins',
    title: '🔐 Inicio de Sesión',
    color: COLORS.green,
    fields: [
      { name: 'Usuario', value: username,   inline: true },
      { name: 'Rol',     value: rol,        inline: true },
      { name: 'IP',      value: ip || '—',  inline: true },
    ],
  })

export const logRegister = (username: string, rol: string, codigo: string) =>
  logWebhook({
    type:  'logins',
    title: '📝 Nuevo Registro',
    color: COLORS.blue,
    fields: [
      { name: 'Usuario', value: username, inline: true },
      { name: 'Rol',     value: rol,      inline: true },
      { name: 'Código',  value: codigo,   inline: true },
    ],
  })

export const logKeyAction = (action: string, by: string, detail: string) =>
  logWebhook({
    type:  'keys',
    title: `🔑 ${action}`,
    color: COLORS.yellow,
    fields: [
      { name: 'Por',     value: by,     inline: true },
      { name: 'Detalle', value: detail, inline: false },
    ],
  })

export const logExtra = (title: string, description: string, color?: Color) =>
  logWebhook({ type: 'extras', title, description, color: color ?? COLORS.gray })

export const logPersonalAction = (action: string, agente: string, by: string, detalle?: string) =>
  logWebhook({
    type:  'extras',
    title: `👤 ${action}`,
    color: COLORS.purple,
    fields: [
      { name: 'Agente',  value: agente,       inline: true },
      { name: 'Por',     value: by,           inline: true },
      { name: 'Detalle', value: detalle || '—', inline: false },
    ],
  })

export const logSancion = (agente: string, tipo: string, motivo: string, by: string) =>
  logWebhook({
    type:  'important',
    title: `⚠️ Sanción ${tipo}`,
    color: tipo === 'Grave' ? COLORS.red : COLORS.orange,
    fields: [
      { name: 'Agente', value: agente, inline: true },
      { name: 'Tipo',   value: tipo,   inline: true },
      { name: 'Por',    value: by,     inline: true },
      { name: 'Motivo', value: motivo, inline: false },
    ],
  })

export const logRegistroImportante = (accion: 'Ascenso' | 'Descenso' | 'Sanción' | 'Veto' | 'Freeze', agente: string, by: string, detalle: string) =>
  logWebhook({
    type: 'important',
    title: `📌 Registro Importante: ${accion}`,
    color: accion === 'Ascenso' ? COLORS.green : accion === 'Descenso' ? COLORS.yellow : accion === 'Veto' ? COLORS.red : accion === 'Freeze' ? COLORS.blue : COLORS.orange,
    fields: [
      { name: 'Agente', value: agente, inline: true },
      { name: 'Por', value: by, inline: true },
      { name: 'Acción', value: accion, inline: true },
      { name: 'Detalle', value: detalle || '—', inline: false },
    ],
  })

export const logAllanamiento = (action: string, numero: string, by: string, detail?: string) =>
  logWebhook({
    type:  'extras',
    title: `🏠 Allanamiento ${action}`,
    color: action === 'Autorizado' ? COLORS.green : action === 'Denegado' ? COLORS.red : COLORS.blue,
    fields: [
      { name: 'N°',      value: numero,       inline: true },
      { name: 'Por',     value: by,           inline: true },
      { name: 'Detalle', value: detail || '—', inline: false },
    ],
  })

function buildAllanamientoStatusImage(numero: string, direccion: string, estado: string) {
  const safeNumero = String(numero || 'SIN NUMERO').trim().slice(0, 72)
  const safeDireccion = String(direccion || 'SIN DIRECCION').replace(/\s+/g, ' ').trim().slice(0, 120)
  const safeEstado = String(estado || 'pendiente').replace(/\s+/g, ' ').trim().toUpperCase().slice(0, 48)
  const title = encodeURIComponent(`ALLANAMIENTO ${safeEstado}`)
  const subtitle = encodeURIComponent(`${safeNumero} | ${safeDireccion}`)
  return `https://dummyimage.com/1920x1080/0a1320/e6ecf2.png&text=${title}%0A${subtitle}`
}

function isDiscordRenderableImage(url?: string) {
  if (!url) return false
  const normalized = String(url).trim()
  if (!/^https?:\/\//i.test(normalized)) return false
  if (/localhost|127\.0\.0\.1|\.local/i.test(normalized)) return false
  if (/\/api\/allanamientos\/[^/]+\/preview-image\.png(\?|$)/i.test(normalized)) return true
  return /\.(png|jpg|jpeg|webp|gif)(\?|$)/i.test(normalized)
}

function resolveDiscordImage(previewUrl: string | undefined, fallbackUrl: string) {
  return isDiscordRenderableImage(previewUrl) ? String(previewUrl).trim() : fallbackUrl
}

export async function logAllanamientoAutorizadoCard(input: {
  numero: string
  direccion: string
  solicitadoPor: string
  autorizadoPor: string
  observaciones?: string
  previewUrl?: string
}) {
  if (!ALLANAMIENTO_WEBHOOK) return
  const imageUrl = resolveDiscordImage(
    input.previewUrl,
    buildAllanamientoStatusImage(input.numero, input.direccion, 'autorizado')
  )
  const embed = {
    title: '✅ Allanamiento Aprobado',
    color: COLORS.green,
    description: 'Formato operativo generado automaticamente',
    fields: [
      { name: 'N° Solicitud', value: input.numero, inline: true },
      { name: 'Dirección', value: input.direccion.slice(0, 1024), inline: false },
      { name: 'Solicitante', value: input.solicitadoPor, inline: true },
      { name: 'Aprobado por', value: input.autorizadoPor, inline: true },
      { name: 'Observaciones', value: (input.observaciones || '—').slice(0, 1024), inline: false },
    ],
    image: { url: imageUrl },
    timestamp: new Date().toISOString(),
    footer: { text: 'FIB HQ — Allanamientos' },
  }

  try {
    await fetch(ALLANAMIENTO_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })
  } catch {}
}

export async function logAllanamientoDocumentoGenerado(input: {
  numero: string
  direccion: string
  generadoPor: string
  previewUrl?: string
}) {
  if (!ALLANAMIENTO_WEBHOOK) return
  const imageUrl = resolveDiscordImage(
    input.previewUrl,
    buildAllanamientoStatusImage(input.numero, input.direccion, 'documento generado')
  )
  const embed = {
    title: '📄 PDF de Allanamiento Generado',
    color: COLORS.blue,
    fields: [
      { name: 'N° Solicitud', value: input.numero, inline: true },
      { name: 'Generado por', value: input.generadoPor, inline: true },
      { name: 'Dirección', value: input.direccion.slice(0, 1024), inline: false },
    ],
    image: { url: imageUrl },
    timestamp: new Date().toISOString(),
    footer: { text: 'FIB HQ — Documento operativo' },
  }

  try {
    await fetch(ALLANAMIENTO_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })
  } catch {}
}

export async function logAllanamientoHallazgo(input: {
  numero: string
  reportadoPor: string
  hallazgo: string
  propiedad: string
  evidenciaUrl?: string
}) {
  const evid = input.evidenciaUrl && input.evidenciaUrl.trim() ? input.evidenciaUrl.trim() : ''
  await logWebhook({
    type: 'extras',
    title: '📌 Informe de Hallazgo',
    color: COLORS.cyan,
    fields: [
      { name: 'N°', value: input.numero, inline: true },
      { name: 'Reportado por', value: input.reportadoPor, inline: true },
      { name: 'Hallazgo', value: input.hallazgo.slice(0, 1024), inline: false },
      { name: 'Propiedad / Ubicación', value: input.propiedad.slice(0, 1024), inline: false },
      { name: 'Evidencia', value: evid || '—', inline: false },
    ],
  })

  if (!ALLANAMIENTO_WEBHOOK) return
  const embed = {
    title: '📌 Informe de Hallazgo (Allanamiento)',
    color: COLORS.cyan,
    fields: [
      { name: 'N° Solicitud', value: input.numero, inline: true },
      { name: 'Reportado por', value: input.reportadoPor, inline: true },
      { name: 'Hallazgo', value: input.hallazgo.slice(0, 1024), inline: false },
      { name: 'Propiedad / Ubicación', value: input.propiedad.slice(0, 1024), inline: false },
    ],
    image: evid ? { url: evid } : undefined,
    timestamp: new Date().toISOString(),
    footer: { text: 'FIB HQ — Evidencia operativa' },
  }

  try {
    await fetch(ALLANAMIENTO_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })
  } catch {}
}

export const logInviteCodes = (action: string, codigo: string, rol: string, by: string) =>
  logWebhook({
    type:  'keys',
    title: `🎫 Invitación ${action}`,
    color: action === 'Creada' ? COLORS.green : COLORS.red,
    fields: [
      { name: 'Código', value: `\`${codigo}\``, inline: true },
      { name: 'Rol',    value: rol,             inline: true },
      { name: 'Por',    value: by,              inline: true },
    ],
  })

// SVG to PNG Rendering & Discord File Upload
function escapeXml(input: string) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

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

export function generateAllanamientoPreviewSVG(input: {
  numeroSolicitud: string
  direccion: string
  sospechoso: string
  descripcion: string
  nombreSolicitante: string
  callsignSolicitante: string | null
  numeroAgenteSolicitante?: string | null
  estado: string
  fechaSolicitud: string
  firmaAutorizacion?: string
  callsignAutorizador?: string | null
  numeroAgenteAutorizador?: string | null
  includeFirma?: boolean
}): string {
  const estado = statusLabel(input.estado)
  const estadoColor = statusColor(input.estado)
  const fecha = new Date(input.fechaSolicitud).toLocaleDateString('es')
  const solicitante = `${input.nombreSolicitante}${input.callsignSolicitante ? ` [${input.callsignSolicitante}]` : ''}`
  const solicitanteMeta = `N° ${input.numeroAgenteSolicitante || '—'}`
  const firmaText = input.includeFirma ? (input.firmaAutorizacion || 'Pendiente') : ''
  const firmaDate = input.includeFirma ? new Date().toLocaleString('es') : ''
  const firmaMeta = input.includeFirma
    ? `${input.callsignAutorizador ? `[${input.callsignAutorizador}] ` : ''}N° ${input.numeroAgenteAutorizador || '—'}`
    : ''
  const firmaStroke = input.includeFirma
    ? 'M1060 926 C1130 886, 1200 965, 1268 930 S1380 886, 1475 924 S1584 960, 1662 918'
    : 'M1060 930 C1140 930, 1220 930, 1300 930 S1460 930, 1540 930 S1620 930, 1660 930'

  const lines = [
    `Dirección: ${input.direccion}`,
    `Sospechoso(s): ${input.sospechoso || 'Sin identificar'}`,
    input.descripcion ? `Descripción: ${input.descripcion}` : '',
  ].filter(Boolean)

  const blocks = lines
    .slice(0, 3)
    .map((line, idx) => `<text x="150" y="${430 + idx * 68}" fill="#0f172a" font-size="50" font-family="Georgia, serif">${escapeXml(line)}</text>`)
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <rect width="1920" height="1080" fill="#f5f0e8"/>
  <image href="https://i.imgur.com/EAimMhx.png" x="640" y="220" width="640" height="640" opacity="0.06" preserveAspectRatio="xMidYMid meet"/>
  <rect x="120" y="110" width="1680" height="10" fill="#111827"/>
  <rect x="120" y="121" width="1680" height="5" fill="#c9a227"/>

  <text x="150" y="200" fill="#a16207" font-size="28" letter-spacing="3" font-family="monospace">Federal Investigation Bureau - HQ</text>
  <text x="150" y="270" fill="#111827" font-size="86" font-weight="700" letter-spacing="2" font-family="Arial, sans-serif">SOLICITUD DE ALLANAMIENTO</text>
  <text x="150" y="315" fill="#334155" font-size="24" letter-spacing="6" font-family="monospace">REPORTE OPERATIVO CLASIFICADO</text>

  <text x="1690" y="190" text-anchor="end" fill="#475569" font-size="20" letter-spacing="2" font-family="monospace">N° SOLICITUD</text>
  <text x="1690" y="250" text-anchor="end" fill="#0f172a" font-size="58" font-weight="700" font-family="Arial, sans-serif">${escapeXml(input.numeroSolicitud)}</text>
  <text x="1690" y="295" text-anchor="end" fill="#475569" font-size="24" font-family="monospace">${escapeXml(fecha)}</text>
  <text x="1690" y="335" text-anchor="end" fill="${estadoColor}" font-size="26" font-family="monospace">${escapeXml(estado)}</text>

  <rect x="150" y="360" width="1620" height="420" fill="#ffffff" stroke="#e2d9c3"/>
  ${blocks}

  <rect x="150" y="820" width="780" height="170" fill="none" stroke="#c9a227"/>
  <rect x="990" y="820" width="780" height="170" fill="#fffaf0" stroke="#c9a227"/>
  <text x="180" y="870" fill="#a16207" font-size="18" letter-spacing="2" font-family="monospace">SOLICITANTE</text>
  <text x="180" y="930" fill="#0f172a" font-size="38" font-family="Arial, sans-serif">${escapeXml(solicitante)}</text>
  <text x="180" y="972" fill="#475569" font-size="24" font-family="Arial, sans-serif">${escapeXml(solicitanteMeta)}</text>
  <text x="1020" y="870" fill="#a16207" font-size="18" letter-spacing="2" font-family="monospace">AUTORIZACIÓN OFICIAL</text>

  <path d="${firmaStroke}" fill="none" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" opacity="${input.includeFirma ? '0.85' : '0.3'}"/>
  <text x="1060" y="918" fill="rgba(15,23,42,0.28)" font-size="19" letter-spacing="6" font-family="monospace">FIRMA DIGITAL</text>
  <text x="1060" y="954" fill="#0f172a" font-size="40" font-family="cursive" transform="rotate(-2 1060 954)">${escapeXml(firmaText)}</text>
  <text x="1060" y="982" fill="#475569" font-size="20" font-family="Arial, sans-serif">${escapeXml(firmaMeta)}</text>

  <circle cx="1655" cy="892" r="62" fill="none" stroke="${input.includeFirma ? '#16a34a' : '#9ca3af'}" stroke-width="3" opacity="0.9"/>
  <circle cx="1655" cy="892" r="48" fill="none" stroke="${input.includeFirma ? '#16a34a' : '#9ca3af'}" stroke-width="1.5" opacity="0.6"/>
  <text x="1655" y="888" text-anchor="middle" fill="${input.includeFirma ? '#16a34a' : '#9ca3af'}" font-size="13" letter-spacing="2" font-family="monospace">VALIDADA</text>
  <text x="1655" y="907" text-anchor="middle" fill="${input.includeFirma ? '#16a34a' : '#9ca3af'}" font-size="13" letter-spacing="2" font-family="monospace">FIB HQ</text>
  <text x="1640" y="972" text-anchor="end" fill="#64748b" font-size="16" font-family="monospace">${escapeXml(firmaDate)}</text>

  <text x="960" y="760" text-anchor="middle" fill="rgba(34,197,94,0.12)" font-size="140" font-weight="700" letter-spacing="5" transform="rotate(-28, 960, 760)" font-family="Arial, sans-serif">${escapeXml(estado)}</text>
</svg>`
}

export async function renderSVGToPNG(svgString: string, width: number = 1920, height: number = 1080): Promise<Buffer> {
  try {
    const png = await sharp(Buffer.from(svgString, 'utf-8'), {
      density: 72,
    })
      .png()
      .toBuffer()
    return png
  } catch (error) {
    console.error('[webhook] Error rendering SVG to PNG:', error)
    void recordAuditEvent({
      level: 'error',
      source: 'webhook',
      event: 'render_svg_to_png_failed',
      message: 'Error rendering SVG to PNG',
      meta: { width, height, error: error instanceof Error ? error.message : String(error) },
    }).catch(() => {})
    throw new Error('Failed to render SVG to PNG')
  }
}

async function prepareDiscordImage(pngBuffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(pngBuffer)
      .resize({ width: 1600, withoutEnlargement: true, fit: 'inside' })
      .sharpen({ sigma: 1.2 })
      .png({ compressionLevel: 6, adaptiveFiltering: true })
      .toBuffer()
  } catch {
    return pngBuffer
  }
}

export async function sendDiscordFileMessage(
  webhookUrl: string,
  fileBuffer: Buffer,
  filename: string,
  contentType: string = 'image/png',
  message?: string | { content?: string; embeds?: any[] }
): Promise<void> {
  const formData = new FormData()
  const blob = new Blob([new Uint8Array(fileBuffer)], { type: contentType })
  formData.append('file', blob, filename)

  if (typeof message === 'string' && message.trim()) {
    formData.append('content', message)
  } else if (message && typeof message === 'object') {
    const payload: Record<string, unknown> = {}
    if (message.content && message.content.trim()) payload.content = message.content
    if (Array.isArray(message.embeds) && message.embeds.length > 0) payload.embeds = message.embeds
    if (Object.keys(payload).length > 0) {
      formData.append('payload_json', JSON.stringify(payload))
    }
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Discord webhook failed (${res.status}): ${text.slice(0, 300)}`)
  }
}

async function sendDiscordTextMessage(webhookUrl: string, content: string) {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      void recordAuditEvent({
        level: 'error',
        source: 'webhook',
        event: 'discord_fallback_text_failed',
        message: `Discord fallback text failed (${res.status})`,
        meta: { body: text.slice(0, 300), content: content.slice(0, 500) },
      }).catch(() => {})
      return
    }

    void recordAuditEvent({
      level: 'warn',
      source: 'webhook',
      event: 'discord_fallback_text_sent',
      message: content.slice(0, 500),
    }).catch(() => {})
  } catch (error) {
    console.error('[webhook] Error sending fallback text message:', error)
    void recordAuditEvent({
      level: 'error',
      source: 'webhook',
      event: 'discord_fallback_text_exception',
      message: content.slice(0, 500),
      meta: { error: error instanceof Error ? error.message : String(error) },
    }).catch(() => {})
  }
}

export async function sendDiscordFilesMessage(
  webhookUrl: string,
  files: DiscordFilePayload[],
  message?: string | { content?: string; embeds?: any[] }
): Promise<void> {
  try {
    const formData = new FormData()
    files.forEach((file, index) => {
      const blob = new Blob([new Uint8Array(file.buffer)], { type: file.contentType })
      formData.append(`files[${index}]`, blob, file.filename)
    })

    const payload: Record<string, unknown> = {}
    if (typeof message === 'string' && message.trim()) {
      payload.content = message
    } else if (message && typeof message === 'object') {
      if (message.content && message.content.trim()) payload.content = message.content
      if (Array.isArray(message.embeds) && message.embeds.length > 0) payload.embeds = message.embeds
    }
    if (Object.keys(payload).length > 0) {
      formData.append('payload_json', JSON.stringify(payload))
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Discord webhook failed (${res.status}): ${text.slice(0, 300)}`)
    }

    void recordAuditEvent({
      level: 'info',
      source: 'webhook',
      event: 'discord_files_sent',
      message: `Sent ${files.length} files`,
      meta: { files: files.length },
    }).catch(() => {})
  } catch (error) {
    console.error('[webhook] Error sending Discord file message:', error)
    void recordAuditEvent({
      level: 'error',
      source: 'webhook',
      event: 'discord_files_send_failed',
      message: 'Error sending Discord file message',
      meta: { files: files.length, error: error instanceof Error ? error.message : String(error) },
    }).catch(() => {})
  }
}

export async function logAllanamientoCreado(input: {
  numero: string
  direccion: string
  sospechoso: string
  descripcion: string
  solicitadoPor: string
  callsignSolicitante?: string | null
  numeroAgenteSolicitante?: string | null
  pngBuffer?: Buffer
}): Promise<void> {
  if (!ALLANAMIENTO_WEBHOOK) return

  try {
    if (!input.pngBuffer) throw new Error('Missing PNG buffer for allanamiento creado')
    const discordImage = await prepareDiscordImage(input.pngBuffer)
    const filename = `allanamiento-${input.numero.replace(/[^a-zA-Z0-9-]/g, '-')}-solicitud.png`

    const callsign = input.callsignSolicitante || input.solicitadoPor
    const agente = input.numeroAgenteSolicitante || '—'
    const cuenta = input.solicitadoPor || '—'
    const numMatch = input.numero.match(/:\s*(\d+)\s*$/)
    const numSolicitud = numMatch ? numMatch[1] : input.numero

    const messageText = [
      '📋 **Nueva Solicitud de Allanamiento**',
      `**Cuenta:** ${cuenta}`,
      `**${callsign}** - Numero de agente: **${agente}** | Num. Solicitud: **${numSolicitud}**`,
    ].join('\n')

    await sendDiscordFileMessage(ALLANAMIENTO_WEBHOOK, discordImage, filename, 'image/png', messageText)
  } catch (error) {
    console.error('[webhook] Error logging allanamiento creado:', error)
    const callsign = input.callsignSolicitante || input.solicitadoPor
    const agente = input.numeroAgenteSolicitante || '—'
    const numMatch = input.numero.match(/:\s*(\d+)\s*$/)
    const numSolicitud = numMatch ? numMatch[1] : input.numero
    await sendDiscordTextMessage(
      ALLANAMIENTO_WEBHOOK,
      `⚠️ Allanamiento creado (sin adjunto): ${callsign} - N° agente ${agente} | Solicitud ${numSolicitud}`
    )
  }
}

export async function logAllanamientoAutorizado(input: {
  numero: string
  autorizadoPor: string
  callsignAutorizador?: string | null
  numeroAgenteAutorizador?: string | null
  pngBuffer?: Buffer
  pdfBuffer?: Buffer
}): Promise<void> {
  if (!ALLANAMIENTO_WEBHOOK) return

  try {
    if (!input.pngBuffer) throw new Error('Missing PNG buffer for allanamiento autorizado')
    const discordImage = await prepareDiscordImage(input.pngBuffer)
    const safeBase = input.numero.replace(/[^a-zA-Z0-9-]/g, '-')
    const filename = `allanamiento-${safeBase}-autorizado.png`
    const pdfFilename = `allanamiento-${safeBase}-autorizado.pdf`

    const numMatch = input.numero.match(/:\s*(\d+)\s*$/)
    const numSolicitud = numMatch ? numMatch[1] : input.numero

    const callsign = input.callsignAutorizador || input.autorizadoPor
    const agente = input.numeroAgenteAutorizador || '—'
    const cuenta = input.autorizadoPor || '—'

    const messageText = [
      '✅ **Allanamiento Autorizado**',
      `**Cuenta:** ${cuenta}`,
      `**${callsign}** - Numero de agente: **${agente}** | Num. Solicitud: **${numSolicitud}**`,
      input.pdfBuffer ? 'Adjuntos: imagen + PDF' : 'Adjuntos: imagen',
    ].join('\n')

    await sendDiscordFileMessage(ALLANAMIENTO_WEBHOOK, discordImage, filename, 'image/png', messageText)
    if (input.pdfBuffer) {
      await sendDiscordFileMessage(
        ALLANAMIENTO_WEBHOOK,
        input.pdfBuffer,
        pdfFilename,
        'application/pdf',
        '📄 **PDF Allanamiento Autorizado**'
      )
    }
  } catch (error) {
    console.error('[webhook] Error logging allanamiento autorizado:', error)
    const callsign = input.callsignAutorizador || input.autorizadoPor
    const agente = input.numeroAgenteAutorizador || '—'
    const numMatch = input.numero.match(/:\s*(\d+)\s*$/)
    const numSolicitud = numMatch ? numMatch[1] : input.numero
    await sendDiscordTextMessage(
      ALLANAMIENTO_WEBHOOK,
      `⚠️ Allanamiento autorizado (sin adjunto): ${callsign} - N° agente ${agente} | Solicitud ${numSolicitud}`
    )
  }
}

export async function logAllanamientoEjecutado(input: {
  numero: string
  ejecutadoPor: string
  callsignEjecutor?: string | null
  numeroAgenteEjecutor?: string | null
  pngBuffer?: Buffer
}): Promise<void> {
  if (!ALLANAMIENTO_WEBHOOK) return

  try {
    if (!input.pngBuffer) throw new Error('Missing PNG buffer for allanamiento ejecutado')
    const discordImage = await prepareDiscordImage(input.pngBuffer)
    const safeBase = input.numero.replace(/[^a-zA-Z0-9-]/g, '-')
    const filename = `allanamiento-${safeBase}-ejecutado.png`

    const numMatch = input.numero.match(/:\s*(\d+)\s*$/)
    const numSolicitud = numMatch ? numMatch[1] : input.numero

    const callsign = input.callsignEjecutor || input.ejecutadoPor
    const agente = input.numeroAgenteEjecutor || '—'
    const cuenta = input.ejecutadoPor || '—'

    const messageText = [
      '✅ **Allanamiento Ejecutado**',
      `**Cuenta:** ${cuenta}`,
      `**${callsign}** - Numero de agente: **${agente}** | Num. Solicitud: **${numSolicitud}**`,
      'Adjuntos: imagen',
    ].join('\n')

    await sendDiscordFileMessage(ALLANAMIENTO_WEBHOOK, discordImage, filename, 'image/png', messageText)
  } catch (error) {
    console.error('[webhook] Error logging allanamiento ejecutado:', error)
    const callsign = input.callsignEjecutor || input.ejecutadoPor
    const agente = input.numeroAgenteEjecutor || '—'
    const numMatch = input.numero.match(/:\s*(\d+)\s*$/)
    const numSolicitud = numMatch ? numMatch[1] : input.numero
    await sendDiscordTextMessage(
      ALLANAMIENTO_WEBHOOK,
      `⚠️ Allanamiento ejecutado (sin adjunto): ${callsign} - N° agente ${agente} | Solicitud ${numSolicitud}`
    )
  }
}
