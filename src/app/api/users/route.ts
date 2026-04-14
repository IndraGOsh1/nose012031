import { NextRequest, NextResponse } from 'next/server'
import { getUser, unauthorized, forbidden } from '@/lib/auth'
import { listUsersFresh } from '@/lib/db'

export async function GET(req: NextRequest) {
  const u = getUser(req); if (!u) return unauthorized()
  if (!['command_staff','supervisory'].includes(u.rol)) return forbidden()
  const q = String(new URL(req.url).searchParams.get('q') || '').trim().toLowerCase()
  const safeUsers = (await listUsersFresh()).map(({ passwordHash:_, ...safe }) => safe)
  const filtered = q
    ? safeUsers.filter((usr) => {
        const haystack = [
          usr.username,
          usr.nombre,
          usr.callsign,
          usr.discordId,
          usr.agentNumber,
          usr.rol,
          ...(Array.isArray(usr.clases) ? usr.clases : []),
        ].map((v) => String(v || '').toLowerCase())
        return haystack.some((v) => v.includes(q))
      })
    : safeUsers
  if (u.rol === 'supervisory') {
    return NextResponse.json(
      filtered.map(usr => ({
        id: usr.id,
        username: usr.username,
        callsign: usr.callsign,
        rol: usr.rol,
        clases: Array.isArray(usr.clases) ? usr.clases : [],
        activo: usr.activo,
        vetado: !!usr.vetado,
        createdAt: usr.createdAt,
      }))
    )
  }
  return NextResponse.json(filtered)
}
