import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { getDB, persistUserAndInvite } from '@/lib/db'
import { signToken, err } from '@/lib/auth'
import { logRegister } from '@/lib/webhook'
import { getRequestIp, isStrongEnoughPassword, rateLimit } from '@/lib/security'
import { getCarpeta } from '@/lib/carpeta-db'

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req)
  const limit = rateLimit({ key: `auth:register:${ip}`, max: 10, windowMs: 60_000 })
  if (!limit.ok) return err(`Demasiados intentos. Reintenta en ${limit.retryAfterSec}s`, 429)

  const { username, password, codigo, nombre } = await req.json().catch(()=>({}))
  if (!username?.trim() || !password || !codigo?.trim()) return err('username, password y codigo son requeridos')
  const normalizedUsername = String(username).trim().toLowerCase()
  if (!/^[a-z0-9_.-]{3,32}$/.test(normalizedUsername)) return err('Usuario inválido: usa 3-32 caracteres (a-z, 0-9, _, -, .)')
  if (!isStrongEnoughPassword(password)) return err('La contraseña debe tener al menos 8 caracteres e incluir letras y números')

  const codigoRaw = String(codigo).trim()
  const codigoNorm = codigoRaw.toUpperCase()
  const db = await getDB()
  const inv = db.invites.get(codigoNorm) || db.invites.get(codigoRaw)
  if (!inv) return err('Código de invitación inválido')
  if (inv.usos >= inv.maxUsos) return err(`Código agotado (${inv.usos}/${inv.maxUsos} usos)`)
  for (const u of db.users.values())
    if (u.username.toLowerCase() === normalizedUsername) return err('Ese nombre de usuario ya existe')
  const id = uuid()
  const passwordHash = await bcrypt.hash(password, 12)
  const user = {
    id,
    username:normalizedUsername,
    passwordHash,
    rol:inv.rol,
    discordId:inv.discordId,
    agentNumber:inv.agentNumber,
    nombre:nombre?.trim()||inv.nombre||null,
    callsign:null,
    createdAt:new Date().toISOString(),
    activo:true,
    vetado:false,
    vetoReason:null,
    vetoAt:null,
    vetoBy:null,
    clases: [],
  }
  const nextInvite = {
    ...inv,
    usos: inv.usos + 1,
    usadoPor: [...inv.usadoPor, normalizedUsername],
  }
  try {
    await persistUserAndInvite(user, nextInvite)
    db.users.set(id, user)
    db.invites.set(nextInvite.codigo, nextInvite)
    await getCarpeta(user.username)
  } catch {
    return err('No se pudo completar el registro en este momento. Reintenta.', 503)
  }
  logRegister(user.username, user.rol, nextInvite.codigo)
  const token = signToken({ id, username:user.username, rol:user.rol, nombre:user.nombre, agentNumber:user.agentNumber, callsign:null, clases: [] })
  return NextResponse.json({ token, usuario:{ id, username:user.username, rol:user.rol, nombre:user.nombre, agentNumber:user.agentNumber, callsign:null, clases: [] } }, { status:201 })
}
