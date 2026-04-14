import { NextRequest, NextResponse } from 'next/server'
import { getUser, unauthorized } from '@/lib/auth'
import { CONFIG } from '@/lib/config'

export async function GET(req: NextRequest) {
  const u = getUser(req)
  if (!u) return unauthorized()
  return NextResponse.json({ division: CONFIG.division, rangos: CONFIG.rangos, especialidades: CONFIG.especialidades })
}
