export type Rol = 'command_staff' | 'supervisory' | 'federal_agent' | 'visitante'

export interface User {
  id:           string
  username:     string
  passwordHash: string
  rol:          Rol
  discordId:    string | null
  agentNumber:  string | null
  nombre:       string | null
  callsign:     string | null
  createdAt:    string
  activo:       boolean
  vetado?:      boolean
  vetoReason?:  string | null
  vetoAt?:      string | null
  vetoBy?:      string | null
  clases?:      string[]
  // Freeze: user can view everything but cannot perform any write/mutate action
  congelado?:       boolean
  congeladoReason?: string | null
  congeladoAt?:     string | null
  congeladoPor?:    string | null
}

export interface Invite {
  codigo:      string
  rol:         Rol
  discordId:   string | null
  agentNumber: string | null
  nombre:      string | null
  creadoPor:   string
  creadoEn:    string
  maxUsos:     number
  usos:        number
  usadoPor:    string[]
}

import { SupabaseMap } from './supabase-map'
import { createClient } from '@supabase/supabase-js'
import { getSecret } from './secrets'

const BOOTSTRAP_INVITE_CODE = 'FIB-CS-BOOTSTRAP'

const INITIAL_INVITE: Invite = {
  codigo: BOOTSTRAP_INVITE_CODE, rol:'command_staff',
  discordId:null, agentNumber:null, nombre:null,
  creadoPor:'SYSTEM', creadoEn:new Date().toISOString(),
  maxUsos:2, usos:0, usadoPor:[],
}

declare global {
  // eslint-disable-next-line no-var
  var __fibDB: { users: Map<string,User>; invites: Map<string,Invite> } | undefined
  var __fibDBInit: Promise<{ users: Map<string,User>; invites: Map<string,Invite> }> | undefined
}

const isSupabaseEnabled = !!(getSecret('SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)

let _adminClient: ReturnType<typeof createClient> | null = null

function getAdminClient() {
  if (_adminClient) return _adminClient
  const url = getSecret('SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key =
    getSecret('SUPABASE_SERVICE_ROLE_KEY') ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  if (!url || !key) return null
  _adminClient = createClient(url, key)
  return _adminClient
}

async function initDB() {
  if (isSupabaseEnabled) {
    const [users, invites] = await Promise.all([
      SupabaseMap.create<'id', User>('users', 'id'),
      SupabaseMap.create<'codigo', Invite>('invites', 'codigo', [INITIAL_INVITE]),
    ])
    return { users, invites }
  }
  if (!global.__fibDB) {
    global.__fibDB = { users: new Map(), invites: new Map() }
    global.__fibDB.invites.set(BOOTSTRAP_INVITE_CODE, INITIAL_INVITE)
  }
  return global.__fibDB!
}

if (!global.__fibDBInit) {
  global.__fibDBInit = initDB().then(db => {
    global.__fibDB = db
    return db
  })
}

export async function getDB() {
  return global.__fibDBInit!
}

export async function persistUserAndInvite(user: User, invite: Invite) {
  if (!isSupabaseEnabled) return
  const client = getAdminClient()
  if (!client) return

  const { error: userErr } = await (client.from('users') as any).upsert(user as any)
  if (userErr) throw new Error(`[db] No se pudo persistir usuario: ${userErr.message}`)

  const { error: inviteErr } = await (client.from('invites') as any).upsert(invite as any)
  if (!inviteErr) return

  await (client.from('users') as any).delete().eq('id', user.id)
  throw new Error(`[db] No se pudo persistir invite: ${inviteErr.message}`)
}

export async function persistUser(user: User) {
  if (!isSupabaseEnabled) return
  const client = getAdminClient()
  if (!client) return
  const { error } = await (client.from('users') as any).upsert(user as any)
  if (error) throw new Error(`[db] No se pudo persistir usuario: ${error.message}`)
}

export async function deleteUserById(id: string) {
  if (!isSupabaseEnabled) return
  const client = getAdminClient()
  if (!client) return
  const { error } = await (client.from('users') as any).delete().eq('id', id)
  if (error) throw new Error(`[db] No se pudo eliminar usuario: ${error.message}`)
}

export async function persistInvite(invite: Invite) {
  if (!isSupabaseEnabled) return
  const client = getAdminClient()
  if (!client) return
  const { error } = await (client.from('invites') as any).upsert(invite as any)
  if (error) throw new Error(`[db] No se pudo persistir invitacion: ${error.message}`)
}

export async function deleteInviteByCode(codigo: string) {
  if (!isSupabaseEnabled) return
  const client = getAdminClient()
  if (!client) return
  const { error } = await (client.from('invites') as any).delete().eq('codigo', codigo)
  if (error) throw new Error(`[db] No se pudo eliminar invitacion: ${error.message}`)
}

export const DB = new Proxy({} as { users: Map<string,User>; invites: Map<string,Invite> }, {
  get(_t, prop) {
    if (!global.__fibDB) throw new Error('[DB] Acceso antes de inicializar. Usa getDB() en rutas async.')
    return (global.__fibDB as any)[prop]
  }
})
