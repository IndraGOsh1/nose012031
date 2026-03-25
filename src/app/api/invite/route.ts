import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getUser, unauthorized, forbidden, err } from '@/lib/auth'
import { deleteInviteByCode, getDB, persistInvite, type Rol } from '@/lib/db'
import { logInviteCodes } from '@/lib/webhook'
import { getRequestIp, rateLimit } from '@/lib/security'

const ROLES: Rol[] = ['command_staff','supervisory','federal_agent','visitante']

export async function GET(req: NextRequest) {
  const u = getUser(req); if (!u) return unauthorized()
  if (!['command_staff','supervisory'].includes(u.rol)) return forbidden()
  const db = await getDB()
  return NextResponse.json(
    Array.from(db.invites.values())
      .map(i => ({ ...i, agotado: i.usos >= i.maxUsos }))
      .sort((a,b) => new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime())
  )
}

export async function POST(req: NextRequest) {
  const u = getUser(req); if (!u) return unauthorized()
  if (!['command_staff','supervisory'].includes(u.rol)) return forbidden()
  const ip = getRequestIp(req)
  const limit = rateLimit({ key: `invite:create:${u.username}:${ip}`, max: 20, windowMs: 60_000 })
  if (!limit.ok) return err(`Demasiadas solicitudes. Reintenta en ${limit.retryAfterSec}s`, 429)

  const { rol, maxUsos=1, discordId, agentNumber, nombre } = await req.json().catch(()=>({}))
  if (!rol || !ROLES.includes(rol)) return err('Rol inválido')
  if (u.rol === 'supervisory' && rol !== 'federal_agent') {
    return err('Supervisory solo puede crear invitaciones para federal_agent', 403)
  }

  const db = await getDB()
  const usos = Math.max(1, Math.min(10, Number(maxUsos) || 1))

  let codigo = ''
  for (let i = 0; i < 5; i++) {
    codigo = randomBytes(16).toString('hex').toUpperCase()
    if (!db.invites.has(codigo)) break
  }
  if (!codigo || db.invites.has(codigo)) return err('No se pudo generar un código único. Intenta nuevamente', 500)

  const invite = {
    codigo, rol, discordId:discordId||null, agentNumber:agentNumber||null,
    nombre:nombre||null, creadoPor:u.username,
    creadoEn:new Date().toISOString(), maxUsos:usos, usos:0, usadoPor:[],
  }
  try {
    await persistInvite(invite)
  } catch {
    return err('No se pudo persistir el codigo en base de datos. Reintenta.', 503)
  }
  db.invites.set(codigo, invite)
  logInviteCodes('Creada', codigo, rol, u.username)
  return NextResponse.json({ mensaje:'✅ Código creado', codigo, rol, maxUsos:usos }, { status:201 })
}

export async function DELETE(req: NextRequest) {
  const u = getUser(req); if (!u) return unauthorized()
  if (u.rol !== 'command_staff') return forbidden()
  const { codigo } = await req.json().catch(()=>({}))
  const db = await getDB()
  const code = String(codigo || '').trim().toUpperCase()
  if (!code || !db.invites.has(code)) return err('Código no encontrado', 404)
  const previous = db.invites.get(code)
  logInviteCodes('Eliminada', code, db.invites.get(code)!.rol, u.username)
  try {
    await deleteInviteByCode(code)
  } catch {
    return err('No se pudo eliminar el codigo en base de datos. Reintenta.', 503)
  }
  db.invites.delete(code)
  return NextResponse.json({ mensaje:'✅ Código eliminado' })
}
