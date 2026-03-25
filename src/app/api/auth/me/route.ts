import { NextRequest, NextResponse } from 'next/server'
import { getUser, unauthorized } from '@/lib/auth'
import { getDB } from '@/lib/db'

export async function GET(req: NextRequest) {
  const u = getUser(req)
  if (!u) return unauthorized()
  const db = await getDB()
  const user = db.users.get(u.id)
  if (!user) {
    // JWT is valid but user not found in DB — possible cold-start / Supabase hiccup
    // Trust the signed token data so the session survives transient DB issues
    return NextResponse.json({
      id: u.id,
      username: u.username,
      rol: u.rol,
      nombre: u.nombre ?? null,
      agentNumber: u.agentNumber ?? null,
      callsign: u.callsign ?? null,
      clases: u.clases ?? [],
      activo: true,
      discordId: null,
    })
  }
  const { passwordHash: _, ...safe } = user
  return NextResponse.json(safe)
}
