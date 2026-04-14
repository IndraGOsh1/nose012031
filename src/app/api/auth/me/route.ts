import { NextRequest, NextResponse } from 'next/server'
import { getUser, unauthorized } from '@/lib/auth'
import { getDB, listUsersFresh } from '@/lib/db'

export async function GET(req: NextRequest) {
  const u = getUser(req)
  if (!u) return unauthorized()
  await listUsersFresh()
  const db = await getDB()
  const user = db.users.get(u.id)
  if (!user) return unauthorized()
  const { passwordHash: _, ...safe } = user
  return NextResponse.json(safe)
}
