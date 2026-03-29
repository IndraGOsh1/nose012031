import { createHmac, timingSafeEqual } from 'crypto'
import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSecret } from '@/lib/secrets'
import { getRequestIp, rateLimit } from '@/lib/security'
import { deleteInviteByCode, getDB, persistInvite, type Rol } from '@/lib/db'
import { cacheMapDelete, cacheMapSet } from '@/lib/supabase-map'
import { logInviteCodes } from '@/lib/webhook'
import { err } from '@/lib/auth'

const ROLES: Rol[] = ['command_staff', 'supervisory', 'federal_agent', 'visitante']

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

  const ts  = String(req.headers.get('x-bot-ts') || '').trim()
  const sig = String(req.headers.get('x-bot-signature') || '').trim()
  if (!ts || !sig) return { ok: false, reason: 'Firma requerida' }

  const tsMs = Number(ts)
  if (!Number.isFinite(tsMs)) return { ok: false, reason: 'x-bot-ts invalido' }
  if (Math.abs(Date.now() - tsMs) > 5 * 60 * 1000) return { ok: false, reason: 'Timestamp fuera de ventana (5 min)' }

  const expected = createHmac('sha256', secret).update(`${ts}.${bodyText}`).digest('hex')
  if (!secureCompare(expected, sig)) return { ok: false, reason: 'Firma invalida' }

  return { ok: true }
}

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req)
  const limiter = rateLimit({ key: `bot:invite:${ip}`, max: 30, windowMs: 60_000 })
  if (!limiter.ok) return err(`Rate limit. Reintenta en ${limiter.retryAfterSec}s`, 429)

  const bodyText = await req.text().catch(() => '')
  let body: any = {}
  try { body = bodyText ? JSON.parse(bodyText) : {} } catch { return err('JSON inválido', 400) }

  const check = verifySignedRequest(req, bodyText)
  if (!check.ok) return err(check.reason || 'Firma inválida', 401)

  const rol     = String(body.rol     || '').trim() as Rol
  const nombre  = String(body.nombre  || '').trim() || null
  const discordId = String(body.discordId || '').trim() || null
  const operator  = String(body.operator  || 'bot').slice(0, 64)
  const maxUsos   = Math.max(1, Math.min(10, Number(body.maxUsos) || 1))

  if (!rol || !ROLES.includes(rol)) return err('Rol inválido. Valores: command_staff, supervisory, federal_agent, visitante')

  const db = await getDB()

  let codigo = ''
  for (let i = 0; i < 5; i++) {
    codigo = randomBytes(16).toString('hex').toUpperCase()
    if (!db.invites.has(codigo)) break
  }
  if (!codigo || db.invites.has(codigo)) return err('No se pudo generar código único', 500)

  const invite = {
    codigo,
    rol,
    discordId,
    agentNumber: null,
    nombre,
    creadoPor: `bot:${operator}`,
    creadoEn: new Date().toISOString(),
    maxUsos,
    usos: 0,
    usadoPor: [],
  }

  try {
    await persistInvite(invite)
  } catch {
    return err('No se pudo persistir el código. Reintenta.', 503)
  }

  cacheMapSet(db.invites, codigo, invite)
  logInviteCodes('Creada (bot)', codigo, rol, operator)

  // `key` is an alias for dashboard wording: both map to the same invite code.
  return NextResponse.json({ ok: true, codigo, key: codigo, rol, maxUsos, nombre, format: 'HEX32-UPPER' })
}

export async function DELETE(req: NextRequest) {
  const bodyText = await req.text().catch(() => '')
  let body: any = {}
  try { body = bodyText ? JSON.parse(bodyText) : {} } catch { return err('JSON inválido', 400) }

  const check = verifySignedRequest(req, bodyText)
  if (!check.ok) return err(check.reason || 'Firma inválida', 401)

  const codigo = String(body.codigo || '').trim().toUpperCase()
  if (!codigo) return err('codigo requerido')

  const db = await getDB()
  if (!db.invites.has(codigo)) return err('Código no encontrado', 404)

  logInviteCodes('Eliminada (bot)', codigo, db.invites.get(codigo)!.rol, 'bot')
  try {
    await deleteInviteByCode(codigo)
  } catch {
    return err('No se pudo eliminar el código. Reintenta.', 503)
  }
  cacheMapDelete(db.invites, codigo)

  return NextResponse.json({ ok: true, codigo })
}
