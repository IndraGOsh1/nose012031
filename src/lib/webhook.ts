// Discord Webhook Logger
// Sends structured embeds to different webhook channels
import { getSecret } from './secrets'

const WEBHOOKS = {
  extras:    getSecret('DISCORD_WEBHOOK_EXTRAS'),
  keys:      getSecret('DISCORD_WEBHOOK_KEYS'),
  logins:    getSecret('DISCORD_WEBHOOK_LOGINS'),
  important: getSecret('DISCORD_WEBHOOK_IMPORTANTE') || getSecret('DISCORD_WEBHOOK_IMPORTANT'),
}

const ALLANAMIENTO_WEBHOOK =
  getSecret('DISCORD_WEBHOOK_ALLANAMIENTOS')

type WebhookType = keyof typeof WEBHOOKS
type Color = number

const COLORS = {
  green:  0x2ECC71,
  red:    0xE74C3C,
  blue:   0x3498DB,
  yellow: 0xF1C40F,
  gray:   0x95A5A6,
  purple: 0x9B59B6,
  orange: 0xE67E22,
  cyan:   0x1ABC9C,
}

interface EmbedField { name: string; value: string; inline?: boolean }

interface WebhookPayload {
  type:    WebhookType
  title:   string
  color?:  Color
  fields?: EmbedField[]
  description?: string
  footer?: string
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
    timestamp:   new Date().toISOString(),
    footer:      { text: payload.footer || 'FIB HQ System' },
  }

  try {
    await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ embeds: [embed] }),
    })
  } catch {}
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
