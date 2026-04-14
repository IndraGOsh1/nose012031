import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getUser, forbidden, unauthorized, err } from '@/lib/auth'
import { getSecret } from '@/lib/secrets'
import { getRequestIp, rateLimit } from '@/lib/security'
import { issueBotKey, listBotKeys, revokeBotKey, verifyBotKey } from '@/lib/bot-keys'
import { recordAuditEvent } from '@/lib/audit-log'

function getSigningSecret() {
  return getSecret('BOT_API_SIGNING_SECRET') || ''
}

function secureCompare(a: string, b: string) {
  const aa = Buffer.from(a)
  const bb = Buffer.from(b)
  if (aa.length !== bb.length) return false
  return timingSafeEqual(aa, bb)
}

function verifySignedRequest(req: NextRequest, bodyText: string) {
  const secret = getSigningSecret()
  if (!secret) return { ok: false, reason: 'BOT_API_SIGNING_SECRET no configurado' }

  const ts = String(req.headers.get('x-bot-ts') || '').trim()
  const sig = String(req.headers.get('x-bot-signature') || '').trim()
  if (!ts || !sig) return { ok: false, reason: 'Firma requerida' }

  const tsMs = Number(ts)
  if (!Number.isFinite(tsMs)) return { ok: false, reason: 'x-bot-ts invalido' }
  const drift = Math.abs(Date.now() - tsMs)
  if (drift > 5 * 60 * 1000) return { ok: false, reason: 'Timestamp fuera de ventana' }

  const expected = createHmac('sha256', secret).update(`${ts}.${bodyText}`).digest('hex')
  if (!secureCompare(expected, sig)) return { ok: false, reason: 'Firma invalida' }

  return { ok: true }
}

async function parseBody(req: NextRequest) {
  const text = await req.text().catch(() => '')
  let json: any = {}
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = {}
  }
  return { text, json }
}

export async function GET(req: NextRequest) {
  const u = getUser(req)
  if (!u) return unauthorized()
  if (u.rol !== 'command_staff') return forbidden()

  const rows = await listBotKeys()
  return NextResponse.json({ keys: rows, total: rows.length })
}

export async function PATCH(req: NextRequest) {
  const u = getUser(req)
  if (!u) return unauthorized()
  if (u.rol !== 'command_staff') return forbidden()

  const body = await req.json().catch(() => ({}))
  const action = String(body.action || '').trim()

  if (action === 'revoke') {
    const id = String(body.id || '').trim()
    if (!id) return err('id requerido')
    const row = await revokeBotKey(id, u.username)
    if (!row) return err('Key no encontrada', 404)
    return NextResponse.json({ ok: true, id, revokedAt: row.revokedAt })
  }

  return err('Accion invalida')
}

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req)
  const limiter = rateLimit({ key: `bot:key:${ip}`, max: 60, windowMs: 60_000 })
  if (!limiter.ok) return err(`Rate limit. Reintenta en ${limiter.retryAfterSec}s`, 429)

  const { text, json } = await parseBody(req)
  const signed = verifySignedRequest(req, text)
  if (!signed.ok) {
    await recordAuditEvent({
      level: 'warn',
      source: 'bot-key-api',
      event: 'invalid_signature',
      message: signed.reason || 'Firma invalida',
      meta: { ip },
    }).catch(() => {})
    return err('Solicitud invalida', 401)
  }

  const action = String(json.action || '').trim()
  if (!action) return err('action requerido')

  if (action === 'verify') {
    const key = String(json.key || '').trim()
    if (!key) return err('key requerido')

    const found = await verifyBotKey(key)
    await recordAuditEvent({
      level: found ? 'info' : 'warn',
      source: 'bot-key-api',
      event: found ? 'verify_ok' : 'verify_fail',
      message: found ? `Key valida ${found.id}` : 'Intento key invalida',
      meta: { ip },
    }).catch(() => {})

    return NextResponse.json({ ok: !!found, scope: found?.scope || null, keyId: found?.id || null })
  }

  if (action === 'issue') {
    const operator = String(json.operator || 'discord-bot').slice(0, 80)
    const label = String(json.label || 'discord-bot').slice(0, 80)
    const scope = String(json.scope || 'discord-bot').slice(0, 80)

    const issued = await issueBotKey({ label, createdBy: operator, scope })
    return NextResponse.json({
      ok: true,
      keyId: issued.record.id,
      key: issued.plaintextKey,
      createdAt: issued.record.createdAt,
      scope: issued.record.scope,
    })
  }

  return err('action invalida')
}
