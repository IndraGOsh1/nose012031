'use client'

function tok() { return typeof window !== 'undefined' ? localStorage.getItem('fib_token')||'' : '' }

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
export const getUsers   = () => api<any>('/users')
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

// Allanamientos
export const getAllanamientos    = (p?:Record<string,string>) => api<any>('/allanamientos'+(p?'?'+new URLSearchParams(p):''))
export const getAllanamiento     = (id:string) => api<any>(`/allanamientos/${id}`)
export const crearAllanamiento  = (b:any) => api<any>('/allanamientos',{method:'POST',body:JSON.stringify(b)})
export const editarAllanamiento = (id:string,b:any) => api<any>(`/allanamientos/${id}`,{method:'PATCH',body:JSON.stringify(b)})

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
export const crearAnotacion    = (b:any) => api<any>('/carpeta',{method:'POST',body:JSON.stringify({tipo:'anotacion',...b})})
export const borrarCarpetaItem = (tipo:string,id:string) => api<any>('/carpeta',{method:'DELETE',body:JSON.stringify({tipo,id})})
export const crearHiloCarpeta  = (b:any, username?:string) => api<any>(`/carpeta${username ? `?username=${encodeURIComponent(username)}` : ''}`,{method:'POST',body:JSON.stringify({tipo:'hilo',...b})})
export const enviarMensajeHiloCarpeta = (hiloId:string, contenido:string, username?:string) => api<any>(`/carpeta${username ? `?username=${encodeURIComponent(username)}` : ''}`,{method:'POST',body:JSON.stringify({tipo:'hilo_mensaje',hiloId,contenido})})
export const setEstadoHiloCarpeta = (hiloId:string, estado:'abierto'|'cerrado', username?:string) => api<any>(`/carpeta${username ? `?username=${encodeURIComponent(username)}` : ''}`,{method:'POST',body:JSON.stringify({tipo:'hilo_estado',hiloId,estado})})

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
export const getFormResponses = (id:string) => api<any>(`/forms/${id}/responses`)
export const editFormResponse = (id:string,b:any) => api<any>(`/forms/${id}/responses`,{method:'PATCH',body:JSON.stringify(b)})
export const deleteFormResponse = (id:string,submissionId:string) => api<any>(`/forms/${id}/responses`,{method:'DELETE',body:JSON.stringify({submissionId})})
