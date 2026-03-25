import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuid } from 'uuid'
import { getUser, unauthorized, forbidden, isUserFrozen, frozen } from '@/lib/auth'
import { canAccessCarpetaHilo, getCarpeta, persistCarpeta, type HiloCarpeta } from '@/lib/carpeta-db'
import { getDB } from '@/lib/db'

export async function GET(req: NextRequest) {
  const u = getUser(req)
  if (!u) return unauthorized()

  const { searchParams } = new URL(req.url)
  const scope = String(searchParams.get('scope') || '').trim().toLowerCase()
  let targetUsername = searchParams.get('username')
  const targetAgentNumber = searchParams.get('agentNumber')
  const targetDiscordId = searchParams.get('discordId')
  const isElevated = ['command_staff', 'supervisory'].includes(u.rol)

  if (scope === 'general') {
    if (!isElevated) return forbidden()
    const db = await getDB()
    const candidates = Array.from(db.users.values())
      .filter((candidate) => candidate.username && candidate.activo !== false)

    const rows = await Promise.all(candidates.map(async (candidate) => {
      const carpeta = await getCarpeta(candidate.username)
      return { candidate, carpeta }
    }))

    const grouped = new Map<string, any[]>()

    for (const row of rows) {
      const section = (Array.isArray(row.candidate.clases) && row.candidate.clases[0]
        ? String(row.candidate.clases[0]).trim()
        : 'General') || 'General'
      const hilos = (row.carpeta.hilos || []).map((hilo: any) => ({
        ...hilo,
        mensajes: Array.isArray(hilo.mensajes) ? hilo.mensajes.slice(-60) : [],
      }))
      if (!hilos.length) continue

      if (!grouped.has(section)) grouped.set(section, [])
      grouped.get(section)!.push(...hilos.map((hilo: any) => ({
        ...hilo,
        ownerUsername: row.candidate.username,
        ownerNombre: row.candidate.nombre || row.candidate.username,
        ownerCallsign: row.candidate.callsign || null,
      })))
    }

    const sections = Array.from(grouped.entries())
      .sort((a, b) => a[0].localeCompare(b[0], 'es', { sensitivity: 'base' }))
      .map(([section, hilos]) => ({
        section,
        hilos: hilos.sort((a: any, b: any) => String(b.creadoEn || '').localeCompare(String(a.creadoEn || ''))),
      }))

    return NextResponse.json({
      sections,
      totalThreads: sections.reduce((acc, section) => acc + section.hilos.length, 0),
    })
  }

  if (!targetUsername && (targetAgentNumber || targetDiscordId)) {
    const db = await getDB()
    const matched = Array.from(db.users.values()).find((candidate) => {
      if (targetAgentNumber && String(candidate.agentNumber || '') === targetAgentNumber) return true
      if (targetDiscordId && String(candidate.discordId || '') === targetDiscordId) return true
      return false
    })
    targetUsername = matched?.username || null
  }

  // If requesting another user's carpeta, require supervisory or command_staff
  if (targetUsername && targetUsername !== u.username) {
    if (!isElevated) return forbidden()
    const carpeta = await getCarpeta(targetUsername)
    return NextResponse.json({
      ...carpeta,
      anotaciones: carpeta.anotaciones.filter((a: any) => !a.privada),
      hilos: isElevated
        ? (carpeta.hilos || [])
        : (carpeta.hilos || []).filter((hilo: any) => canAccessCarpetaHilo(hilo, u.username, targetUsername!)),
    })
  }

  return NextResponse.json(await getCarpeta(targetUsername || u.username))
}

export async function POST(req: NextRequest) {
  const u = getUser(req)
  if (!u) return unauthorized()
  if (await isUserFrozen(u.id)) return frozen()
  const body = await req.json().catch(()=>({}))
  const now  = new Date().toISOString()
  const { searchParams } = new URL(req.url)
  const targetUsername = String(searchParams.get('username') || u.username)
  const isElevated = ['command_staff', 'supervisory'].includes(u.rol)
  const canModerateExternal = targetUsername !== u.username && isElevated
  if (targetUsername !== u.username && !isElevated) return forbidden()
  const carpeta = await getCarpeta(targetUsername)

  if (body.tipo === 'anotacion') {
    const { titulo, contenido, privada } = body
    if (!titulo?.trim() || !contenido?.trim()) return NextResponse.json({ error:'titulo y contenido requeridos' }, { status:400 })
    const next = {
      ...carpeta,
      anotaciones: [...carpeta.anotaciones, { id:uuid().slice(0,8), titulo:titulo.trim(), contenido:contenido.trim(), fecha:now, privada:privada||false }],
    }
    await persistCarpeta(next)
    return NextResponse.json({ mensaje:'✅ Anotación guardada' }, { status:201 })
  }

  if (body.tipo === 'documento') {
    const { nombre, descripcion } = body
    if (!nombre?.trim()) return NextResponse.json({ error:'nombre requerido' }, { status:400 })
    const next = {
      ...carpeta,
      documentos: [...carpeta.documentos, { id:uuid().slice(0,8), nombre:nombre.trim(), descripcion:descripcion||'', fecha:now }],
    }
    await persistCarpeta(next)
    return NextResponse.json({ mensaje:'✅ Documento registrado' }, { status:201 })
  }

  if (body.tipo === 'hilo') {
    const titulo = String(body.titulo || '').trim()
    const descripcion = String(body.descripcion || '').trim()
    const rawParticipants = Array.isArray(body.participantes) ? body.participantes : []
    if (!titulo) return NextResponse.json({ error:'titulo requerido' }, { status:400 })

    const db = await getDB()
    const validUsers = new Set(Array.from(db.users.values()).map((candidate) => String(candidate.username || '').toLowerCase()))
    const participantes = Array.from(new Set([
      targetUsername,
      u.username,
      ...rawParticipants.map((entry: any) => String(entry || '').trim()).filter(Boolean),
    ])).filter((username) => validUsers.has(String(username).toLowerCase()))

    const nuevoHilo: HiloCarpeta = {
      id: `hilo-${uuid().slice(0, 10)}`,
      titulo: titulo.slice(0, 160),
      descripcion: descripcion.slice(0, 1500),
      estado: 'abierto',
      creadoPor: u.username,
      creadoEn: now,
      participantes,
      mensajes: [
        {
          id: `msg-${uuid().slice(0, 10)}`,
          autor: u.username,
          nombre: u.nombre || u.username,
          contenido: descripcion || `Hilo privado creado por ${u.username}`,
          fecha: now,
          sistema: !descripcion,
        },
      ],
    }

    const next = {
      ...carpeta,
      hilos: [
        ...(carpeta.hilos || []),
        nuevoHilo,
      ],
    }
    await persistCarpeta(next)
    return NextResponse.json({ mensaje:'✅ Hilo privado creado' }, { status:201 })
  }

  if (body.tipo === 'hilo_mensaje') {
    const hiloId = String(body.hiloId || '').trim()
    const contenido = String(body.contenido || '').trim()
    if (!hiloId || !contenido) return NextResponse.json({ error:'hilo y contenido requeridos' }, { status:400 })
    const hilo = (carpeta.hilos || []).find((entry) => entry.id === hiloId)
    if (!hilo) return NextResponse.json({ error:'hilo no encontrado' }, { status:404 })
    if (!canModerateExternal && !canAccessCarpetaHilo(hilo, u.username, targetUsername)) return forbidden()

    const next = {
      ...carpeta,
      hilos: (carpeta.hilos || []).map((entry) => entry.id !== hiloId ? entry : {
        ...entry,
        mensajes: [
          ...(entry.mensajes || []),
          {
            id: `msg-${uuid().slice(0, 10)}`,
            autor: u.username,
            nombre: u.nombre || u.username,
            contenido: contenido.slice(0, 4000),
            fecha: now,
          },
        ],
      }),
    }
    await persistCarpeta(next)
    return NextResponse.json({ mensaje:'✅ Mensaje enviado' }, { status:201 })
  }

  if (body.tipo === 'hilo_estado') {
    const hiloId = String(body.hiloId || '').trim()
    const estado: 'abierto' | 'cerrado' = body.estado === 'cerrado' ? 'cerrado' : 'abierto'
    const hilo = (carpeta.hilos || []).find((entry) => entry.id === hiloId)
    if (!hilo) return NextResponse.json({ error:'hilo no encontrado' }, { status:404 })
    if (!canModerateExternal && !canAccessCarpetaHilo(hilo, u.username, targetUsername)) return forbidden()

    const next = {
      ...carpeta,
      hilos: (carpeta.hilos || []).map((entry) => entry.id !== hiloId ? entry : ({
        ...entry,
        estado,
        mensajes: [
          ...(entry.mensajes || []),
          {
            id: `msg-${uuid().slice(0, 10)}`,
            autor: 'SYSTEM',
            nombre: 'Sistema FIB',
            contenido: `Hilo marcado como ${estado}`,
            fecha: now,
            sistema: true,
          },
        ],
      } as HiloCarpeta)),
    }
    await persistCarpeta(next)
    return NextResponse.json({ mensaje:`✅ Hilo ${estado}` }, { status:201 })
  }

  return NextResponse.json({ error:'tipo inválido' }, { status:400 })
}

export async function DELETE(req: NextRequest) {
  const u = getUser(req)
  if (!u) return unauthorized()
  if (await isUserFrozen(u.id)) return frozen()
  const { tipo, id } = await req.json().catch(()=>({}))
  const { searchParams } = new URL(req.url)
  const targetUsername = String(searchParams.get('username') || u.username)
  if (targetUsername !== u.username && !['command_staff', 'supervisory'].includes(u.rol)) return forbidden()
  const carpeta = await getCarpeta(targetUsername)

  const next = {
    ...carpeta,
    anotaciones: tipo === 'anotacion' ? carpeta.anotaciones.filter((a: any) => a.id !== id) : carpeta.anotaciones,
    documentos: tipo === 'documento' ? carpeta.documentos.filter((d: any) => d.id !== id) : carpeta.documentos,
    hilos: tipo === 'hilo' ? (carpeta.hilos || []).filter((hilo: any) => hilo.id !== id) : (carpeta.hilos || []),
  }
  await persistCarpeta(next)

  return NextResponse.json({ mensaje:'✅ Eliminado' })
}
