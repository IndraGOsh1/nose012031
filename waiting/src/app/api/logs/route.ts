import { NextRequest, NextResponse } from 'next/server'
import { getUser, unauthorized, forbidden, err } from '@/lib/auth'
import { listAuditEvents, resendAuditEventsToDiscord } from '@/lib/audit-log'

function canReadLogs(rol: string) {
  return rol === 'command_staff' || rol === 'supervisory'
}

function canResendLogs(rol: string) {
  return rol === 'command_staff'
}

export async function GET(req: NextRequest) {
  const u = getUser(req)
  if (!u) return unauthorized()
  if (!canReadLogs(u.rol)) return forbidden()

  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get('limit') || 100)
  const levelRaw = (searchParams.get('level') || '').trim().toLowerCase()
  const source = (searchParams.get('source') || '').trim()
  const level = levelRaw === 'info' || levelRaw === 'warn' || levelRaw === 'error' ? levelRaw : undefined

  const rows = await listAuditEvents({
    limit: Number.isFinite(limit) ? limit : 100,
    level,
    source: source || undefined,
  })

  return NextResponse.json({ logs: rows, total: rows.length })
}

export async function POST(req: NextRequest) {
  const u = getUser(req)
  if (!u) return unauthorized()
  if (!canResendLogs(u.rol)) return forbidden()

  const body = await req.json().catch(() => ({}))
  const action = String(body.action || '').trim()
  if (action !== 'resend') return err('Accion invalida. Usa action="resend".')

  const ids = Array.isArray(body.ids) ? body.ids.map((x: any) => String(x || '').trim()).filter(Boolean) : []
  if (ids.length === 0) return err('Debes enviar ids[] con al menos 1 elemento.')
  if (ids.length > 100) return err('Maximo 100 logs por reenvio.')

  try {
    const result = await resendAuditEventsToDiscord(ids, u.username)
    return NextResponse.json({ ok: true, ...result })
  } catch (error: any) {
    return err(error?.message || 'No se pudo reenviar logs', 502)
  }
}
