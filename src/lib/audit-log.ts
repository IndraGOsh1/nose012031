import { SupabaseMap, persistentMapSet } from './supabase-map'
import { getSecret } from './secrets'
import { logAudit } from './webhook'

export type AuditLevel = 'info' | 'warn' | 'error'

export interface AuditLogEntry {
  id: string
  timestamp: string
  level: AuditLevel
  source: string
  event: string
  message: string
  actor: string | null
  meta: Record<string, string>
  resentCount: number
  lastResentAt: string | null
}

declare global {
  // eslint-disable-next-line no-var
  var __fibAuditLogs: Map<string, AuditLogEntry> | undefined
  // eslint-disable-next-line no-var
  var __fibAuditLogsInit: Promise<Map<string, AuditLogEntry>> | undefined
}

async function initAuditLogsDB() {
  try {
    return await SupabaseMap.create<'id', AuditLogEntry>('audit_logs', 'id')
  } catch {
    if (!global.__fibAuditLogs) global.__fibAuditLogs = new Map<string, AuditLogEntry>()
    return global.__fibAuditLogs
  }
}

if (!global.__fibAuditLogsInit) {
  global.__fibAuditLogsInit = initAuditLogsDB().then((db) => {
    global.__fibAuditLogs = db
    return db
  })
}

export async function getAuditLogsDB() {
  return global.__fibAuditLogsInit!
}

function toMeta(input?: Record<string, unknown>) {
  const out: Record<string, string> = {}
  if (!input) return out
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue
    if (value === null) {
      out[key] = 'null'
      continue
    }
    const txt = typeof value === 'string' ? value : JSON.stringify(value)
    out[key] = txt.slice(0, 1000)
  }
  return out
}

function buildId() {
  const rand = Math.random().toString(36).slice(2, 10)
  return `audit-${Date.now()}-${rand}`
}

export async function recordAuditEvent(input: {
  level?: AuditLevel
  source: string
  event: string
  message: string
  actor?: string | null
  meta?: Record<string, unknown>
}) {
  const db = await getAuditLogsDB()
  const entry: AuditLogEntry = {
    id: buildId(),
    timestamp: new Date().toISOString(),
    level: input.level || 'info',
    source: String(input.source || 'unknown').slice(0, 80),
    event: String(input.event || 'event').slice(0, 120),
    message: String(input.message || '').slice(0, 2000),
    actor: input.actor ? String(input.actor).slice(0, 100) : null,
    meta: toMeta(input.meta),
    resentCount: 0,
    lastResentAt: null,
  }

  await persistentMapSet(db, entry.id, entry)

  // Auto-send to Discord if level is warn/error OR it's a critical event
  const isCritical = ['auth','config','personal'].includes(entry.source) || entry.level !== 'info'
  if (isCritical) {
    void logAudit(entry).catch(() => {})
  }

  return entry
}

export async function listAuditEvents(input?: {
  limit?: number
  level?: AuditLevel
  source?: string
}) {
  const db = await getAuditLogsDB()
  const max = Math.min(Math.max(Number(input?.limit || 100), 1), 500)
  const level = input?.level
  const source = input?.source ? String(input.source).toLowerCase().trim() : ''

  const rows = Array.from(db.values())
    .filter((r) => (level ? r.level === level : true))
    .filter((r) => (source ? r.source.toLowerCase().includes(source) : true))
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
    .slice(0, max)

  return rows
}

function getAuditWebhookUrl() {
  return (
    getSecret('DISCORD_WEBHOOK_AUDIT') ||
    getSecret('DISCORD_WEBHOOK_IMPORTANTE') ||
    getSecret('DISCORD_WEBHOOK_IMPORTANT') ||
    getSecret('DISCORD_WEBHOOK_EXTRAS') ||
    ''
  )
}

function buildDiscordPayload(entry: AuditLogEntry, resentBy: string) {
  const metaLines = Object.entries(entry.meta)
    .slice(0, 12)
    .map(([k, v]) => `• ${k}: ${v}`)

  const content = [
    '🔁 **Reenvio de Audit Log**',
    `ID: ${entry.id}`,
    `Nivel: ${entry.level.toUpperCase()}`,
    `Origen: ${entry.source}`,
    `Evento: ${entry.event}`,
    `Actor: ${entry.actor || '—'}`,
    `Fecha: ${entry.timestamp}`,
    `Por: ${resentBy}`,
    `Mensaje: ${entry.message}`,
    metaLines.length ? 'Meta:\n' + metaLines.join('\n') : 'Meta: —',
  ].join('\n')

  return { content: content.slice(0, 1900) }
}

export async function resendAuditEventsToDiscord(ids: string[], resentBy: string) {
  const webhookUrl = getAuditWebhookUrl()
  if (!webhookUrl) {
    throw new Error('No existe webhook de auditoria configurado (DISCORD_WEBHOOK_AUDIT/IMPORTANTE/EXTRAS).')
  }

  const db = await getAuditLogsDB()
  const uniqueIds = Array.from(new Set(ids.map((x) => String(x).trim()).filter(Boolean)))
  const rows = uniqueIds.map((id) => db.get(id)).filter(Boolean) as AuditLogEntry[]
  let sent = 0

  for (const row of rows) {
    const payload = buildDiscordPayload(row, resentBy)
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`Discord webhook failed (${res.status}): ${txt.slice(0, 300)}`)
    }

    row.resentCount = (row.resentCount || 0) + 1
    row.lastResentAt = new Date().toISOString()
    await persistentMapSet(db, row.id, row)
    sent += 1
  }

  return { requested: uniqueIds.length, found: rows.length, sent }
}
