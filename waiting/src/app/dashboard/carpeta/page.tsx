'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { Plus, Trash2, FileText, StickyNote, Lock, X, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Search, User, MessageSquare, Users, FolderOpen, FolderPlus, Shield, ArrowRightLeft, RefreshCw, Settings } from 'lucide-react'
import { getCarpeta, getStoredUser, crearAnotacion, borrarCarpetaItem, getAgente, crearHiloCarpeta, enviarMensajeHiloCarpeta, setEstadoHiloCarpeta, subscribeStoredUser, addAgentToCarpeta, removeAgentFromCarpeta, getPersonal, getCarpetasAdmin, setCarpetaSupervisor, crearCarpetaAdmin, asignarCarpetaAdmin } from '@/lib/client'
import { uiConfirm } from '@/lib/ui-dialog'

function formatThreadParticipants(participantes: string[] = []) {
  return participantes.join(', ')
}

function sectionLabel(raw: string) {
  const value = String(raw || 'General').trim()
  return value || 'General'
}

function Toast({ msg, ok, onClose }: { msg:string; ok:boolean; onClose:()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [])
  return (
    <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-2 px-4 py-3 border font-mono text-xs ${ok?'bg-green-900/40 border-green-700 text-green-300':'bg-red-900/40 border-red-700 text-red-300'}`}>
      {ok?<CheckCircle size={13}/>:<AlertCircle size={13}/>}{msg}
    </div>
  )
}

// ── Personal search dropdown ────────────────────────────────────────────
function PersonalSearchDropdown({ onSelect, placeholder = 'Buscar agente...' }: { onSelect: (agente: any) => void; placeholder?: string }) {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<any[]>([])
  const [open, setOpen]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const containerRef            = useRef<HTMLDivElement>(null)
  const debounceRef             = useRef<ReturnType<typeof setTimeout>>()

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const token = localStorage.getItem('fib_token') || ''
      const res = await fetch(`/api/personal?q=${encodeURIComponent(q)}&estado=Activo`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setResults(data.agentes || [])
    } catch { setResults([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, search])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 bg-bg-surface border border-bg-border focus-within:border-accent-blue transition-colors">
        <Search size={12} className="ml-3 text-tx-muted shrink-0" />
        <input
          className="flex-1 bg-transparent px-2 py-2 text-sm text-tx-primary placeholder-tx-muted focus:outline-none"
          placeholder={placeholder}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
        {loading && <div className="mr-3 w-3 h-3 border border-accent-blue/40 border-t-accent-blue rounded-full animate-spin shrink-0" />}
      </div>
      {open && (query.trim() || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 z-50 bg-bg-card border border-bg-border shadow-xl mt-0.5 max-h-52 overflow-y-auto">
          {results.length === 0 && query.trim() && !loading && (
            <p className="px-3 py-2.5 font-mono text-[10px] text-tx-muted">Sin resultados para "{query}"</p>
          )}
          {results.map((a: any) => (
            <button
              key={a.id || a.numero}
              onClick={() => { onSelect(a); setQuery(''); setResults([]); setOpen(false) }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-bg-hover transition-colors text-left border-b border-bg-border/50 last:border-0"
            >
              <div className="w-6 h-6 bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center shrink-0">
                <span className="font-display text-[9px] font-bold text-accent-blue uppercase">{a.nombre?.[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-tx-primary font-medium truncate">{a.nombre}</p>
                <p className="font-mono text-[8px] text-tx-muted">{a.rango} · #{a.numero}</p>
              </div>
              <span className={`tag text-[8px] border ${a.estado==='Activo'?'border-green-700 text-green-400':'border-gray-700 text-gray-400'}`}>{a.estado}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Manage carpeta access modal ────────────────────────────────────────────
function ModalGestionarAccesoCarpeta({ ownerUsername, acceso, onClose, onUpdate, onError }: { ownerUsername:string; acceso:string[]; onClose:()=>void; onUpdate:(m:string)=>void; onError:(m:string)=>void }) {
  const [loading, setLoading] = useState(false)

  async function addAgent(agente: any) {
    const username = agente.username || agente.nombre?.toLowerCase()
    if (!username) return
    setLoading(true)
    try {
      await addAgentToCarpeta(ownerUsername, username)
      onUpdate(`Acceso otorgado a ${agente.nombre}`)
    } catch(e:any) {
      onError(e.message || 'Error al agregar agente')
    } finally {
      setLoading(false)
    }
  }

  async function removeAgent(agentUsername: string) {
    setLoading(true)
    try {
      await removeAgentFromCarpeta(ownerUsername, agentUsername)
      onUpdate(`Acceso revocado a ${agentUsername}`)
    } catch(e:any) {
      onError(e.message || 'Error al remover agente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-bg-card border border-bg-border w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-bg-border">
          <div><span className="section-tag">// Gestionar Acceso</span><p className="font-display text-sm font-semibold tracking-wider uppercase text-tx-primary mt-0.5">Control de Acceso</p></div>
          <button onClick={onClose} className="text-tx-muted hover:text-tx-primary"><X size={15}/></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <p className="text-xs text-tx-secondary mb-3">Agentes con acceso actual:</p>
            {acceso.length === 0 ? (
              <p className="font-mono text-[9px] text-tx-muted">Sin agentes</p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-3">
                {acceso.map(agent => (
                  <div key={agent} className="flex items-center gap-2 px-2 py-1 bg-accent-blue/10 border border-accent-blue/30 rounded text-xs">
                    <span>{agent}</span>
                    <button 
                      onClick={() => removeAgent(agent)}
                      disabled={loading}
                      className="hover:text-red-400 disabled:opacity-50"
                    >
                      <X size={12}/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-tx-secondary mb-2">Agregar agente:</p>
            <PersonalSearchDropdown onSelect={addAgent} placeholder="Buscar agente..." />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Carpeta de otro agente (para roles superiores) ─────────────────────
function CarpetaExterna({ agente, onClose }: { agente: any; onClose: () => void }) {
  const [carpeta, setCarpeta] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'ficha'|'anotaciones'|'documentos'|'hilos'>('ficha')
  const [threadText, setThreadText] = useState('')
  const [threadBusy, setThreadBusy] = useState(false)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [showAccessModal, setShowAccessModal] = useState(false)
  const [user, setUser] = useState<any>(null)

  const loadCarpeta = useCallback(() => {
    const token = localStorage.getItem('fib_token') || ''
    const params = new URLSearchParams()
    if (agente.username) params.set('username', agente.username)
    if (agente.numero) params.set('agentNumber', String(agente.numero))
    if (agente.discordId) params.set('discordId', String(agente.discordId))
    return fetch(`/api/carpeta?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => { setCarpeta(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [agente])

  useEffect(() => {
    loadCarpeta()
    setUser(getStoredUser() || {})
  }, [loadCarpeta])

  const activeThread = carpeta?.hilos?.find((hilo: any) => hilo.id === activeThreadId) || carpeta?.hilos?.[0]

  async function enviarMensaje() {
    if (!activeThread?.id || !threadText.trim() || threadBusy) return
    setThreadBusy(true)
    try {
      const token = localStorage.getItem('fib_token') || ''
      const params = new URLSearchParams()
      if (agente.username) params.set('username', agente.username)
      if (agente.numero) params.set('agentNumber', String(agente.numero))
      if (agente.discordId) params.set('discordId', String(agente.discordId))
      await fetch(`/api/carpeta?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tipo: 'hilo_mensaje', hiloId: activeThread.id, contenido: threadText.trim() })
      }).then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data?.error || 'No se pudo enviar el mensaje')
      })
      setThreadText('')
      await loadCarpeta()
    } finally {
      setThreadBusy(false)
    }
  }

  async function toggleEstado(hilo: any) {
    setThreadBusy(true)
    try {
      const token = localStorage.getItem('fib_token') || ''
      const params = new URLSearchParams()
      if (agente.username) params.set('username', agente.username)
      if (agente.numero) params.set('agentNumber', String(agente.numero))
      if (agente.discordId) params.set('discordId', String(agente.discordId))
      await fetch(`/api/carpeta?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tipo: 'hilo_estado', hiloId: hilo.id, estado: hilo.estado === 'abierto' ? 'cerrado' : 'abierto' })
      }).then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data?.error || 'No se pudo actualizar el hilo')
      })
      await loadCarpeta()
    } finally {
      setThreadBusy(false)
    }
  }

  const ESTADO_TAG: Record<string,string> = {
    Activo:    'tag border-green-700 bg-green-900/20 text-green-400',
    Retirado:  'tag border-gray-700 text-gray-400',
    Expulsado: 'tag border-red-700 text-red-400',
    Vetado:    'tag border-gray-800 text-gray-600',
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-bg-card border border-bg-border w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-bg-border shrink-0">
          <div>
            <span className="section-tag">// Carpeta de Agente</span>
            <p className="font-display text-sm font-semibold tracking-wider uppercase text-tx-primary mt-0.5">{agente.nombre}</p>
            <p className="font-mono text-[8px] text-tx-muted">{agente.rango} · #{agente.numero}</p>
          </div>
          <div className="flex items-center gap-2">
            {['command_staff','supervisory'].includes(user?.rol) && (
              <button onClick={() => setShowAccessModal(true)} title="Gestionar acceso" className="text-tx-muted hover:text-accent-blue transition-colors">
                <Users size={15}/>
              </button>
            )}
            <button onClick={onClose} className="text-tx-muted hover:text-tx-primary"><X size={15}/></button>
          </div>
        </div>

        <div className="flex border-b border-bg-border shrink-0">
          {(['ficha','anotaciones','documentos','hilos'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 font-mono text-[9px] tracking-widest uppercase transition-all border-b-2 -mb-px ${tab===t?'border-accent-blue text-accent-blue':'border-transparent text-tx-muted hover:text-tx-secondary'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="text-center font-mono text-xs text-tx-muted py-8">Cargando...</p>
          ) : tab === 'ficha' ? (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['Nombre', agente.nombre],
                  ['Rango',  agente.rango],
                  ['Sección', agente.seccion],
                  ['N° Agente', `#${agente.numero}`],
                  ['Estado', agente.estado],
                  ['Ingreso', agente.fechaIngreso||'—'],
                ].map(([k,v]) => (
                  <div key={k} className="bg-bg-surface border border-bg-border p-2.5">
                    <p className="font-mono text-[8px] text-tx-muted uppercase mb-0.5">{k}</p>
                    <p className="text-xs text-tx-primary">{v}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[['Leves',agente.sLeves,'text-yellow-400','border-yellow-800/40'],['Moderadas',agente.sModeradas,'text-orange-400','border-orange-800/40'],['Graves',agente.sGraves,'text-red-400','border-red-800/40']].map(([k,v,c,b]) => (
                  <div key={k} className={`bg-bg-surface border ${b} p-3 text-center`}>
                    <p className={`font-display text-2xl font-bold ${c}`}>{v||'0'}</p>
                    <p className="font-mono text-[8px] text-tx-muted uppercase">{k}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : tab === 'anotaciones' ? (
            <div className="flex flex-col gap-2">
              {!carpeta?.anotaciones?.length
                ? <p className="text-center py-8 font-mono text-xs text-tx-muted">Sin anotaciones</p>
                : carpeta.anotaciones.filter((a:any)=>!a.privada).map((a:any) => (
                  <div key={a.id} className="card p-3">
                    <p className="text-sm font-medium text-tx-primary">{a.titulo}</p>
                    <p className="text-xs text-tx-secondary mt-1 leading-relaxed">{a.contenido}</p>
                    <p className="font-mono text-[8px] text-tx-muted mt-2">{new Date(a.fecha).toLocaleDateString('es')}</p>
                  </div>
                ))
              }
            </div>
          ) : tab === 'documentos' ? (
            <div className="flex flex-col gap-2">
              {!carpeta?.documentos?.length
                ? <p className="text-center py-8 font-mono text-xs text-tx-muted">Sin documentos</p>
                : carpeta.documentos.map((d:any) => (
                  <div key={d.id} className="card px-4 py-3 flex items-center gap-3">
                    <FileText size={14} className="text-accent-blue shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-tx-primary font-medium truncate">{d.nombre}</p>
                      {d.descripcion && <p className="text-xs text-tx-secondary truncate">{d.descripcion}</p>}
                    </div>
                  </div>
                ))
              }
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-4">
              <div className="border border-bg-border bg-bg-surface">
                <div className="px-3 py-2 border-b border-bg-border">
                  <p className="font-mono text-[8px] uppercase tracking-widest text-tx-muted">Hilos privados</p>
                </div>
                {!carpeta?.hilos?.length ? (
                  <p className="px-3 py-6 font-mono text-[10px] text-tx-muted text-center">Sin hilos accesibles</p>
                ) : (
                  <div className="flex flex-col">
                    {carpeta.hilos.map((hilo: any) => (
                      <button
                        key={hilo.id}
                        onClick={() => setActiveThreadId(hilo.id)}
                        className={`w-full text-left px-3 py-2 border-b border-bg-border transition-colors ${activeThread?.id === hilo.id ? 'bg-accent-blue/10 text-accent-blue' : 'hover:bg-bg-hover text-tx-secondary'}`}
                      >
                        <p className="text-sm font-medium truncate">{hilo.titulo}</p>
                        <p className="font-mono text-[8px] text-tx-muted uppercase">{hilo.estado} · {hilo.mensajes?.length || 0} mensajes</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="border border-bg-border bg-bg-surface min-h-64 flex flex-col">
                {!activeThread ? (
                  <div className="flex-1 flex items-center justify-center text-center px-4">
                    <div>
                      <MessageSquare size={28} className="mx-auto mb-2 text-tx-muted opacity-20" />
                      <p className="font-mono text-xs text-tx-muted uppercase tracking-widest">Selecciona un hilo</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-3 border-b border-bg-border">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-display text-sm font-semibold tracking-wider uppercase text-tx-primary">{activeThread.titulo}</p>
                          <p className="font-mono text-[8px] text-tx-muted">Participantes: {formatThreadParticipants(activeThread.participantes)}</p>
                        </div>
                        <button onClick={() => toggleEstado(activeThread)} className="btn-ghost py-1 px-2 text-[9px]">
                          {activeThread.estado === 'abierto' ? 'Cerrar hilo' : 'Reabrir hilo'}
                        </button>
                      </div>
                      {activeThread.descripcion && <p className="text-xs text-tx-secondary mt-2">{activeThread.descripcion}</p>}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                      {(activeThread.mensajes || []).map((mensaje: any) => (
                        <div key={mensaje.id} className={`border px-3 py-2 ${mensaje.sistema ? 'border-bg-border text-tx-muted bg-bg-card' : 'border-accent-blue/20 bg-bg-card'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-mono text-[9px] uppercase tracking-widest text-accent-blue">{mensaje.nombre}</p>
                            <p className="font-mono text-[8px] text-tx-muted">{new Date(mensaje.fecha).toLocaleString('es')}</p>
                          </div>
                          <p className="text-sm text-tx-secondary mt-1 whitespace-pre-wrap">{mensaje.contenido}</p>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-3 border-t border-bg-border flex gap-2">
                      <input
                        className="input text-sm flex-1"
                        placeholder={activeThread.estado === 'cerrado' ? 'Este hilo está cerrado' : 'Responder en este hilo privado'}
                        value={threadText}
                        onChange={(e) => setThreadText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && enviarMensaje()}
                        disabled={threadBusy || activeThread.estado === 'cerrado'}
                      />
                      <button onClick={enviarMensaje} disabled={threadBusy || !threadText.trim() || activeThread.estado === 'cerrado'} className="btn-primary py-2 text-[9px] px-3">
                        Enviar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── User search dropdown (uses /api/users, ensures username is always present) ──
function UserSearchDropdown({ onSelect, placeholder = 'Buscar usuario...', filter }: {
  onSelect: (user: any) => void
  placeholder?: string
  filter?: (u: any) => boolean
}) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<any[]>([])
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef          = useRef<HTMLDivElement>(null)
  const debounceRef           = useRef<ReturnType<typeof setTimeout>>()

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const token = localStorage.getItem('fib_token') || ''
      const res = await fetch(`/api/users?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      const users = Array.isArray(data) ? data : []
      setResults(filter ? users.filter(filter) : users)
    } catch { setResults([]) }
    finally { setLoading(false) }
  }, [filter])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, search])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const ROL_COLOR: Record<string, string> = {
    command_staff: 'text-red-400 border-red-700',
    supervisory: 'text-yellow-400 border-yellow-700',
    federal_agent: 'text-accent-blue border-accent-blue/50',
    visitante: 'text-tx-muted border-bg-border',
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 bg-bg-surface border border-bg-border focus-within:border-accent-blue transition-colors">
        <Search size={12} className="ml-3 text-tx-muted shrink-0" />
        <input
          className="flex-1 bg-transparent px-2 py-2 text-sm text-tx-primary placeholder-tx-muted focus:outline-none"
          placeholder={placeholder}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
        {loading && <div className="mr-3 w-3 h-3 border border-accent-blue/40 border-t-accent-blue rounded-full animate-spin shrink-0" />}
      </div>
      {open && (query.trim() || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 z-50 bg-bg-card border border-bg-border shadow-xl mt-0.5 max-h-52 overflow-y-auto">
          {results.length === 0 && query.trim() && !loading && (
            <p className="px-3 py-2.5 font-mono text-[10px] text-tx-muted">Sin resultados para "{query}"</p>
          )}
          {results.map((usr: any) => (
            <button
              key={usr.id || usr.username}
              onClick={() => { onSelect(usr); setQuery(''); setResults([]); setOpen(false) }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-bg-hover transition-colors text-left border-b border-bg-border/50 last:border-0"
            >
              <div className="w-6 h-6 bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center shrink-0">
                <span className="font-display text-[9px] font-bold text-accent-blue uppercase">{(usr.nombre || usr.username)?.[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-tx-primary font-medium truncate">{usr.nombre || usr.username}</p>
                <p className="font-mono text-[8px] text-tx-muted">@{usr.username}</p>
              </div>
              <span className={`tag text-[8px] border ${ROL_COLOR[usr.rol] || 'text-tx-muted border-bg-border'}`}>
                {usr.rol?.replace('_', ' ')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Staff carpeta panel (explorador + gestión + vista general) ────────────────
function StaffCarpetaPanel() {
  // Panel tabs
  const [tab, setTab] = useState<'explorador' | 'gestion' | 'general'>('explorador')

  // Explorer state
  const [items, setItems]           = useState<any[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [itemsError, setItemsError]   = useState<string | null>(null)
  const [search, setSearch]           = useState('')
  const [filterHas, setFilterHas]     = useState<'all' | 'si' | 'no'>('all')
  const [carpetaAbierta, setCarpetaAbierta] = useState<any>(null)

  // General sections state (moved here, with proper error handling)
  const [genSections, setGenSections] = useState<any[]>([])
  const [genLoading, setGenLoading]   = useState(false)
  const [genError, setGenError]       = useState<string | null>(null)
  const [genActive, setGenActive]     = useState<any>(null)
  const [genReply, setGenReply]       = useState('')
  const [genSaving, setGenSaving]     = useState(false)

  // Gestión sub-tabs
  const [gTab, setGTab] = useState<'crear' | 'supervisor' | 'asignar'>('crear')

  // Create folder state
  const [crearTarget, setCrearTarget] = useState<any>(null)
  const [crearBusy, setCrearBusy]     = useState(false)

  // Assign supervisor state
  const [supTarget, setSupTarget] = useState<any>(null)
  const [supAgent, setSupAgent]   = useState<any>(null)
  const [supBusy, setSupBusy]     = useState(false)

  // Transfer/assign folder state
  const [asigTarget, setAsigTarget] = useState<any>(null)
  const [asigSource, setAsigSource] = useState<any>(null)
  const [asigBusy, setAsigBusy]     = useState(false)

  // Toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // ── Loaders ────────────────────────────────────────────────────────────

  const cargarItems = useCallback(async () => {
    setItemsLoading(true)
    setItemsError(null)
    try {
      const data = await getCarpetasAdmin()
      setItems(data.carpetas || [])
    } catch (e: any) {
      setItemsError(e.message || 'Error cargando carpetas')
    } finally {
      setItemsLoading(false)
    }
  }, [])

  const cargarGeneral = useCallback(async (prefer?: { hiloId?: string; ownerUsername?: string }) => {
    setGenLoading(true)
    setGenError(null)
    try {
      const token = localStorage.getItem('fib_token') || ''
      const res = await fetch('/api/carpeta?scope=general', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json().catch(() => ({ sections: [] }))
      if (!res.ok) throw new Error(data?.error || 'No se pudo cargar la vista general')
      const sections = Array.isArray(data?.sections) ? data.sections : []
      setGenSections(sections)
      const flat = sections.flatMap((s: any) =>
        (Array.isArray(s.hilos) ? s.hilos : []).map((h: any) => ({
          ...h, section: sectionLabel(s.section),
        }))
      )
      if (prefer?.hiloId && prefer?.ownerUsername) {
        const same = flat.find((h: any) => h.id === prefer.hiloId && h.ownerUsername === prefer.ownerUsername)
        setGenActive(same || flat[0] || null)
      } else {
        setGenActive((prev: any) => {
          if (!prev) return flat[0] || null
          return flat.find((h: any) => h.id === prev.id && h.ownerUsername === prev.ownerUsername) || flat[0] || null
        })
      }
    } catch (e: any) {
      setGenError(e.message || 'Error cargando vista general')
    } finally {
      setGenLoading(false)
    }
  }, [])

  // Load explorer on mount; switch tabs trigger re-load
  useEffect(() => { cargarItems() }, [cargarItems])
  useEffect(() => {
    if (tab === 'general') cargarGeneral()
  }, [tab, cargarGeneral])

  // ── Actions ────────────────────────────────────────────────────────────

  async function crearCarpeta() {
    if (!crearTarget) return
    setCrearBusy(true)
    try {
      await crearCarpetaAdmin(crearTarget.username)
      setToast({ msg: `✅ Carpeta creada para ${crearTarget.nombre || crearTarget.username}`, ok: true })
      setCrearTarget(null)
      cargarItems()
    } catch (e: any) {
      setToast({ msg: e.message || 'Error al crear carpeta', ok: false })
    } finally {
      setCrearBusy(false)
    }
  }

  async function asignarSupervisor() {
    if (!supTarget || !supAgent) return
    setSupBusy(true)
    try {
      await setCarpetaSupervisor(supTarget.username, supAgent.username)
      setToast({ msg: `✅ Supervisor asignado a ${supTarget.nombre || supTarget.username}`, ok: true })
      setSupTarget(null)
      setSupAgent(null)
      cargarItems()
    } catch (e: any) {
      setToast({ msg: e.message || 'Error al asignar supervisor', ok: false })
    } finally {
      setSupBusy(false)
    }
  }

  async function removerSupervisor(item: any) {
    try {
      await setCarpetaSupervisor(item.username, null)
      setToast({ msg: `✅ Supervisor removido de ${item.nombre || item.username}`, ok: true })
      cargarItems()
    } catch (e: any) {
      setToast({ msg: e.message || 'Error al remover supervisor', ok: false })
    }
  }

  async function asignarCarpeta() {
    if (!asigTarget || !asigSource) return
    setAsigBusy(true)
    try {
      await asignarCarpetaAdmin(asigTarget.username, asigSource.username)
      setToast({ msg: `✅ Carpeta transferida a ${asigTarget.nombre || asigTarget.username}`, ok: true })
      setAsigTarget(null)
      setAsigSource(null)
      cargarItems()
    } catch (e: any) {
      setToast({ msg: e.message || 'Error al transferir carpeta', ok: false })
    } finally {
      setAsigBusy(false)
    }
  }

  async function responderGeneral() {
    if (!genActive?.id || !genActive?.ownerUsername || !genReply.trim() || genSaving) return
    setGenSaving(true)
    try {
      await enviarMensajeHiloCarpeta(genActive.id, genReply.trim(), genActive.ownerUsername)
      setGenReply('')
      await cargarGeneral({ hiloId: genActive.id, ownerUsername: genActive.ownerUsername })
    } catch (e: any) {
      setToast({ msg: e.message || 'Error al enviar mensaje', ok: false })
    } finally {
      setGenSaving(false)
    }
  }

  // ── Filtered list ──────────────────────────────────────────────────────

  const filtered = items.filter(item => {
    if (filterHas === 'si' && !item.tieneCarpeta) return false
    if (filterHas === 'no' && item.tieneCarpeta) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (
        !item.nombre?.toLowerCase().includes(q) &&
        !item.username?.toLowerCase().includes(q) &&
        !String(item.agentNumber || '').includes(q) &&
        !item.rol?.toLowerCase().includes(q) &&
        !item.supervisor?.toLowerCase().includes(q)
      ) return false
    }
    return true
  })

  const ROL_COLOR: Record<string, string> = {
    command_staff: 'text-red-400 border-red-700',
    supervisory: 'text-yellow-400 border-yellow-700',
    federal_agent: 'text-accent-blue border-accent-blue/50',
    visitante: 'text-tx-muted border-bg-border',
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="card p-0 mb-5 overflow-hidden">
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}
      {carpetaAbierta && (
        <CarpetaExterna agente={carpetaAbierta} onClose={() => setCarpetaAbierta(null)} />
      )}

      {/* Panel header */}
      <div className="px-5 py-4 border-b border-bg-border bg-bg-surface flex items-center justify-between gap-4">
        <div>
          <span className="section-tag">// Panel Staff</span>
          <p className="font-display text-sm font-semibold tracking-wider uppercase text-tx-primary mt-0.5">
            Gestión de Carpetas Personales
          </p>
          <p className="font-mono text-[8px] text-tx-dim mt-1">
            {items.length > 0 && `${items.length} agentes · ${items.filter(i => i.tieneCarpeta).length} con carpeta`}
          </p>
        </div>
        <button
          onClick={cargarItems}
          disabled={itemsLoading}
          className="btn-ghost py-1.5 px-3 text-[9px] flex items-center gap-1.5"
          title="Recargar lista"
        >
          <RefreshCw size={11} className={itemsLoading ? 'animate-spin' : ''} />
          Recargar
        </button>
      </div>

      {/* Panel tabs */}
      <div className="flex border-b border-bg-border bg-bg-card">
        {([
          { id: 'explorador', label: 'Explorador',    Icon: FolderOpen },
          { id: 'gestion',    label: 'Gestión',       Icon: Settings },
          { id: 'general',    label: 'Vista General', Icon: Users },
        ] as const).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-3 font-mono text-[9px] tracking-widest uppercase transition-all border-b-2 -mb-px ${
              tab === id ? 'border-accent-blue text-accent-blue' : 'border-transparent text-tx-muted hover:text-tx-secondary'
            }`}
          >
            <Icon size={11} />{label}
          </button>
        ))}
      </div>

      {/* ── EXPLORADOR TAB ─────────────────────────────────────────── */}
      {tab === 'explorador' && (
        <div className="p-4">
          {/* Search + filters */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="flex items-center gap-2 flex-1 bg-bg-surface border border-bg-border focus-within:border-accent-blue transition-colors px-3">
              <Search size={12} className="text-tx-muted shrink-0" />
              <input
                className="flex-1 bg-transparent py-2 text-sm text-tx-primary placeholder-tx-muted focus:outline-none"
                placeholder="Buscar por nombre, usuario, N°, rol, supervisor..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-tx-muted hover:text-tx-primary shrink-0">
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              {(['all', 'si', 'no'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterHas(f)}
                  className={`px-3 py-2 font-mono text-[9px] uppercase tracking-widest border transition-colors ${
                    filterHas === f ? 'border-accent-blue text-accent-blue bg-accent-blue/10' : 'border-bg-border text-tx-muted hover:border-accent-blue/50'
                  }`}
                >
                  {f === 'all' ? 'Todos' : f === 'si' ? 'Con Carpeta' : 'Sin Carpeta'}
                </button>
              ))}
            </div>
          </div>

          {/* Error state */}
          {itemsError && (
            <div className="bg-red-900/20 border border-red-700/50 px-4 py-3 mb-3 flex items-center gap-3">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <p className="font-mono text-xs text-red-300">{itemsError}</p>
              <button onClick={cargarItems} className="ml-auto btn-ghost py-1 px-2 text-[9px]">Reintentar</button>
            </div>
          )}

          {/* Loading state */}
          {itemsLoading && items.length === 0 && (
            <div className="py-12 text-center">
              <div className="w-5 h-5 border border-accent-blue/40 border-t-accent-blue rounded-full animate-spin mx-auto mb-3" />
              <p className="font-mono text-xs text-tx-muted">Cargando agentes...</p>
            </div>
          )}

          {/* Agent list */}
          {!itemsLoading && !itemsError && filtered.length === 0 && (
            <div className="py-12 text-center">
              <FolderOpen size={28} className="mx-auto mb-3 text-tx-muted opacity-20" />
              <p className="font-mono text-xs text-tx-muted uppercase tracking-widest">Sin resultados</p>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="border border-bg-border overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-0 border-b border-bg-border bg-bg-surface">
                {['Agente', 'Rol', 'Supervisor', 'Carpeta', 'Acciones'].map(h => (
                  <div key={h} className="px-3 py-2 font-mono text-[8px] uppercase tracking-widest text-tx-muted">{h}</div>
                ))}
              </div>

              {/* Rows */}
              <div className="max-h-[420px] overflow-y-auto">
                {filtered.map(item => (
                  <div
                    key={item.username}
                    className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-0 border-b border-bg-border last:border-0 hover:bg-bg-hover/50 transition-colors ${!item.activo ? 'opacity-50' : ''}`}
                  >
                    {/* Nombre */}
                    <div className="px-3 py-2.5 min-w-0">
                      <p className="text-sm text-tx-primary font-medium truncate">{item.nombre}</p>
                      <p className="font-mono text-[8px] text-tx-muted">@{item.username}{item.agentNumber ? ` · #${item.agentNumber}` : ''}</p>
                    </div>

                    {/* Rol */}
                    <div className="px-3 py-2.5 flex items-center">
                      <span className={`tag text-[8px] border ${ROL_COLOR[item.rol] || 'text-tx-muted border-bg-border'}`}>
                        {item.rol?.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Supervisor */}
                    <div className="px-3 py-2.5 flex items-center gap-1">
                      {item.supervisor ? (
                        <div className="flex items-center gap-1.5">
                          <Shield size={10} className="text-yellow-400 shrink-0" />
                          <span className="font-mono text-[9px] text-yellow-300">{item.supervisor}</span>
                          <button
                            onClick={() => removerSupervisor(item)}
                            className="text-tx-muted hover:text-red-400 transition-colors"
                            title="Remover supervisor"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ) : (
                        <span className="font-mono text-[9px] text-tx-muted">—</span>
                      )}
                    </div>

                    {/* Carpeta status */}
                    <div className="px-3 py-2.5 flex items-center">
                      {item.tieneCarpeta ? (
                        <div className="text-center">
                          <div className="flex items-center gap-1">
                            <FolderOpen size={11} className="text-green-400" />
                            <span className="font-mono text-[8px] text-green-400">SÍ</span>
                          </div>
                          <p className="font-mono text-[7px] text-tx-muted mt-0.5">
                            {item.totalAnotaciones}A · {item.totalDocumentos}D · {item.totalHilos}H
                          </p>
                        </div>
                      ) : (
                        <span className="font-mono text-[9px] text-tx-muted">Sin carpeta</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="px-3 py-2.5 flex items-center gap-1">
                      <button
                        onClick={() => setCarpetaAbierta({ username: item.username, nombre: item.nombre, numero: item.agentNumber })}
                        className="btn-ghost py-1 px-2 text-[9px] flex items-center gap-1"
                        title="Ver carpeta"
                      >
                        <FolderOpen size={10} />Ver
                      </button>
                      {!item.tieneCarpeta && (
                        <button
                          onClick={async () => {
                            try {
                              await crearCarpetaAdmin(item.username)
                              setToast({ msg: `✅ Carpeta creada para ${item.nombre}`, ok: true })
                              cargarItems()
                            } catch (e: any) {
                              setToast({ msg: e.message || 'Error', ok: false })
                            }
                          }}
                          className="btn-ghost py-1 px-2 text-[9px] text-green-400 hover:text-green-300 flex items-center gap-1"
                          title="Crear carpeta"
                        >
                          <FolderPlus size={10} />Crear
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary footer */}
              <div className="px-4 py-2 border-t border-bg-border bg-bg-surface flex gap-4">
                <span className="font-mono text-[8px] text-tx-muted">{filtered.length} agentes mostrados</span>
                <span className="font-mono text-[8px] text-green-400">{filtered.filter(i => i.tieneCarpeta).length} con carpeta</span>
                <span className="font-mono text-[8px] text-tx-muted">{filtered.filter(i => !i.tieneCarpeta).length} sin carpeta</span>
                <span className="font-mono text-[8px] text-yellow-400">{filtered.filter(i => i.supervisor).length} supervisados</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── GESTIÓN TAB ────────────────────────────────────────────── */}
      {tab === 'gestion' && (
        <div className="p-4">
          {/* Gestión sub-tabs */}
          <div className="flex gap-1 mb-5">
            {([
              { id: 'crear',      label: 'Crear Carpeta',      Icon: FolderPlus },
              { id: 'supervisor', label: 'Asignar Supervisor', Icon: Shield },
              { id: 'asignar',    label: 'Transferir Propiedad', Icon: ArrowRightLeft },
            ] as const).map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setGTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2 font-mono text-[9px] tracking-widest uppercase border transition-colors ${
                  gTab === id ? 'border-accent-blue text-accent-blue bg-accent-blue/10' : 'border-bg-border text-tx-muted hover:border-accent-blue/50'
                }`}
              >
                <Icon size={11} />{label}
              </button>
            ))}
          </div>

          {/* ── Crear Carpeta ──────────────────────────────── */}
          {gTab === 'crear' && (
            <div className="max-w-md flex flex-col gap-4">
              <div className="bg-bg-surface border border-bg-border p-4">
                <p className="font-mono text-[8px] text-tx-muted uppercase mb-1">Descripción</p>
                <p className="text-xs text-tx-secondary leading-relaxed">
                  Crea una carpeta personal nueva para un agente que aún no tiene ninguna. Si el agente ya tiene una carpeta asignada, la operación será rechazada.
                </p>
              </div>

              <div>
                <label className="label">Agente destinatario</label>
                {crearTarget ? (
                  <div className="flex items-center gap-3 bg-bg-surface border border-accent-blue/40 px-3 py-2.5">
                    <div className="w-7 h-7 bg-accent-blue/20 border border-accent-blue/40 flex items-center justify-center shrink-0">
                      <span className="font-display text-[10px] font-bold text-accent-blue uppercase">{(crearTarget.nombre || crearTarget.username)?.[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-tx-primary font-medium">{crearTarget.nombre || crearTarget.username}</p>
                      <p className="font-mono text-[8px] text-tx-muted">@{crearTarget.username} · {crearTarget.rol?.replace('_', ' ')}</p>
                    </div>
                    <button onClick={() => setCrearTarget(null)} className="text-tx-muted hover:text-tx-primary"><X size={13} /></button>
                  </div>
                ) : (
                  <UserSearchDropdown placeholder="Buscar agente por nombre o usuario..." onSelect={setCrearTarget} />
                )}
              </div>

              <button
                onClick={crearCarpeta}
                disabled={crearBusy || !crearTarget}
                className="btn-primary py-2.5 px-5 text-[10px] flex items-center gap-2 w-fit disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FolderPlus size={12} />
                {crearBusy ? 'Creando...' : 'Crear Carpeta'}
              </button>
            </div>
          )}

          {/* ── Asignar Supervisor ─────────────────────────── */}
          {gTab === 'supervisor' && (
            <div className="max-w-md flex flex-col gap-4">
              <div className="bg-bg-surface border border-bg-border p-4">
                <p className="font-mono text-[8px] text-tx-muted uppercase mb-1">Descripción</p>
                <p className="text-xs text-tx-secondary leading-relaxed">
                  Designa un supervisor responsable de revisar y supervisar la carpeta de un agente. El supervisor asignado recibirá visibilidad especial sobre dicha carpeta.
                </p>
              </div>

              <div>
                <label className="label">Agente a supervisar</label>
                {supTarget ? (
                  <div className="flex items-center gap-3 bg-bg-surface border border-accent-blue/40 px-3 py-2.5">
                    <div className="w-7 h-7 bg-accent-blue/20 border border-accent-blue/40 flex items-center justify-center shrink-0">
                      <span className="font-display text-[10px] font-bold text-accent-blue uppercase">{(supTarget.nombre || supTarget.username)?.[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-tx-primary font-medium">{supTarget.nombre || supTarget.username}</p>
                      <p className="font-mono text-[8px] text-tx-muted">@{supTarget.username}</p>
                    </div>
                    <button onClick={() => setSupTarget(null)} className="text-tx-muted hover:text-tx-primary"><X size={13} /></button>
                  </div>
                ) : (
                  <UserSearchDropdown placeholder="Buscar agente a supervisar..." onSelect={setSupTarget} />
                )}
              </div>

              <div>
                <label className="label">Supervisor designado</label>
                {supAgent ? (
                  <div className="flex items-center gap-3 bg-bg-surface border border-yellow-700/40 px-3 py-2.5">
                    <Shield size={14} className="text-yellow-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-tx-primary font-medium">{supAgent.nombre || supAgent.username}</p>
                      <p className="font-mono text-[8px] text-tx-muted">@{supAgent.username} · {supAgent.rol?.replace('_', ' ')}</p>
                    </div>
                    <button onClick={() => setSupAgent(null)} className="text-tx-muted hover:text-tx-primary"><X size={13} /></button>
                  </div>
                ) : (
                  <UserSearchDropdown
                    placeholder="Buscar supervisor (command o supervisory)..."
                    onSelect={setSupAgent}
                    filter={(u: any) => ['command_staff', 'supervisory'].includes(u.rol)}
                  />
                )}
              </div>

              <button
                onClick={asignarSupervisor}
                disabled={supBusy || !supTarget || !supAgent}
                className="btn-primary py-2.5 px-5 text-[10px] flex items-center gap-2 w-fit disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Shield size={12} />
                {supBusy ? 'Asignando...' : 'Asignar Supervisor'}
              </button>
            </div>
          )}

          {/* ── Transferir Propiedad ───────────────────────── */}
          {gTab === 'asignar' && (
            <div className="max-w-md flex flex-col gap-4">
              <div className="bg-bg-surface border border-bg-border p-4">
                <p className="font-mono text-[8px] text-tx-muted uppercase mb-1">Descripción</p>
                <p className="text-xs text-tx-secondary leading-relaxed">
                  Vincula o transfiere la carpeta existente de un agente fuente al agente destino. El contenido (anotaciones, documentos, hilos) se replica bajo el usuario destino.
                </p>
              </div>

              <div>
                <label className="label">Agente destino (recibirá la carpeta)</label>
                {asigTarget ? (
                  <div className="flex items-center gap-3 bg-bg-surface border border-accent-blue/40 px-3 py-2.5">
                    <div className="w-7 h-7 bg-accent-blue/20 border border-accent-blue/40 flex items-center justify-center shrink-0">
                      <span className="font-display text-[10px] font-bold text-accent-blue uppercase">{(asigTarget.nombre || asigTarget.username)?.[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-tx-primary font-medium">{asigTarget.nombre || asigTarget.username}</p>
                      <p className="font-mono text-[8px] text-tx-muted">@{asigTarget.username}</p>
                    </div>
                    <button onClick={() => setAsigTarget(null)} className="text-tx-muted hover:text-tx-primary"><X size={13} /></button>
                  </div>
                ) : (
                  <UserSearchDropdown placeholder="Buscar agente destino..." onSelect={setAsigTarget} />
                )}
              </div>

              <div>
                <label className="label">Carpeta fuente (carpeta a transferir)</label>
                {asigSource ? (
                  <div className="flex items-center gap-3 bg-bg-surface border border-bg-border px-3 py-2.5">
                    <FolderOpen size={14} className="text-tx-muted shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-tx-primary font-medium">{asigSource.nombre || asigSource.username}</p>
                      <p className="font-mono text-[8px] text-tx-muted">@{asigSource.username}</p>
                    </div>
                    <button onClick={() => setAsigSource(null)} className="text-tx-muted hover:text-tx-primary"><X size={13} /></button>
                  </div>
                ) : (
                  <UserSearchDropdown placeholder="Buscar agente fuente (quién ya tiene carpeta)..." onSelect={setAsigSource} />
                )}
              </div>

              {asigTarget && asigSource && asigTarget.username === asigSource.username && (
                <div className="flex items-center gap-2 bg-yellow-900/20 border border-yellow-700/50 px-3 py-2.5">
                  <AlertCircle size={13} className="text-yellow-400 shrink-0" />
                  <p className="font-mono text-[9px] text-yellow-300">El destino y la fuente son el mismo agente.</p>
                </div>
              )}

              <button
                onClick={asignarCarpeta}
                disabled={asigBusy || !asigTarget || !asigSource || asigTarget?.username === asigSource?.username}
                className="btn-primary py-2.5 px-5 text-[10px] flex items-center gap-2 w-fit disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowRightLeft size={12} />
                {asigBusy ? 'Transfiriendo...' : 'Transferir Carpeta'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── VISTA GENERAL TAB ──────────────────────────────────────── */}
      {tab === 'general' && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3 gap-3">
            <div>
              <p className="font-mono text-[8px] text-tx-dim">Mini chat consolidado de hilos para supervisión transversal</p>
            </div>
            <button
              onClick={() => cargarGeneral()}
              disabled={genLoading}
              className="btn-ghost py-1.5 px-3 text-[9px] flex items-center gap-1.5"
            >
              <RefreshCw size={11} className={genLoading ? 'animate-spin' : ''} />
              {genLoading ? 'Cargando...' : 'Recargar'}
            </button>
          </div>

          {/* Error state */}
          {genError && (
            <div className="bg-red-900/20 border border-red-700/50 px-4 py-3 mb-3 flex items-center gap-3">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-red-300 font-semibold">Error al cargar vista general</p>
                <p className="font-mono text-[9px] text-red-400/80 mt-0.5">{genError}</p>
              </div>
              <button onClick={() => cargarGeneral()} className="btn-ghost py-1 px-2 text-[9px] shrink-0">Reintentar</button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-3">
            {/* Sections list */}
            <div className="border border-bg-border bg-bg-surface max-h-96 overflow-y-auto">
              {genLoading && genSections.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <div className="w-4 h-4 border border-accent-blue/40 border-t-accent-blue rounded-full animate-spin mx-auto mb-2" />
                  <p className="font-mono text-[10px] text-tx-muted">Cargando secciones...</p>
                </div>
              ) : genSections.length === 0 && !genError ? (
                <p className="px-3 py-6 font-mono text-[10px] text-tx-muted text-center">Sin hilos generales detectados</p>
              ) : (
                genSections.map((section: any) => (
                  <div key={section.section} className="border-b border-bg-border last:border-0">
                    <p className="px-3 py-2 font-mono text-[8px] uppercase tracking-widest text-tx-muted bg-bg-card">
                      {sectionLabel(section.section)} · {Array.isArray(section.hilos) ? section.hilos.length : 0}
                    </p>
                    {(Array.isArray(section.hilos) ? section.hilos : []).map((hilo: any) => {
                      const selected = genActive?.id === hilo.id && genActive?.ownerUsername === hilo.ownerUsername
                      return (
                        <button
                          key={`${hilo.ownerUsername}-${hilo.id}`}
                          onClick={() => setGenActive({ ...hilo, section: sectionLabel(section.section) })}
                          className={`w-full text-left px-3 py-2 border-t border-bg-border/70 transition-colors ${selected ? 'bg-accent-blue/10 text-accent-blue' : 'hover:bg-bg-hover text-tx-secondary'}`}
                        >
                          <p className="text-xs font-medium truncate">{hilo.titulo}</p>
                          <p className="font-mono text-[8px] text-tx-muted truncate">
                            {hilo.ownerNombre || hilo.ownerUsername} · {hilo.estado}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Thread view */}
            <div className="border border-bg-border bg-bg-surface min-h-80 flex flex-col">
              {!genActive ? (
                <div className="flex-1 flex items-center justify-center px-4 text-center">
                  <p className="font-mono text-xs text-tx-muted uppercase tracking-widest">Selecciona un hilo de sección</p>
                </div>
              ) : (
                <>
                  <div className="px-4 py-3 border-b border-bg-border bg-bg-card">
                    <p className="font-display text-sm font-semibold tracking-wider uppercase text-tx-primary">{genActive.titulo}</p>
                    <p className="font-mono text-[8px] text-tx-muted mt-1">
                      Sección: {sectionLabel(genActive.section)} · Carpeta: {genActive.ownerNombre || genActive.ownerUsername}
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                    {(genActive.mensajes || []).map((mensaje: any) => (
                      <div key={mensaje.id} className={`border px-3 py-2 ${mensaje.sistema ? 'border-bg-border bg-bg-card' : 'border-accent-blue/20 bg-bg-card/70'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-mono text-[9px] uppercase tracking-widest text-accent-blue">{mensaje.nombre}</p>
                          <p className="font-mono text-[8px] text-tx-muted">{new Date(mensaje.fecha).toLocaleString('es')}</p>
                        </div>
                        <p className="text-xs text-tx-secondary mt-1 whitespace-pre-wrap">{mensaje.contenido}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-3 py-3 border-t border-bg-border bg-bg-card flex gap-2">
                    <input
                      className="input text-sm flex-1"
                      value={genReply}
                      onChange={e => setGenReply(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && responderGeneral()}
                      placeholder={genActive.estado === 'cerrado' ? 'Hilo cerrado' : 'Responder en el mini chat por sección'}
                      disabled={genSaving || genActive.estado === 'cerrado'}
                    />
                    <button
                      onClick={responderGeneral}
                      disabled={genSaving || !genReply.trim() || genActive.estado === 'cerrado'}
                      className="btn-primary py-2 px-3 text-[9px]"
                    >
                      Enviar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────
export default function CarpetaPage() {
  const [user,     setUser]     = useState<any>(null)
  const [carpeta,  setCarpeta]  = useState<any>(null)
  const [agente,   setAgente]   = useState<any>(null)
  const [loading,  setLoading]  = useState(true)
  const [toast,    setToast]    = useState<{msg:string;ok:boolean}|null>(null)
  const [tab,      setTab]      = useState<'ficha'|'anotaciones'|'documentos'|'hilos'>('ficha')
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState({ titulo:'', contenido:'', privada:false })
  const [showThreadForm, setShowThreadForm] = useState(false)
  const [threadForm, setThreadForm] = useState({ titulo:'', descripcion:'', participantes:'' })
  const [threadReply, setThreadReply] = useState('')
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [showAccessModal, setShowAccessModal] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [expanded, setExpanded] = useState<string|null>(null)
  // For command/supervisory: viewing another agent's carpeta (quick-open modal)
  const [carpetaExterna, setCarpetaExterna] = useState<any>(null)

  const isSuperv = ['command_staff','supervisory'].includes(user?.rol)
  const activeThread = carpeta?.hilos?.find((hilo: any) => hilo.id === activeThreadId) || carpeta?.hilos?.[0]

  useEffect(() => {
    const parsed = getStoredUser()
    const unsubscribe = subscribeStoredUser(setUser)
    if (parsed) {
      setUser(parsed)
      Promise.all([
        getCarpeta(),
        parsed.agentNumber ? getAgente(parsed.agentNumber) : Promise.resolve(null),
      ]).then(([c, a]) => {
        setCarpeta(c)
        if (a) setAgente(a)
      }).catch(() => {}).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
    return () => unsubscribe()
  }, [])

  async function guardarAnotacion(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await crearAnotacion(form)
      const c = await getCarpeta()
      setCarpeta(c)
      setForm({ titulo:'', contenido:'', privada:false })
      setShowForm(false)
      setToast({ msg:'Anotación guardada', ok:true })
    } catch(err:any) { setToast({ msg:err.message, ok:false }) }
    finally { setSaving(false) }
  }

  async function borrar(tipo: string, id: string) {
    if (!await uiConfirm('¿Eliminar esta entrada?', { tone: 'danger', title: 'Eliminar entrada' })) return
    try {
      await borrarCarpetaItem(tipo, id)
      const c = await getCarpeta()
      setCarpeta(c)
      setToast({ msg:'Eliminado', ok:true })
    } catch {}
  }

  async function recargarCarpeta() {
    const c = await getCarpeta()
    setCarpeta(c)
  }

  async function guardarHilo(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const participantes = threadForm.participantes
        .split(/[,\n]/)
        .map((entry) => entry.trim())
        .filter(Boolean)
      await crearHiloCarpeta({
        titulo: threadForm.titulo,
        descripcion: threadForm.descripcion,
        participantes,
      })
      await recargarCarpeta()
      setThreadForm({ titulo:'', descripcion:'', participantes:'' })
      setShowThreadForm(false)
      setToast({ msg:'Hilo privado creado', ok:true })
    } catch (err: any) {
      setToast({ msg: err.message, ok:false })
    } finally {
      setSaving(false)
    }
  }

  async function responderHilo() {
    if (!activeThread?.id || !threadReply.trim()) return
    setSaving(true)
    try {
      await enviarMensajeHiloCarpeta(activeThread.id, threadReply.trim())
      setThreadReply('')
      await recargarCarpeta()
    } catch (err: any) {
      setToast({ msg: err.message, ok:false })
    } finally {
      setSaving(false)
    }
  }

  async function cambiarEstadoHilo() {
    if (!activeThread?.id) return
    setSaving(true)
    try {
      await setEstadoHiloCarpeta(activeThread.id, activeThread.estado === 'abierto' ? 'cerrado' : 'abierto')
      await recargarCarpeta()
    } catch (err: any) {
      setToast({ msg: err.message, ok:false })
    } finally {
      setSaving(false)
    }
  }

  const ESTADO_TAG: Record<string,string> = {
    Activo:    'tag border-green-700 bg-green-900/20 text-green-400',
    Retirado:  'tag border-gray-700 text-gray-400',
    Expulsado: 'tag border-red-700 text-red-400',
    Vetado:    'tag border-gray-800 text-gray-600',
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <p className="font-mono text-xs text-tx-muted tracking-widest">Cargando carpeta...</p>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto">
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={()=>setToast(null)}/>}
      {carpetaExterna && <CarpetaExterna agente={carpetaExterna} onClose={()=>setCarpetaExterna(null)}/>}

      <div className="page-header">
        <span className="section-tag">// Carpeta Personal</span>
        <h1 className="font-display text-xl font-semibold tracking-wider uppercase text-tx-primary mt-0.5">
          {user?.nombre || user?.username}
        </h1>
        <p className="text-tx-muted text-sm">{user?.rol?.replace('_',' ')}</p>
      </div>

      {/* Staff panel: explorer, management and general view for command/supervisory */}
      {isSuperv && <StaffCarpetaPanel />}

      {/* Tabs */}
      <div className="flex border-b border-bg-border mb-5">
        {[
          { id:'ficha',       label:'Mi Ficha' },
          { id:'anotaciones', label:`Anotaciones (${carpeta?.anotaciones?.length||0})` },
          { id:'documentos',  label:`Documentos (${carpeta?.documentos?.length||0})` },
          { id:'hilos',       label:`Hilos (${carpeta?.hilos?.length||0})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`px-4 py-2.5 font-mono text-[9px] tracking-widest uppercase transition-all border-b-2 -mb-px ${tab===t.id?'border-accent-blue text-accent-blue':'border-transparent text-tx-muted hover:text-tx-secondary'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* FICHA */}
      {tab === 'ficha' && (
        <div>
          {!agente ? (
            <div className="card p-10 text-center">
              <User size={32} className="text-tx-muted opacity-20 mx-auto mb-3"/>
              <p className="font-mono text-xs text-tx-muted tracking-widest uppercase">No hay expediente vinculado a esta cuenta</p>
              <p className="font-mono text-[9px] text-tx-dim mt-2">Pide a Command Staff que vincule tu N° de agente</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="card p-5 flex items-start gap-5">
                <div className="w-14 h-14 bg-accent-blue/20 border border-accent-blue/40 flex items-center justify-center shrink-0">
                  <span className="font-display text-2xl font-bold text-accent-blue uppercase">{agente.nombre?.[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="font-display text-lg font-semibold tracking-wider uppercase text-tx-primary">{agente.nombre}</h2>
                    <span className={ESTADO_TAG[agente.estado]||'tag border-bg-border text-tx-muted'}>{agente.estado}</span>
                  </div>
                  <p className="text-tx-secondary text-sm">{agente.rango}</p>
                  <p className="font-mono text-[9px] text-tx-muted mt-0.5">{agente.seccion} · #{agente.numero}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  ['Apodo', agente.apodo||'—'],
                  ['Fecha de Ingreso', agente.fechaIngreso||'—'],
                  ['Fecha de Baja', agente.fechaBaja||'—'],
                  ['Reingresos', agente.reingresos||'0'],
                  ['Discord', agente.discordId||'—'],
                  ['N° Agente', `#${agente.numero}`],
                ].map(([k,v]) => (
                  <div key={k} className="bg-bg-surface border border-bg-border p-3">
                    <p className="font-mono text-[8px] text-tx-muted uppercase mb-0.5">{k}</p>
                    <p className="text-xs text-tx-primary font-mono truncate">{v}</p>
                  </div>
                ))}
              </div>

              {agente.especial && (
                <div className="card p-4">
                  <p className="font-mono text-[9px] text-tx-muted uppercase mb-2">Especialidades</p>
                  <div className="flex flex-wrap gap-2">
                    {agente.especial.split(',').map((e:string) => (
                      <span key={e} className="tag border-accent-blue/40 bg-accent-blue/10 text-accent-blue">{e.trim()}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="card p-4">
                <p className="font-mono text-[9px] text-tx-muted uppercase mb-3">Sanciones</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ['Leves',     agente.sLeves,     'text-yellow-400', 'border-yellow-800/40'],
                    ['Moderadas', agente.sModeradas, 'text-orange-400', 'border-orange-800/40'],
                    ['Graves',    agente.sGraves,    'text-red-400',    'border-red-800/40'],
                  ].map(([k,v,c,b]) => (
                    <div key={k} className={`bg-bg-surface border ${b} p-3 text-center`}>
                      <p className={`font-display text-2xl font-bold ${c}`}>{v||'0'}</p>
                      <p className="font-mono text-[8px] text-tx-muted uppercase mt-0.5">{k}</p>
                    </div>
                  ))}
                </div>
              </div>

              {agente.historial?.length > 0 && (
                <div className="card p-4">
                  <p className="font-mono text-[9px] text-tx-muted uppercase mb-3">Historial Reciente</p>
                  <div className="flex flex-col gap-1.5">
                    {agente.historial.slice(0,8).map((h:any, i:number) => (
                      <div key={i} className="flex items-start gap-3 py-1.5 border-b border-bg-border last:border-0">
                        <span className="font-mono text-[8px] text-tx-muted shrink-0 mt-0.5">{h.fecha}</span>
                        <div className="min-w-0">
                          <p className="font-mono text-[9px] text-accent-blue uppercase">{h.accion}</p>
                          <p className="text-xs text-tx-secondary truncate">{h.detalle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ANOTACIONES */}
      {tab === 'anotaciones' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="font-mono text-[9px] text-tx-muted tracking-widest uppercase">Notas y anotaciones personales</p>
            <button onClick={() => setShowForm(p=>!p)} className="btn-primary py-2 text-[9px]"><Plus size={11}/>Nueva</button>
          </div>

          {showForm && (
            <form onSubmit={guardarAnotacion} className="card p-4 mb-4 flex flex-col gap-3">
              <div><label className="label">Título</label><input className="input" value={form.titulo} onChange={e=>setForm(p=>({...p,titulo:e.target.value}))} placeholder="Título de la anotación" required /></div>
              <div><label className="label">Contenido</label><textarea className="input min-h-32 resize-y text-xs" value={form.contenido} onChange={e=>setForm(p=>({...p,contenido:e.target.value}))} placeholder="Escribe aquí..." required /></div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.privada} onChange={e=>setForm(p=>({...p,privada:e.target.checked}))} className="w-3 h-3"/>
                  <div className="flex items-center gap-1"><Lock size={10} className="text-tx-muted"/><span className="font-mono text-[9px] text-tx-muted uppercase">Privada</span></div>
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={()=>setShowForm(false)} className="btn-ghost py-1.5 px-3 text-[9px]">Cancelar</button>
                  <button type="submit" disabled={saving} className="btn-primary py-1.5 px-3 text-[9px]">{saving?'Guardando...':'Guardar'}</button>
                </div>
              </div>
            </form>
          )}

          {carpeta?.anotaciones?.length === 0 ? (
            <div className="card p-12 flex flex-col items-center gap-3 text-tx-muted">
              <StickyNote size={28} className="opacity-20"/>
              <p className="font-mono text-xs tracking-widest uppercase">Sin anotaciones</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {carpeta.anotaciones.slice().reverse().map((a:any) => (
                <div key={a.id} className="card overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-bg-hover transition-colors"
                    onClick={() => setExpanded(expanded===a.id?null:a.id)}>
                    <StickyNote size={13} className="text-tx-muted shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-tx-primary truncate">{a.titulo}</p>
                      <p className="font-mono text-[8px] text-tx-muted">{new Date(a.fecha).toLocaleDateString('es',{day:'2-digit',month:'short',year:'numeric'})}</p>
                    </div>
                    {a.privada && <Lock size={10} className="text-tx-muted shrink-0"/>}
                    <button onClick={e=>{e.stopPropagation();borrar('anotacion',a.id)}} className="text-tx-muted hover:text-red-400 transition-colors shrink-0 p-1"><Trash2 size={12}/></button>
                    {expanded===a.id ? <ChevronUp size={13} className="text-tx-muted shrink-0"/> : <ChevronDown size={13} className="text-tx-muted shrink-0"/>}
                  </div>
                  {expanded===a.id && (
                    <div className="px-4 pb-4 border-t border-bg-border">
                      <p className="text-sm text-tx-secondary leading-relaxed whitespace-pre-wrap pt-3">{a.contenido}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DOCUMENTOS */}
      {tab === 'documentos' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="font-mono text-[9px] text-tx-muted tracking-widest uppercase">Documentos y archivos personales</p>
          </div>
          {carpeta?.documentos?.length === 0 ? (
            <div className="card p-12 flex flex-col items-center gap-3 text-tx-muted">
              <FileText size={28} className="opacity-20"/>
              <p className="font-mono text-xs tracking-widest uppercase">Sin documentos</p>
              <p className="font-mono text-[9px] text-tx-dim">Los documentos subidos aparecerán aquí</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {carpeta.documentos.map((d:any) => (
                <div key={d.id} className="card px-4 py-3 flex items-center gap-3">
                  <FileText size={14} className="text-accent-blue shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-tx-primary font-medium truncate">{d.nombre}</p>
                    {d.descripcion && <p className="text-xs text-tx-secondary truncate">{d.descripcion}</p>}
                    <p className="font-mono text-[8px] text-tx-muted">{new Date(d.fecha).toLocaleDateString('es')}</p>
                  </div>
                  <button onClick={()=>borrar('documento',d.id)} className="text-tx-muted hover:text-red-400 transition-colors p-1"><Trash2 size={12}/></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'hilos' && (
        <div>
          <div className="flex items-center justify-between mb-4 gap-3">
            <div>
              <p className="font-mono text-[9px] text-tx-muted tracking-widest uppercase">Hilos privados estilo ticket</p>
              <p className="font-mono text-[8px] text-tx-dim mt-1">Solo entran los usernames agregados al hilo</p>
            </div>
            <button onClick={() => setShowThreadForm((prev) => !prev)} className="btn-primary py-2 text-[9px]"><Plus size={11}/>Nuevo hilo</button>
          </div>

          {showThreadForm && (
            <form onSubmit={guardarHilo} className="card p-4 mb-4 flex flex-col gap-3">
              <div>
                <label className="label">Título</label>
                <input className="input" value={threadForm.titulo} onChange={(e) => setThreadForm((prev) => ({ ...prev, titulo: e.target.value }))} placeholder="Incidente, seguimiento, coordinación..." required />
              </div>
              <div>
                <label className="label">Descripción inicial</label>
                <textarea className="input min-h-24 resize-y text-xs" value={threadForm.descripcion} onChange={(e) => setThreadForm((prev) => ({ ...prev, descripcion: e.target.value }))} placeholder="Contexto del hilo" />
              </div>
              <div>
                <label className="label">Participantes</label>
                <input className="input" value={threadForm.participantes} onChange={(e) => setThreadForm((prev) => ({ ...prev, participantes: e.target.value }))} placeholder="user1, user2, user3" required />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowThreadForm(false)} className="btn-ghost py-1.5 px-3 text-[9px]">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary py-1.5 px-3 text-[9px]">{saving ? 'Guardando...' : 'Crear hilo'}</button>
              </div>
            </form>
          )}

          {!carpeta?.hilos?.length ? (
            <div className="card p-12 flex flex-col items-center gap-3 text-tx-muted">
              <MessageSquare size={28} className="opacity-20"/>
              <p className="font-mono text-xs tracking-widest uppercase">Sin hilos privados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4">
              <div className="card p-0 overflow-hidden">
                {(carpeta.hilos || []).slice().reverse().map((hilo: any) => (
                  <button
                    key={hilo.id}
                    onClick={() => setActiveThreadId(hilo.id)}
                    className={`w-full text-left px-4 py-3 border-b border-bg-border last:border-0 transition-colors ${activeThread?.id === hilo.id ? 'bg-accent-blue/10' : 'hover:bg-bg-hover'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-tx-primary truncate">{hilo.titulo}</p>
                      <span className={`font-mono text-[8px] uppercase ${hilo.estado === 'abierto' ? 'text-green-400' : 'text-red-400'}`}>{hilo.estado}</span>
                    </div>
                    <p className="font-mono text-[8px] text-tx-muted mt-1 truncate">{formatThreadParticipants(hilo.participantes)}</p>
                  </button>
                ))}
              </div>

              <div className="card p-0 overflow-hidden min-h-[26rem] flex flex-col">
                {!activeThread ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="font-mono text-xs text-tx-muted uppercase tracking-widest">Selecciona un hilo</p>
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-3 border-b border-bg-border bg-bg-surface">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-display text-sm font-semibold tracking-wider uppercase text-tx-primary">{activeThread.titulo}</p>
                          <p className="font-mono text-[8px] text-tx-muted mt-1">Participantes: {formatThreadParticipants(activeThread.participantes)}</p>
                          {activeThread.descripcion && <p className="text-xs text-tx-secondary mt-2">{activeThread.descripcion}</p>}
                        </div>
                        <button onClick={cambiarEstadoHilo} className="btn-ghost py-1 px-2 text-[9px]">{activeThread.estado === 'abierto' ? 'Cerrar' : 'Reabrir'}</button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-bg-card">
                      {(activeThread.mensajes || []).map((mensaje: any) => (
                        <div key={mensaje.id} className={`border px-3 py-2 ${mensaje.sistema ? 'border-bg-border bg-bg-surface' : 'border-accent-blue/20 bg-bg-surface/70'}`}>
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-mono text-[9px] uppercase tracking-widest text-accent-blue">{mensaje.nombre}</p>
                            <p className="font-mono text-[8px] text-tx-muted">{new Date(mensaje.fecha).toLocaleString('es')}</p>
                          </div>
                          <p className="text-sm text-tx-secondary mt-1 whitespace-pre-wrap">{mensaje.contenido}</p>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-3 border-t border-bg-border bg-bg-surface flex gap-2">
                      <input
                        className="input text-sm flex-1"
                        value={threadReply}
                        onChange={(e) => setThreadReply(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && responderHilo()}
                        placeholder={activeThread.estado === 'cerrado' ? 'Hilo cerrado' : 'Responder en este hilo privado'}
                        disabled={saving || activeThread.estado === 'cerrado'}
                      />
                      <button onClick={responderHilo} disabled={saving || !threadReply.trim() || activeThread.estado === 'cerrado'} className="btn-primary py-2 text-[9px] px-3">Enviar</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {showAccessModal && carpeta && agente && (
        <ModalGestionarAccesoCarpeta 
          ownerUsername={agente.username || agente.nombre}
          acceso={carpeta.acceso || []}
          onClose={() => setShowAccessModal(false)} 
          onUpdate={m => { 
            recargarCarpeta(); 
            setShowAccessModal(false) 
          }} 
          onError={console.error}
        />
      )}
    </div>
  )
}
