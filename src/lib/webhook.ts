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
  audit:     getSecret('DISCORD_WEBHOOK_AUDIT') || getSecret('DISCORD_WEBHOOK_IMPORTANTE') || getSecret('DISCORD_WEBHOOK_IMPORTANT'),
}

const ALLANAMIENTO_WEBHOOK =
  getSecret('DISCORD_WEBHOOK_ALLANAMIENTOS')

type WebhookType = keyof typeof WEBHOOKS
type Color = number

const COLORS = {
  green:  0x2ECC71,
  red:    0xE74C3C,
  blue:   0x1B6FFF,
  yellow: 0xF1C40F,
  gray:   0x95A5A6,
  purple: 0x9B59B6,
  orange: 0xE67E22,
  cyan:   0x1ABC9C,
  fib_red: 0xCC0000,
}

interface EmbedField { name: string; value: string; inline?: boolean }

interface WebhookPayload {
  type:    WebhookType
  title:   string
  color?:  Color
  fields?: EmbedField[]
  description?: string
  footer?: string
  timestamp?: string
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
      global.__fibWebhookMissingWarned[payload.type] = true
    }
    return
  }

  const embed = {
    title:       payload.title,
    color:       payload.color ?? COLORS.blue,
    description: payload.description,
    fields:      payload.fields || [],
    timestamp:   payload.timestamp || new Date().toISOString(),
    footer:      { text: payload.footer || 'FIB HQ System' },
  }

  try {
    await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ embeds: [embed] }),
    })
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

export function logInviteCodes(codes: string[], por: string, rol: string) {
  return logWebhook({
    type: 'keys',
    title: '🎫 Códigos de Invitación Generados',
    color: COLORS.purple,
    fields: [
      { name: 'Generados por', value: por, inline: true },
      { name: 'Rol asignado', value: rol, inline: true },
      { name: 'Códigos', value: codes.join(', '), inline: false },
    ],
  })
}

export async function sendAllanamientoWebhook(title: string, description: string, color: Color, fields?: EmbedField[]) {
  if (!ALLANAMIENTO_WEBHOOK) return
  try {
    await fetch(ALLANAMIENTO_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title,
          description,
          color,
          fields: fields || [],
          timestamp: new Date().toISOString(),
          footer: { text: 'FIB HQ · Allanamientos' },
        }],
      }),
    })
  } catch (e) {
    console.error('[webhook] Allanamiento error:', e)
  }
}

export async function uploadImageToWebhook(imageBuffer: Buffer, filename: string): Promise<string | null> {
  if (!ALLANAMIENTO_WEBHOOK) return null
  try {
    const formData = new FormData()
    const blob = new Blob([imageBuffer], { type: 'image/png' })
    formData.append('file', blob, filename)
    formData.append('payload_json', JSON.stringify({
      embeds: [{
        title: '📸 Imagen de Allanamiento',
        color: COLORS.blue,
        timestamp: new Date().toISOString(),
        footer: { text: 'FIB HQ · Allanamientos' },
      }],
    }))

    const res = await fetch(ALLANAMIENTO_WEBHOOK, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) return null
    return filename
  } catch {
    return null
  }
}

// Allanamiento log helpers
export function logAllanamiento(title: string, description: string, color?: number, fields?: EmbedField[]) {
  return sendAllanamientoWebhook(title, description, color ?? COLORS.blue, fields)
}

export function logAllanamientoCreado(numero: string, direccion: string, solicitante: string) {
  return sendAllanamientoWebhook(
    `📥 Nueva Solicitud de Allanamiento`,
    `Se ha creado una nueva solicitud de allanamiento.`,
    COLORS.orange,
    [
      { name: 'Número', value: numero, inline: true },
      { name: 'Dirección', value: direccion, inline: true },
      { name: 'Solicitante', value: solicitante, inline: true },
    ]
  )
}

export function logAllanamientoDocumentoGenerado(params: {
  numero: string
  direccion?: string
  generadoPor: string
  previewUrl?: string
}) {
  return sendAllanamientoWebhook(
    `📄 Documento Generado`,
    `Allanamiento **${params.numero}** ha generado su documento PDF oficial.`,
    COLORS.blue,
    [
      { name: 'Generado por', value: params.generadoPor, inline: true },
      ...(params.direccion ? [{ name: 'Dirección', value: params.direccion, inline: true }] : []),
      ...(params.previewUrl ? [{ name: 'Preview', value: params.previewUrl, inline: false }] : []),
    ]
  )
}

export function logAllanamientoHallazgo(params: {
  numero: string
  hallazgo: string
  reportadoPor: string
  propiedad?: string
  evidenciaUrl?: string
}) {
  return sendAllanamientoWebhook(
    `🔍 Hallazgo Registrado`,
    `En el allanamiento **${params.numero}** se registró un hallazgo.`,
    COLORS.orange,
    [
      { name: 'Hallazgo', value: params.hallazgo, inline: false },
      { name: 'Reportado por', value: params.reportadoPor, inline: true },
      ...(params.propiedad ? [{ name: 'Propiedad', value: params.propiedad, inline: true }] : []),
      ...(params.evidenciaUrl ? [{ name: 'Evidencia', value: params.evidenciaUrl, inline: false }] : []),
    ]
  )
}

export function logAllanamientoAutorizado(params: {
  numero: string
  autorizadoPor: string
  callsignAutorizador?: string | null
  numeroAgenteAutorizador?: string | null
  pngBuffer?: Buffer
  pdfBuffer?: Buffer
}) {
  return sendAllanamientoWebhook(
    `✅ Allanamiento Autorizado`,
    `Allanamiento **${params.numero}** ha sido firmado y autorizado.`,
    COLORS.green,
    [
      { name: 'Autorizado por', value: params.autorizadoPor, inline: true },
      ...(params.callsignAutorizador ? [{ name: 'Callsign', value: params.callsignAutorizador, inline: true }] : []),
      ...(params.numeroAgenteAutorizador ? [{ name: 'N° Agent', value: params.numeroAgenteAutorizador, inline: true }] : []),
    ]
  )
}

export function logAllanamientoEjecutado(params: {
  numero: string
  ejecutadoPor: string
  direccion?: string
  callsignEjecutor?: string | null
  numeroAgenteEjecutor?: string | null
  pngBuffer?: Buffer
}) {
  return sendAllanamientoWebhook(
    `⚠️ Allanamiento Ejecutado`,
    `Allanamiento **${params.numero}** ha sido marcado como EJECUTADO.`,
    COLORS.red,
    [
      { name: 'Ejecutado por', value: params.ejecutadoPor, inline: true },
      ...(params.callsignEjecutor ? [{ name: 'Callsign', value: params.callsignEjecutor, inline: true }] : []),
      ...(params.numeroAgenteEjecutor ? [{ name: 'N° Agent', value: params.numeroAgenteEjecutor, inline: true }] : []),
      ...(params.direccion ? [{ name: 'Dirección', value: params.direccion, inline: false }] : []),
    ]
  )
}

