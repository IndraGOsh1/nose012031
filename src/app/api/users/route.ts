import { NextRequest, NextResponse } from 'next/server'
import { getUser, unauthorized, forbidden } from '@/lib/auth'
import { getDB } from '@/lib/db'

export async function GET(req: NextRequest) {
  const u = getUser(req); if (!u) return unauthorized()
  if (!['command_staff','supervisory'].includes(u.rol)) return forbidden()
  const db = await getDB()
  const safeUsers = Array.from(db.users.values()).map(({ passwordHash:_, ...safe }) => safe)
  if (u.rol === 'supervisory') {
    return NextResponse.json(
      safeUsers.map(usr => ({
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
  return NextResponse.json(safeUsers)
}
