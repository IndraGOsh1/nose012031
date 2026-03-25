import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuid } from 'uuid'
import { getUser, unauthorized, forbidden, notFound, isUserFrozen, frozen } from '@/lib/auth'
import { getChatDB, canAccess, markRead, getMessages, appendMessage, type Mensaje } from '@/lib/chat-db'
import { getDB } from '@/lib/db'
import { getRequestIp, rateLimit } from '@/lib/security'

type P = { params: Promise<{ canal:string }> }

export async function GET(req: NextRequest, { params }:P) {
  const u = getUser(req); if (!u) return unauthorized()
  const { canal:canalId } = await params
  const chat = await getChatDB()
  const canal = chat.canales.get(canalId); if (!canal) return notFound()
  if (!canAccess(canal, u.rol, u.username)) return forbidden()
  await markRead(canalId, u.username)
  const msgs = await getMessages(canalId, 100)
  return NextResponse.json(msgs)
}

export async function POST(req: NextRequest, { params }:P) {
  const u = getUser(req); if (!u) return unauthorized()
  if (await isUserFrozen(u.id)) return frozen()
  const ip = getRequestIp(req)
  const limit = rateLimit({ key: `chat:send:${u.username}:${ip}`, max: 20, windowMs: 10_000 })
  if (!limit.ok) {
    return NextResponse.json({ error:`Rate limit excedido. Espera ${limit.retryAfterSec}s` }, { status:429 })
  }

  const { canal:canalId } = await params
  const [chat, userDB] = await Promise.all([getChatDB(), getDB()])
  const canal = chat.canales.get(canalId); if (!canal) return notFound()
  if (!canAccess(canal, u.rol, u.username)) return forbidden()
  const { contenido } = await req.json().catch(()=>({}))
  if (!contenido?.trim()) return NextResponse.json({ error:'Vacío' }, { status:400 })
  const clean = String(contenido).trim()
  if (clean.length > 2000) return NextResponse.json({ error:'Mensaje demasiado largo (máximo 2000)' }, { status:400 })

  const userProfile = Array.from(userDB.users.values()).find(us => us.username === u.username)
  const callsign = userProfile?.callsign || null

  const isImg = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(clean)
  const msg: Mensaje = {
    id:       uuid().slice(0,12),
    canal:    canalId,
    autor:    u.username,
    nombre:   u.nombre || u.username,
    callsign: callsign || undefined,
    contenido:clean,
    fecha:    new Date().toISOString(),
    tipo:     isImg ? 'imagen' : 'texto',
    leido:    [u.username],
  }
  await appendMessage(canalId, msg)
  return NextResponse.json(msg, { status:201 })
}
