export interface Mensaje {
  id:        string
  canal:     string
  autor:     string
  nombre:    string
  callsign?: string
  contenido: string
  fecha:     string
  tipo:      'texto' | 'sistema' | 'imagen'
  leido:     string[]
}

export interface Canal {
  id:            string
  nombre:        string
  descripcion:   string
  tipo:          'general' | 'unidad' | 'dm' | 'comando' | 'supervisory' | 'private'
  unidad?:       string
  participantes?: string[]
  acceso:        string[]
  creadoEn:      string
  icono?:        string
  creadoPor?:    string
}
import { SupabaseMap } from './supabase-map'
import { createClient } from '@supabase/supabase-js'
import { getSecret } from './secrets'

declare global {
  // eslint-disable-next-line no-var
  var __fibChatV2: {
    canales:  Map<string, Canal>
    mensajes: Map<string, Mensaje[]>
  } | undefined
  var __fibChatInit: Promise<typeof global.__fibChatV2> | undefined
}

const DEFAULT_CANALES = (): Canal[] => {
  const now = new Date().toISOString()
  return [
    { id:'general',     nombre:'general',      descripcion:'Canal principal',                   tipo:'general',     acceso:['*'],                                        creadoEn:now },
    { id:'operaciones', nombre:'operaciones',   descripcion:'Coordinación operativa',            tipo:'general',     acceso:['command_staff','supervisory','federal_agent'],creadoEn:now },
    { id:'ert',         nombre:'ert',           descripcion:'Canal ERT',                         tipo:'unidad',      acceso:['*'],         icono:'🔫',                   creadoEn:now },
    { id:'cirg',        nombre:'cirg',          descripcion:'Canal CIRG',                        tipo:'unidad',      acceso:['*'],         icono:'🛡️',                   creadoEn:now },
    { id:'rrhh',        nombre:'rrhh',          descripcion:'Canal RRHH',                        tipo:'unidad',      acceso:['*'],         icono:'👥',                   creadoEn:now },
    { id:'supervisory', nombre:'supervisory',   descripcion:'Command Staff y Supervisory',       tipo:'supervisory', acceso:['command_staff','supervisory'],               creadoEn:now, icono:'⭐' },
    { id:'command',     nombre:'command-staff', descripcion:'Solo Command Staff',                tipo:'comando',     acceso:['command_staff'],                            creadoEn:now, icono:'👑' },
  ]
}

const isSupabaseEnabled = !!(getSecret('SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)

let _supabase: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (_supabase) return _supabase
  const url = getSecret('SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const key =
    getSecret('SUPABASE_SERVICE_ROLE_KEY') ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  if (!url || !key) return null
  _supabase = createClient(url, key)
  return _supabase
}

type ChatRead = {
  canal: string
  username: string
  last_read_at: string
}

type ChatMessageRow = {
  id: string
  canal: string
  autor: string
  nombre: string
  callsign?: string | null
  contenido: string
  fecha: string
  tipo: 'texto' | 'sistema' | 'imagen'
  leido?: string[] | null
}

function toMensaje(row: ChatMessageRow): Mensaje {
  return {
    id: row.id,
    canal: row.canal,
    autor: row.autor,
    nombre: row.nombre,
    callsign: row.callsign || undefined,
    contenido: row.contenido,
    fecha: row.fecha,
    tipo: row.tipo,
    leido: Array.isArray(row.leido) ? row.leido : [],
  }
}

async function initChatDB() {
  const now = new Date().toISOString()
  const defaults = DEFAULT_CANALES()

  if (isSupabaseEnabled) {
    const canalesMap = await SupabaseMap.create<'id', Canal>('chat_canales', 'id', defaults)

    // Load messages grouped by canal
    const mensajesMap = new Map<string, Mensaje[]>()
    for (const [canalId] of canalesMap) {
      mensajesMap.set(canalId, [])
    }

    // We'll load messages lazily per-canal in the API route instead
    // to avoid loading all messages at once. Set empty arrays here.
    global.__fibChatV2 = { canales: canalesMap, mensajes: mensajesMap }
    return global.__fibChatV2
  }

  // In-memory fallback
  if (!global.__fibChatV2) {
    global.__fibChatV2 = { canales: new Map(), mensajes: new Map() }
    defaults.forEach(c => {
      global.__fibChatV2!.canales.set(c.id, c)
      global.__fibChatV2!.mensajes.set(c.id, [{
        id:`sys-${c.id}`, canal:c.id, autor:'SYSTEM', nombre:'Sistema FIB',
        contenido: c.tipo==='comando' ? 'Canal confidencial — solo Command Staff.' :
                   c.tipo==='supervisory' ? 'Canal restringido — Command Staff y Supervisory.' :
                   `Bienvenidos a #${c.nombre}.`,
        fecha:now, tipo:'sistema', leido:[]
      }])
    })
  }
  return global.__fibChatV2
}

if (!global.__fibChatInit) {
  global.__fibChatInit = initChatDB()
}

export async function getChatDB() {
  await global.__fibChatInit
  return global.__fibChatV2!
}

export const ChatDB = new Proxy({} as typeof global.__fibChatV2 & {}, {
  get(_t, prop) {
    if (!global.__fibChatV2) throw new Error('[ChatDB] Acceso antes de inicializar.')
    return (global.__fibChatV2 as any)[prop]
  }
}) as { canales: Map<string, Canal>; mensajes: Map<string, Mensaje[]> }

export function canAccess(canal: Canal, rol: string, username: string): boolean {
  if (canal.tipo === 'dm' || canal.tipo === 'private') return canal.participantes?.includes(username) || false
  if (canal.acceso.includes('*')) return true
  return canal.acceso.includes(rol)
}

async function persistCanal(canal: Canal) {
  if (!isSupabaseEnabled) return
  const supabase = getSupabase()
  if (!supabase) return
  const { error } = await supabase.from('chat_canales').upsert(canal as any)
  if (error) throw new Error(`[chat] No se pudo persistir canal: ${error.message}`)
}

export async function getMessages(canalId: string, limit = 100): Promise<Mensaje[]> {
  const chat = await getChatDB()

  if (!isSupabaseEnabled) {
    return (chat.mensajes.get(canalId) || []).slice(-limit)
  }

  const supabase = getSupabase()
  if (!supabase) return (chat.mensajes.get(canalId) || []).slice(-limit)

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('canal', canalId)
    .order('fecha', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[ChatDB] Error loading messages:', error.message)
    return (chat.mensajes.get(canalId) || []).slice(-limit)
  }

  const msgs = ((data as ChatMessageRow[]) || []).map(toMensaje).reverse()
  chat.mensajes.set(canalId, msgs)
  return msgs
}

export async function appendMessage(canalId: string, msg: Mensaje) {
  const chat = await getChatDB()
  if (!isSupabaseEnabled) {
    if (!chat.mensajes.has(canalId)) chat.mensajes.set(canalId, [])
    const current = [...(chat.mensajes.get(canalId) || []), msg]
    if (current.length > 500) current.splice(0, current.length - 500)
    chat.mensajes.set(canalId, current)
    return
  }

  const supabase = getSupabase()
  if (!supabase) {
    if (!chat.mensajes.has(canalId)) chat.mensajes.set(canalId, [])
    const current = [...(chat.mensajes.get(canalId) || []), msg]
    if (current.length > 500) current.splice(0, current.length - 500)
    chat.mensajes.set(canalId, current)
    return
  }

  const row: ChatMessageRow = {
    id: msg.id,
    canal: msg.canal,
    autor: msg.autor,
    nombre: msg.nombre,
    callsign: msg.callsign || null,
    contenido: msg.contenido,
    fecha: msg.fecha,
    tipo: msg.tipo,
    leido: msg.leido,
  }
  const { error } = await supabase.from('chat_messages').insert(row as any)
  if (error) throw new Error(`[chat] No se pudo persistir mensaje: ${error.message}`)

  const current = [...(chat.mensajes.get(canalId) || []), msg]
  if (current.length > 500) current.splice(0, current.length - 500)
  chat.mensajes.set(canalId, current)
}

export async function markRead(canalId: string, username: string) {
  const chat = await getChatDB()
  const now = new Date().toISOString()

  if (!isSupabaseEnabled) {
    chat.mensajes.set(canalId, (chat.mensajes.get(canalId) || []).map((m) => ({
      ...m,
      leido: m.leido.includes(username) ? m.leido : [...m.leido, username],
    })))
    return
  }
  const supabase = getSupabase()
  if (!supabase) {
    chat.mensajes.set(canalId, (chat.mensajes.get(canalId) || []).map((m) => ({
      ...m,
      leido: m.leido.includes(username) ? m.leido : [...m.leido, username],
    })))
    return
  }

  const readRow: ChatRead = {
    canal: canalId,
    username,
    last_read_at: now,
  }
  const { error } = await supabase.from('chat_reads').upsert(readRow as any)
  if (error) throw new Error(`[chat] No se pudo persistir lectura: ${error.message}`)

  chat.mensajes.set(canalId, (chat.mensajes.get(canalId) || []).map((m) => ({
    ...m,
    leido: m.leido.includes(username) ? m.leido : [...m.leido, username],
  })))
}

export async function getLastMessage(canalId: string): Promise<Mensaje | null> {
  const chat = await getChatDB()

  if (!isSupabaseEnabled) {
    const msgs = chat.mensajes.get(canalId) || []
    return msgs.length ? msgs[msgs.length - 1] : null
  }

  const supabase = getSupabase()
  if (!supabase) {
    const msgs = chat.mensajes.get(canalId) || []
    return msgs.length ? msgs[msgs.length - 1] : null
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('canal', canalId)
    .order('fecha', { ascending: false })
    .limit(1)

  if (error || !data || data.length === 0) return null
  return toMensaje(data[0] as ChatMessageRow)
}

export async function getUnreadCount(canalId: string, username: string): Promise<number> {
  const chat = await getChatDB()

  if (!isSupabaseEnabled) {
    return (chat.mensajes.get(canalId) || []).filter(m => m.autor !== username && !m.leido.includes(username)).length
  }

  const supabase = getSupabase()
  if (!supabase) {
    return (chat.mensajes.get(canalId) || []).filter(m => m.autor !== username && !m.leido.includes(username)).length
  }

  const { data: readData } = await supabase
    .from('chat_reads')
    .select('last_read_at')
    .eq('canal', canalId)
    .eq('username', username)
    .limit(1)

  const lastReadAt = (readData as any[])?.[0]?.last_read_at as string | undefined
  let query = supabase
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('canal', canalId)
    .neq('autor', username)

  if (lastReadAt) {
    query = query.gt('fecha', lastReadAt)
  }

  const { count, error } = await query
  if (error) {
    console.error('[ChatDB] Error unread count:', error.message)
    return 0
  }
  return count || 0
}

export async function getOrCreateDM(u1: string, u2: string): Promise<Canal> {
  const id = 'dm-' + [u1,u2].sort().join('__')
  if (!ChatDB.canales.has(id)) {
    const c: Canal = { id, nombre:id, descripcion:'DM', tipo:'dm', acceso:[u1,u2], participantes:[u1,u2], creadoEn:new Date().toISOString(), creadoPor:u1 }
    await persistCanal(c)
    ChatDB.canales.set(id, c)
    ChatDB.mensajes.set(id, [])
  }
  return ChatDB.canales.get(id)!
}

export async function createPrivateChannel(input: {
  nombre: string
  descripcion?: string
  creadoPor: string
  participantes: string[]
}) {
  const id = `priv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  const canal: Canal = {
    id,
    nombre: input.nombre.trim().slice(0, 80),
    descripcion: String(input.descripcion || '').trim().slice(0, 240),
    tipo: 'private',
    acceso: [],
    participantes: Array.from(new Set(input.participantes.map((entry) => String(entry || '').trim()).filter(Boolean))),
    creadoEn: new Date().toISOString(),
    icono: '🔒',
    creadoPor: input.creadoPor,
  }
  const systemMessage: Mensaje = {
    id: `sys-${canal.id}`,
    canal: canal.id,
    autor: 'SYSTEM',
    nombre: 'Sistema FIB',
    contenido: `Canal privado creado por ${input.creadoPor}. Participantes: ${(canal.participantes || []).join(', ')}`,
    fecha: canal.creadoEn,
    tipo: 'sistema',
    leido: [],
  }
  await persistCanal(canal)
  ChatDB.canales.set(canal.id, canal)
  ChatDB.mensajes.set(canal.id, [])
  await appendMessage(canal.id, systemMessage)
  return canal
}

export async function countUnreadDMs(username: string): Promise<number> {
  const chat = await getChatDB()
  let n = 0
  for (const [id, canal] of chat.canales) {
    if (!['dm', 'private'].includes(canal.tipo) || !canal.participantes?.includes(username)) continue
    n += await getUnreadCount(id, username)
  }
  return n
}
