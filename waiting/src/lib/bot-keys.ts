import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import { SupabaseMap, persistentMapSet } from './supabase-map'
import { encryptAes256Gcm } from './crypto-aes'
import { recordAuditEvent } from './audit-log'

export interface BotKeyRecord {
  id: string
  label: string
  keyHash: string
  keyEncrypted: string
  scope: string
  createdAt: string
  createdBy: string
  lastUsedAt: string | null
  revokedAt: string | null
  revokedBy: string | null
}

declare global {
  // eslint-disable-next-line no-var
  var __fibBotKeys: Map<string, BotKeyRecord> | undefined
  // eslint-disable-next-line no-var
  var __fibBotKeysInit: Promise<Map<string, BotKeyRecord>> | undefined
}

async function initBotKeysDB() {
  try {
    return await SupabaseMap.create<'id', BotKeyRecord>('bot_keys', 'id')
  } catch {
    if (!global.__fibBotKeys) global.__fibBotKeys = new Map<string, BotKeyRecord>()
    return global.__fibBotKeys
  }
}

if (!global.__fibBotKeysInit) {
  global.__fibBotKeysInit = initBotKeysDB().then((db) => {
    global.__fibBotKeys = db
    return db
  })
}

export async function getBotKeysDB() {
  return global.__fibBotKeysInit!
}

function makeId() {
  return `bk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function hashKey(raw: string) {
  return createHash('sha256').update(raw).digest('hex')
}

function safeEqHex(hexA: string, hexB: string) {
  const a = Buffer.from(hexA, 'hex')
  const b = Buffer.from(hexB, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function issueBotKey(input: { label: string; createdBy: string; scope?: string }) {
  const db = await getBotKeysDB()
  const secret = randomBytes(32).toString('base64url')
  const id = makeId()
  const now = new Date().toISOString()

  const record: BotKeyRecord = {
    id,
    label: String(input.label || 'discord-bot').slice(0, 80),
    keyHash: hashKey(secret),
    keyEncrypted: encryptAes256Gcm(secret),
    scope: String(input.scope || 'discord-bot').slice(0, 80),
    createdAt: now,
    createdBy: String(input.createdBy || 'system').slice(0, 80),
    lastUsedAt: null,
    revokedAt: null,
    revokedBy: null,
  }

  await persistentMapSet(db, record.id, record)
  await recordAuditEvent({
    level: 'warn',
    source: 'bot-key',
    event: 'issued',
    message: `Bot key issued: ${record.id}`,
    actor: record.createdBy,
    meta: { label: record.label, scope: record.scope },
  }).catch(() => {})

  return { record, plaintextKey: secret }
}

export async function verifyBotKey(rawKey: string) {
  const db = await getBotKeysDB()
  const candidateHash = hashKey(String(rawKey || ''))

  for (const row of db.values()) {
    if (row.revokedAt) continue
    if (!safeEqHex(candidateHash, row.keyHash)) continue

    row.lastUsedAt = new Date().toISOString()
    await persistentMapSet(db, row.id, row)
    return row
  }
  return null
}

export async function revokeBotKey(id: string, revokedBy: string) {
  const db = await getBotKeysDB()
  const row = db.get(id)
  if (!row) return null
  if (!row.revokedAt) {
    row.revokedAt = new Date().toISOString()
    row.revokedBy = String(revokedBy || 'system').slice(0, 80)
    await persistentMapSet(db, row.id, row)
    await recordAuditEvent({
      level: 'warn',
      source: 'bot-key',
      event: 'revoked',
      message: `Bot key revoked: ${row.id}`,
      actor: row.revokedBy,
      meta: { label: row.label },
    }).catch(() => {})
  }
  return row
}

export async function listBotKeys() {
  const db = await getBotKeysDB()
  return Array.from(db.values())
    .map((row) => ({
      id: row.id,
      label: row.label,
      scope: row.scope,
      createdAt: row.createdAt,
      createdBy: row.createdBy,
      lastUsedAt: row.lastUsedAt,
      revokedAt: row.revokedAt,
      revokedBy: row.revokedBy,
    }))
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
}
