import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDB } from '@/lib/db'
import { signToken, err, unauthorized } from '@/lib/auth'
import { logLogin } from '@/lib/webhook'
import { getRequestIp, rateLimit } from '@/lib/security'

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req)
  const limit = rateLimit({ key: `auth:login:${ip}`, max: 20, windowMs: 60_000 })
  if (!limit.ok) return err(`Demasiados intentos. Reintenta en ${limit.retryAfterSec}s`, 429)

  const { username, password } = await req.json().catch(()=>({}))
  if (!username || !password) return err('username y password requeridos')
  const normalizedUsername = String(username).trim().toLowerCase()
  const db = await getDB()
  let found = null
  for (const u of db.users.values())
    if (u.username.toLowerCase() === normalizedUsername) { found = u; break }
  if (!found) return unauthorized()
  if (!found.activo) return err('Cuenta desactivada', 403)
  if (found.vetado) return err('Cuenta no disponible', 403)
  if (!await bcrypt.compare(password, found.passwordHash)) return unauthorized()
  logLogin(found.username, found.rol, ip)
  const token = signToken({
    id: found.id,
    username: found.username,
    rol: found.rol,
    nombre: found.nombre,
    agentNumber: found.agentNumber,
    callsign: found.callsign,
    clases: Array.isArray(found.clases) ? found.clases : [],
  })
  const res = NextResponse.json({
    token,
    usuario: {
      id: found.id,
      username: found.username,
      rol: found.rol,
      nombre: found.nombre,
      agentNumber: found.agentNumber,
      discordId: found.discordId,
      callsign: found.callsign,
      clases: Array.isArray(found.clases) ? found.clases : [],
    },
  })
  // Emit httpOnly session cookie so Edge middleware can gate /dashboard/* server-side
  res.cookies.set('fib_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days — mirrors JWT expiry
    path: '/',
  })
  return res
}
