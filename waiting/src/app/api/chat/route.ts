import { NextRequest, NextResponse } from 'next/server'
import { getUser, unauthorized, forbidden, isUserFrozen, frozen } from '@/lib/auth'
import { getChatDB, canAccess, getOrCreateDM, countUnreadDMs, createPrivateChannel, getLastMessage, getUnreadCount } from '@/lib/chat-db'
import { getDB } from '@/lib/db'

export async function GET(req: NextRequest) {
  const u = getUser(req); if (!u) return unauthorized()
  const chat = await getChatDB()
  const allowed = Array.from(chat.canales.values()).filter(c => canAccess(c, u.rol, u.username))

  const canales = await Promise.all(
    allowed.map(async c => ({
      ...c,
      lastMessage: await getLastMessage(c.id),
      unread: await getUnreadCount(c.id, u.username),
    }))
  )

  const totalDMUnread = await countUnreadDMs(u.username)
  const totalUnread = canales.reduce((acc, c) => acc + (c.unread || 0), 0)
  return NextResponse.json({ canales, totalDMUnread, totalUnread })
}

export async function POST(req: NextRequest) {
  const u = getUser(req); if (!u) return unauthorized()
  if (await isUserFrozen(u.id)) return frozen()
  const { tipo, targetUsername, nombre, descripcion, participantes } = await req.json().catch(()=>({}))
  if (tipo === 'dm' && targetUsername) {
    const target = String(targetUsername).trim()
    if (!target) return NextResponse.json({ error:'Usuario destino inválido' }, { status:400 })
    if (target.toLowerCase() === u.username.toLowerCase()) {
      return NextResponse.json({ error:'No puedes abrir un DM contigo mismo' }, { status:400 })
    }

    const db = await getDB()
    const exists = Array.from(db.users.values()).some(us => us.username.toLowerCase() === target.toLowerCase())
    if (!exists) return NextResponse.json({ error:'Usuario no encontrado' }, { status:404 })

    const realUsername = Array.from(db.users.values()).find(us => us.username.toLowerCase() === target.toLowerCase())!.username
    const canal = await getOrCreateDM(u.username, realUsername)
    return NextResponse.json({ id:canal.id })
  }

  if (tipo === 'private') {
    const roomName = String(nombre || '').trim()
    const rawParticipants = Array.isArray(participantes) ? participantes : []
    if (!roomName) return NextResponse.json({ error:'Nombre requerido' }, { status:400 })

    const db = await getDB()
    const users = Array.from(db.users.values())
    const existing = new Set(users.map((entry) => entry.username.toLowerCase()))
    const normalized = Array.from(new Set([
      u.username,
      ...rawParticipants.map((entry: any) => String(entry || '').trim()).filter(Boolean),
    ])).filter((entry) => existing.has(entry.toLowerCase()))

    if (normalized.length < 2) {
      return NextResponse.json({ error:'Agrega al menos otro participante válido' }, { status:400 })
    }
    if (normalized.length > 8) {
      return NextResponse.json({ error:'Máximo 8 participantes por chat privado' }, { status:400 })
    }

    const canal = await createPrivateChannel({
      nombre: roomName,
      descripcion: String(descripcion || ''),
      creadoPor: u.username,
      participantes: normalized,
    })
    return NextResponse.json({ id: canal.id })
  }
  return forbidden()
}
