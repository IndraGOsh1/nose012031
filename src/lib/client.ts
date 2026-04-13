'use client'

export const SESSION_MAX_IDLE_MS = 3 * 60 * 60 * 1000

const USER_STORAGE_EVENT = 'fib-user-updated'
const SESSION_STORAGE_EVENT = 'fib-session-cleared'
const SESSION_ACTIVITY_KEY = 'fib_last_activity_at'

function tok() { return typeof window !== 'undefined' ? localStorage.getItem('fib_token')||'' : '' }

export function getStoredUser() {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('fib_user')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setStoredUser(user: any) {
  if (typeof window === 'undefined') return
  if (user == null) localStorage.removeItem('fib_user')
  else localStorage.setItem('fib_user', JSON.stringify(user))
  window.dispatchEvent(new CustomEvent(USER_STORAGE_EVENT, { detail: user ?? null }))
}

export function markSessionActivity(timestamp = Date.now()) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SESSION_ACTIVITY_KEY, String(timestamp))
}

export function getSessionLastActivityAt() {
  if (typeof window === 'undefined') return 0
  const raw = Number(localStorage.getItem(SESSION_ACTIVITY_KEY) || '0')
  return Number.isFinite(raw) ? raw : 0
}

export function isSessionIdleExpired(now = Date.now()) {
  const lastActivity = getSessionLastActivityAt()
  if (!lastActivity) return false
  return now - lastActivity > SESSION_MAX_IDLE_MS
}

export function clearStoredSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('fib_token')
  localStorage.removeItem('fib_user')
  localStorage.removeItem(SESSION_ACTIVITY_KEY)
  window.dispatchEvent(new CustomEvent(USER_STORAGE_EVENT, { detail: null }))
  window.dispatchEvent(new Event(SESSION_STORAGE_EVENT))
}

export function subscribeStoredUser(callback: (user: any) => void) {
  if (typeof window === 'undefined') return () => {}

  const onUserUpdated = (event: Event) => {
    callback((event as CustomEvent<any>).detail ?? getStoredUser())
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === 'fib_user') callback(getStoredUser())
    if (event.key === SESSION_ACTIVITY_KEY && event.newValue == null) callback(null)
  }

  window.addEventListener(USER_STORAGE_EVENT, onUserUpdated)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(USER_STORAGE_EVENT, onUserUpdated)
    window.removeEventListener('storage', onStorage)
  }
}

export function subscribeSessionCleared(callback: () => void) {
  if (typeof window === 'undefined') return () => {}

  const onCleared = () => callback()
  const onStorage = (event: StorageEvent) => {
    if (event.key === 'fib_token' && event.newValue == null) callback()
  }

  window.addEventListener(SESSION_STORAGE_EVENT, onCleared)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(SESSION_STORAGE_EVENT, onCleared)
    window.removeEventListener('storage', onStorage)
  }
}

export async function readJsonSafely<T>(res: Response, fallback: T): Promise<T> {
  const text = await res.text().catch(() => '')
  if (!text.trim()) return fallback
  try {
    return JSON.parse(text) as T
  } catch {
    return fallback
  }
}

async function api<T>(url: string, opts?: RequestInit): Promise<T> {
  const headers = new Headers(opts?.headers || {})
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const token = tok()
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch('/api'+url, { cache:'no-store', ...opts, headers })
  const data = await readJsonSafely<any>(res, {})
  if (!res.ok) throw new Error(data?.error || data?.message || `Error ${res.status}`)
  return data as T
}

// Auth
export const login    = (u:string,p:string) => api<any>('/auth/login',{method:'POST',body:JSON.stringify({username:u,password:p})})
export const register = (u:string,p:string,c:string,n?:string) => api<any>('/auth/register',{method:'POST',body:JSON.stringify({username:u,password:p,codigo:c,nombre:n})})
export const getMe    = () => api<any>('/auth/me')

// Personal
export const getPersonal  = (p?:Record<string,string>) => api<any>('/personal'+(p?'?'+new URLSearchParams(p):''))
export const getAgente    = (q:string) => api<any>(`/personal/${encodeURIComponent(q)}`)
export const crearAgente  = (b:any)    => api<any>('/personal',{method:'POST',body:JSON.stringify(b)})
export const editarAgente = (q:string,b:any) => api<any>(`/personal/${encodeURIComponent(q)}`,{method:'PATCH',body:JSON.stringify(b)})
export const sancionar    = (q:string,b:any) => api<any>(`/personal/${encodeURIComponent(q)}/sancionar`,{method:'POST',body:JSON.stringify(b)})

// Stats & config
export const getStats  = () => api<any>('/stats')
export const getConfig = () => api<any>('/config')

// Invites
export const getInvites   = () => api<any>('/invite')
export const crearInvite  = (b:any) => api<any>('/invite',{method:'POST',body:JSON.stringify(b)})
export const borrarInvite = (codigo:string) => api<any>('/invite',{method:'DELETE',body:JSON.stringify({codigo})})

// Users
export const getUsers   = (p?:Record<string,string>) => api<any>('/users'+(p?'?'+new URLSearchParams(p):''))
export const editarUser = (id:string,b:any) => api<any>(`/users/${id}`,{method:'PATCH',body:JSON.stringify(b)})
export const borrarUser = (id:string) => api<any>(`/users/${id}`,{method:'DELETE'})

// Operativos
export const getOperativos   = (p?:Record<string,string>) => api<any>('/operativos'+(p?'?'+new URLSearchParams(p):''))
export const getOperativo    = (id:string) => api<any>(`/operativos/${id}`)
export const crearOperativo  = (b:any) => api<any>('/operativos',{method:'POST',body:JSON.stringify(b)})
export const editarOperativo = (id:string,b:any) => api<any>(`/operativos/${id}`,{method:'PATCH',body:JSON.stringify(b)})
export const borrarOperativo = (id:string) => api<any>(`/operativos/${id}`,{method:'DELETE'})
export const getOperativosPublicos = async (p?:Record<string,string>) => {
  const res = await fetch('/api/operativos?publica=1'+(p?'&'+new URLSearchParams(p):''), { cache:'no-store' })
  return readJsonSafely<any>(res, [])
}

// Casos
export const getCasos   = (p?:Record<string,string>) => api<any>('/casos'+(p?'?'+new URLSearchParams(p):''))
export const getCaso    = (id:string) => api<any>(`/casos/${id}`)
export const crearCaso  = (b:any) => api<any>('/casos',{method:'POST',body:JSON.stringify(b)})
export const editarCaso = (id:string,b:any) => api<any>(`/casos/${id}`,{method:'PATCH',body:JSON.stringify(b)})
export const borrarCaso = (id:string) => api<any>(`/casos/${id}`,{method:'DELETE'})
export const addAgentToCaso = (id:string,agent:string) => api<any>(`/casos/${id}/access?agent=${encodeURIComponent(agent)}`,{method:'POST'})
export const removeAgentFromCaso = (id:string,agent:string) => api<any>(`/casos/${id}/access?agent=${encodeURIComponent(agent)}`,{method:'DELETE'})

// Allanamientos
export const getAllanamientos    = (p?:Record<string,string>) => api<any>('/allanamientos'+(p?'?'+new URLSearchParams(p):''))
export const getAllanamiento     = (id:string) => api<any>(`/allanamientos/${id}`)
export const crearAllanamiento  = (b:any) => api<any>('/allanamientos',{method:'POST',body:JSON.stringify(b)})
export const editarAllanamiento = (id:string,b:any) => api<any>(`/allanamientos/${id}`,{method:'PATCH',body:JSON.stringify(b)})
export const borrarAllanamiento = (id:string) => api<any>(`/allanamientos/${id}`,{method:'DELETE'})

// Tickets
export const getTickets   = (p?:Record<string,string>) => api<any>('/tickets'+(p?'?'+new URLSearchParams(p):''))
export const getTicket    = (id:string) => api<any>(`/tickets/${id}`)
export const crearTicket  = (b:any) => api<any>('/tickets',{method:'POST',body:JSON.stringify(b)})
export const editarTicket = (id:string,b:any) => api<any>(`/tickets/${id}`,{method:'PATCH',body:JSON.stringify(b)})
export const borrarTicket = (id:string) => api<any>(`/tickets/${id}`,{method:'DELETE'})

// Chat
export const getCanales    = () => api<any>('/chat')
export const getMensajes   = (canal:string) => api<any>(`/chat/${canal}`)
export const enviarMensaje = (canal:string,contenido:string) => api<any>(`/chat/${canal}`,{method:'POST',body:JSON.stringify({contenido})})
export const crearDM       = (targetUsername:string) => api<any>('/chat',{method:'POST',body:JSON.stringify({tipo:'dm',targetUsername})})
export const crearChatPrivado = (nombre:string, participantes:string[], descripcion?:string) => api<any>('/chat',{method:'POST',body:JSON.stringify({tipo:'private',nombre,descripcion,participantes})})

// Carpeta
export const getCarpeta        = () => api<any>('/carpeta')
export const getCarpetaByUsername = (username:string) => api<any>(`/carpeta?username=${encodeURIComponent(username)}`)
export const getCarpetasAdmin  = () => api<any>('/carpeta?scope=admin')
export const crearAnotacion    = (b:any) => api<any>('/carpeta',{method:'POST',body:JSON.stringify({tipo:'anotacion',...b})})
export const borrarCarpetaItem = (tipo:string,id:string) => api<any>('/carpeta',{method:'DELETE',body:JSON.stringify({tipo,id})})
export const crearHiloCarpeta  = (b:any, username?:string) => api<any>(`/carpeta${username ? `?username=${encodeURIComponent(username)}` : ''}`,{method:'POST',body:JSON.stringify({tipo:'hilo',...b})})
export const enviarMensajeHiloCarpeta = (hiloId:string, contenido:string, username?:string) => api<any>(`/carpeta${username ? `?username=${encodeURIComponent(username)}` : ''}`,{method:'POST',body:JSON.stringify({tipo:'hilo_mensaje',hiloId,contenido})})
export const setEstadoHiloCarpeta = (hiloId:string, estado:'abierto'|'cerrado', username?:string) => api<any>(`/carpeta${username ? `?username=${encodeURIComponent(username)}` : ''}`,{method:'POST',body:JSON.stringify({tipo:'hilo_estado',hiloId,estado})})
export const addAgentToCarpeta = (username:string, agent:string) => api<any>(`/carpeta/${encodeURIComponent(username)}/access?agent=${encodeURIComponent(agent)}`,{method:'POST'})
export const removeAgentFromCarpeta = (username:string, agent:string) => api<any>(`/carpeta/${encodeURIComponent(username)}/access?agent=${encodeURIComponent(agent)}`,{method:'DELETE'})
/** Asigna o remueve el supervisor de la carpeta de un agente (solo staff) */
export const setCarpetaSupervisor = (ownerUsername:string, supervisor:string|null) => api<any>(`/carpeta?username=${encodeURIComponent(ownerUsername)}`,{method:'POST',body:JSON.stringify({tipo:'supervisor',supervisor})})
/** Crea una carpeta nueva para un agente (solo staff) */
export const crearCarpetaAdmin  = (agentUsername:string) => api<any>(`/folders/${encodeURIComponent(agentUsername)}/create`,{method:'POST'})
/** Asigna la carpeta de un agente fuente al agente destino (solo staff) */
export const asignarCarpetaAdmin = (agentUsername:string, folderId:string) => api<any>(`/folders/${encodeURIComponent(agentUsername)}/assign`,{method:'POST',body:JSON.stringify({folder_id:folderId})})

// Config visual
export const getConfigVisual   = async () => {
  const res = await fetch('/api/config-visual', { cache:'no-store' })
  return readJsonSafely<any>(res, {})
}
export const setConfigVisual   = (b:any) => api<any>('/config-visual',{method:'PATCH',body:JSON.stringify(b)})
export const resetConfigVisual = () => api<any>('/config-visual',{method:'DELETE'})

// Forms
export const getForms = () => api<any>('/forms')
export const saveForm = (b:any) => api<any>('/forms',{method:'POST',body:JSON.stringify(b)})
export const submitForm = (id:string,b:any) => api<any>(`/forms/${id}/submit`,{method:'POST',body:JSON.stringify(b)})
export const getGoogleFormResponses = () => api<any>('/forms/google-responses')
export const getFormResponses = (id:string) => api<any>(`/forms/${id}/responses`)
export const editFormResponse = (id:string,b:any) => api<any>(`/forms/${id}/responses`,{method:'PATCH',body:JSON.stringify(b)})
export const deleteFormResponse = (id:string,submissionId:string) => api<any>(`/forms/${id}/responses`,{method:'DELETE',body:JSON.stringify({submissionId})})
