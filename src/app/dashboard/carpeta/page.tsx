'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
<<<<<<< HEAD
import { 
  Plus, Trash2, FileText, StickyNote, Lock, X, CheckCircle, AlertCircle, 
  ChevronDown, ChevronUp, Search, User, MessageSquare, Users, FolderOpen, 
  FolderPlus, Shield, ArrowRightLeft, RefreshCw, Settings, Send, Award, Activity
} from 'lucide-react'
import { 
  getCarpeta, getStoredUser, crearAnotacion, borrarCarpetaItem, getAgente, 
  crearHiloCarpeta, enviarMensajeHiloCarpeta, setEstadoHiloCarpeta, 
  subscribeStoredUser, addAgentToCarpeta, removeAgentFromCarpeta, 
  getPersonal, getCarpetasAdmin, setCarpetaSupervisor, crearCarpetaAdmin, 
  asignarCarpetaAdmin 
} from '@/lib/client'
import { uiConfirm } from '@/lib/ui-dialog'
import './carpeta.css'

// ── Helpers ────────────────────────────────────────────────────────────
=======
import { Plus, Trash2, FileText, StickyNote, Lock, X, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Search, User, MessageSquare, Users, FolderOpen, FolderPlus, Shield, ArrowRightLeft, RefreshCw, Settings } from 'lucide-react'
import { getCarpeta, getStoredUser, crearAnotacion, borrarCarpetaItem, getAgente, crearHiloCarpeta, enviarMensajeHiloCarpeta, setEstadoHiloCarpeta, subscribeStoredUser, addAgentToCarpeta, removeAgentFromCarpeta, getPersonal, getCarpetasAdmin, setCarpetaSupervisor, crearCarpetaAdmin, asignarCarpetaAdmin } from '@/lib/client'
import { uiConfirm } from '@/lib/ui-dialog'
>>>>>>> 0b7dbbb7becb6da8c167ff2bbb4ed7f1d2b0b74f

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

<<<<<<< HEAD
=======
  // Close on outside click
>>>>>>> 0b7dbbb7becb6da8c167ff2bbb4ed7f1d2b0b74f
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
<<<<<<< HEAD
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center gap-2 bg-[#0E1217] border border-[#1B2229] focus-within:border-[#1B6FFF] transition-colors px-3">
        <Search size={12} className="text-[#8A96A3] shrink-0" />
        <input
          className="flex-1 bg-transparent py-2 text-sm text-[#E6ECF2] placeholder-[#8A96A3] focus:outline-none"
=======
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 bg-bg-surface border border-bg-border focus-within:border-accent-blue transition-colors">
        <Search size={12} className="ml-3 text-tx-muted shrink-0" />
        <input
          className="flex-1 bg-transparent px-2 py-2 text-sm text-tx-primary placeholder-tx-muted focus:outline-none"
>>>>>>> 0b7dbbb7becb6da8c167ff2bbb4ed7f1d2b0b74f
          placeholder={placeholder}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
<<<<<<< HEAD
        {loading && <div className="w-3 h-3 border border-[#1B6FFF]/40 border-t-[#1B6FFF] rounded-full animate-spin shrink-0" />}
      </div>
      {open && (query.trim() || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 z-50 bg-[#0A0D10] border border-[#1B2229] shadow-xl mt-1 max-h-52 overflow-y-auto">
          {results.length === 0 && query.trim() && !loading && (
            <p className="px-3 py-2.5 font-mono text-[10px] text-[#8A96A3]">Sin resultados</p>
=======
        {loading && <div className="mr-3 w-3 h-3 border border-accent-blue/40 border-t-accent-blue rounded-full animate-spin shrink-0" />}
      </div>
      {open && (query.trim() || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 z-50 bg-bg-card border border-bg-border shadow-xl mt-0.5 max-h-52 overflow-y-auto">
          {results.length === 0 && query.trim() && !loading && (
            <p className="px-3 py-2.5 font-mono text-[10px] text-tx-muted">Sin resultados para "{query}"</p>
>>>>>>> 0b7dbbb7becb6da8c167ff2bbb4ed7f1d2b0b74f
          )}
          {results.map((a: any) => (
            <button
              key={a.id || a.numero}
              onClick={() => { onSelect(a); setQuery(''); setResults([]); setOpen(false) }}
<<<<<<< HEAD
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#14191F] transition-colors text-left border-b border-[#1B2229]/50 last:border-0"
            >
              <div className="w-8 h-8 bg-[#1B6FFF]/10 border border-[#1B6FFF]/30 flex items-center justify-center shrink-0 rounded-sm">
                <span className="font-bold text-[#1B6FFF] text-xs uppercase">{a.nombre?.[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#E6ECF2] font-semibold truncate">{a.nombre}</p>
                <p className="font-mono text-[9px] text-[#8A96A3]">{a.rango} · #{a.numero}</p>
              </div>
=======
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
>>>>>>> 0b7dbbb7becb6da8c167ff2bbb4ed7f1d2b0b74f
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

<<<<<<< HEAD
// ── Main Page Component ───────────────────────────────────────────────

export default function CarpetaPage() {
  const [user, setUser] = useState<any>(null)
  const [ownCarpeta, setOwnCarpeta] = useState<any>(null)
  const [ownAgente, setOwnAgente] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{msg:string, ok:boolean} | null>(null)
  
  // UI State
  const [activeTab, setActiveTab] = useState<'carpeta' | 'supervisory' | 'admin'>('carpeta')
  const [activeSubTab, setActiveSubTab] = useState<'hilos' | 'registros' | 'condecoraciones' | 'chat'>('hilos')
  const [activeSvSub, setActiveSvSub] = useState<'agentes' | 'reportes' | 'sanciones' | 'condecorar'>('agentes')
  const [activeAdSub, setActiveAdSub] = useState<'personal' | 'ascensos' | 'sheet' | 'log'>('personal')
  
  // Staff State
  const [staffAgents, setStaffAgents] = useState<any[]>([])
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<any>(null)
  const [selectedCarpeta, setSelectedCarpeta] = useState<any>(null)
  const [selectedLoading, setSelectedLoading] = useState(false)
  
  // Action States
  const [threadReply, setThreadReply] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedHilo, setExpandedHilo] = useState<string | null>(null)
  const [logs, setLogs] = useState<{ts: string, msg: string}[]>([])

  const isStaff = ['command_staff', 'supervisory'].includes(user?.rol)
  const isAdmin = user?.rol === 'command_staff'

  // Load Initial Data
=======
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

>>>>>>> 0b7dbbb7becb6da8c167ff2bbb4ed7f1d2b0b74f
  useEffect(() => {
    const parsed = getStoredUser()
    const unsubscribe = subscribeStoredUser(setUser)
    if (parsed) {
      setUser(parsed)
<<<<<<< HEAD
      loadOwnData(parsed)
      if (['command_staff', 'supervisory'].includes(parsed.rol)) {
        loadStaffAgents()
      }
      addLog(`Sesión iniciada como ${parsed.nombre || parsed.username}`)

      // Sincronización automática al entrar
      const lastSync = localStorage.getItem('fib_last_auto_sync')
      const now = Date.now()
      if (!lastSync || now - Number(lastSync) > 10 * 60 * 1000) { // Cada 10 min
        syncSheet().then(() => {
          localStorage.setItem('fib_last_auto_sync', String(now))
        })
      }
=======
      Promise.all([
        getCarpeta(),
        parsed.agentNumber ? getAgente(parsed.agentNumber) : Promise.resolve(null),
      ]).then(([c, a]) => {
        setCarpeta(c)
        if (a) setAgente(a)
      }).catch(() => {}).finally(() => setLoading(false))
>>>>>>> 0b7dbbb7becb6da8c167ff2bbb4ed7f1d2b0b74f
    } else {
      setLoading(false)
    }
    return () => unsubscribe()
  }, [])

<<<<<<< HEAD
  function addLog(msg: string) {
    const now = new Date()
    const ts = `${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
    setLogs(prev => [{ts, msg}, ...prev].slice(0, 50))
  }

  async function loadOwnData(u: any) {
    try {
      const [c, a] = await Promise.all([
        getCarpeta(),
        u.agentNumber ? getAgente(u.agentNumber) : Promise.resolve(null)
      ])
      setOwnCarpeta(c)
      setOwnAgente(a)
    } catch (e) {
      console.error('Error loading own data', e)
    } finally {
      setLoading(false)
    }
  }

  async function loadStaffAgents() {
    try {
      const data = await getCarpetasAdmin()
      setStaffAgents(data.carpetas || [])
    } catch (e) {
      console.error('Error loading staff agents', e)
    }
  }

  const loadAgentCarpeta = useCallback(async (agent: any) => {
    if (!agent) {
      setSelectedAgent(null)
      setSelectedCarpeta(null)
      return
    }
    setSelectedLoading(true)
    setSelectedAgent(agent)
    try {
      const token = localStorage.getItem('fib_token') || ''
      const params = new URLSearchParams()
      if (agent.username) params.set('username', agent.username)
      if (agent.agentNumber) params.set('agentNumber', String(agent.agentNumber))
      const res = await fetch(`/api/carpeta?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setSelectedCarpeta(data)
      addLog(`Acceso a carpeta de ${agent.nombre || agent.username}`)
    } catch (e) {
      console.error('Error loading agent carpeta', e)
    } finally {
      setSelectedLoading(false)
    }
  }, [])

  // Actions
  async function syncSheet() {
    setToast({ msg: 'Sincronizando con Spreadsheet...', ok: true })
    try {
      const token = localStorage.getItem('fib_token') || ''
      const res = await fetch('/api/users/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error en la sincronización')
      
      setToast({ msg: data.mensaje || 'Sincronización completada', ok: true })
      addLog(data.mensaje)
      
      // Recargar datos locales
      await loadStaffAgents()
      await loadOwnData(user)
      if (selectedAgent) {
        await loadAgentCarpeta(selectedAgent)
      }
    } catch (e: any) {
      setToast({ msg: e.message, ok: false })
      addLog(`Error sync: ${e.message}`)
    }
  }

  async function responderHilo(hiloId: string, ownerUsername?: string) {
    if (!threadReply.trim()) return
    setSaving(true)
    try {
      await enviarMensajeHiloCarpeta(hiloId, threadReply.trim(), ownerUsername)
      addLog(`Respuesta enviada en hilo #${hiloId}`)
      setThreadReply('')
      if (ownerUsername) {
        await loadAgentCarpeta(selectedAgent)
      } else {
        const c = await getCarpeta()
        setOwnCarpeta(c)
      }
    } catch (e: any) {
      setToast({ msg: e.message, ok: false })
    } finally {
      setSaving(false)
    }
  }

  async function crearNuevoHilo() {
    const titulo = prompt('Título del nuevo hilo:')
    if (!titulo) return
    const participantesStr = prompt('Participantes (separados por coma, ej: user1, user2):') || ''
    const participantes = participantesStr.split(',').map(s => s.trim()).filter(Boolean)
    
    setSaving(true)
    try {
      await crearHiloCarpeta({ titulo, descripcion: '', participantes })
      addLog(`Nuevo hilo creado: ${titulo}`)
      const c = await getCarpeta()
      setOwnCarpeta(c)
      setToast({ msg: 'Hilo creado correctamente', ok: true })
    } catch (e: any) {
      setToast({ msg: e.message, ok: false })
=======
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
>>>>>>> 0b7dbbb7becb6da8c167ff2bbb4ed7f1d2b0b74f
    } finally {
      setSaving(false)
    }
  }

<<<<<<< HEAD
  // Derived Data
  const currentAgente = selectedAgent ? {
    nombre: selectedAgent.nombre,
    rango: selectedAgent.rango,
    seccion: selectedAgent.seccion,
    numero: selectedAgent.agentNumber,
    estado: selectedAgent.activo ? 'Activo' : 'Inactivo',
    sLeves: selectedAgent.totalAnotaciones || 0,
    sModeradas: selectedAgent.totalDocumentos || 0,
    sGraves: selectedAgent.totalHilos || 0,
    avatarUrl: selectedAgent.avatarUrl
  } : (ownAgente ? {
    nombre: ownAgente.nombre,
    rango: ownAgente.rango,
    seccion: ownAgente.seccion,
    numero: ownAgente.numero,
    estado: ownAgente.estado,
    sLeves: ownAgente.sLeves || 0,
    sModeradas: ownAgente.sModeradas || 0,
    sGraves: ownAgente.sGraves || 0,
    avatarUrl: user?.avatarUrl
  } : null)

  const currentCarpeta = selectedAgent ? selectedCarpeta : ownCarpeta

  const filteredAgents = staffAgents.filter(a => 
    !sidebarSearch || 
    a.nombre?.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
    a.username?.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
    String(a.agentNumber).includes(sidebarSearch)
  )

  if (loading) return <div className="fib-panel-container flex items-center justify-center"><p className="fib-topbar-label">CARGANDO SISTEMA TÁCTICO...</p></div>

  return (
    <div className="fib-panel-container">
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}

      {/* TOPBAR */}
      <div className="fib-topbar">
        <span className="fib-logo">FIB</span>
        <span className="fib-topbar-sep">|</span>
        <span className="fib-topbar-label">INTEGRAL TACTICAL COMMAND</span>
        <span className={`fib-badge-rank ${user?.rol === 'command_staff' ? 'fib-badge-cs' : user?.rol === 'supervisory' ? 'fib-badge-sv' : 'fib-badge-fa'}`}>
          {user?.rol?.replace('_', ' ').toUpperCase()}
        </span>
        <span className="fib-topbar-sep" style={{ marginLeft: '8px' }}>|</span>
        <span className="fib-status-online">● ONLINE</span>
        <span className="fib-topbar-agent">
          {user?.nombre || user?.username} {user?.callsign ? `· ${user.callsign}` : ''} {user?.agentNumber ? `· #${user.agentNumber}` : ''}
        </span>
        <button className="fib-sync-btn" onClick={syncSheet}>↻ SYNC SHEET</button>
        <span className="fib-sync-status">
          <span className="fib-sync-indicator"><span className="fib-sync-dot"></span><span>SINCRONIZADO</span></span>
        </span>
      </div>

      {/* NAV */}
      <div className="fib-nav">
        <div className={`fib-nav-tab ${activeTab === 'carpeta' ? 'active' : ''}`} onClick={() => setActiveTab('carpeta')}>
          {isStaff && selectedAgent ? `CARPETA: ${selectedAgent.nombre}` : 'CARPETA PROPIA'}
        </div>
        {isStaff && (
          <div className={`fib-nav-tab ${activeTab === 'supervisory' ? 'active' : ''}`} onClick={() => setActiveTab('supervisory')}>
            SUPERVISORY AREA
          </div>
        )}
        {isAdmin && (
          <div className={`fib-nav-tab ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
            ADMINISTRACIÓN
          </div>
        )}
      </div>

      <div className="fib-main">
        {/* ═══════════════════ CARPETA ═══════════════════ */}
        {activeTab === 'carpeta' && (
          <div id="tab-carpeta">
            <div className="fib-section-label">// expediente del agente</div>

            {/* AGENT HEADER */}
            <div className="fib-agent-header">
              <div className="fib-agent-av" style={{ backgroundImage: currentAgente?.avatarUrl ? `url(${currentAgente.avatarUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                {!currentAgente?.avatarUrl && (currentAgente?.nombre?.[0] || '?')}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="fib-agent-main-name">{currentAgente?.nombre || 'Agente sin expediente'}</div>
                  {!selectedAgent && (
                    <button 
                      onClick={() => setShowAvatarEdit(!showAvatarEdit)}
                      className="fib-action-btn"
                      style={{ fontSize: '9px', padding: '2px 6px' }}
                    >
                      {showAvatarEdit ? 'CERRAR' : 'CAMBIAR AVATAR'}
                    </button>
                  )}
                </div>
                <div className="fib-agent-callsign">{currentAgente?.rango || 'Sin rango'} &nbsp;·&nbsp; #{currentAgente?.numero || '0000'}</div>
                
                {showAvatarEdit && !selectedAgent && (
                  <div className="fib-mt-12" style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      className="fib-entry-input" 
                      placeholder="URL de imagen (ej: imgur.com/...)"
                      value={newAvatarUrl}
                      onChange={e => setNewAvatarUrl(e.target.value)}
                      style={{ maxWidth: '300px' }}
                    />
                    <button 
                      className="fib-add-btn" 
                      onClick={updateAvatar}
                      disabled={saving}
                    >
                      {saving ? '...' : 'GUARDAR'}
                    </button>
                  </div>
                )}

                <div className="fib-agent-meta-row">
                  <div className="fib-meta-item"><span className="fib-meta-label">Rango</span><span className="fib-meta-value highlight">{currentAgente?.rango || '—'}</span></div>
                  <div className="fib-meta-item"><span className="fib-meta-label">Ramas</span><span className="fib-meta-value">{currentAgente?.seccion || '—'}</span></div>
                  <div className="fib-meta-item"><span className="fib-meta-label">Estado</span><span className="fib-meta-value" style={{ color: currentAgente?.estado === 'Activo' ? 'var(--fib-green)' : 'var(--fib-red2)' }}>{currentAgente?.estado || '—'}</span></div>
                </div>
              </div>
              <div className="fib-agent-stats">
                <div className="fib-stat-box"><div className="fib-stat-num">{currentAgente?.sLeves || 0}</div><div className="fib-stat-lbl">Leves</div></div>
                <div className="fib-stat-box"><div className="fib-stat-num">{currentAgente?.sModeradas || 0}</div><div className="fib-stat-lbl">Mod.</div></div>
                <div className="fib-stat-box"><div className="fib-stat-num">{currentAgente?.sGraves || 0}</div><div className="fib-stat-lbl">Graves</div></div>
              </div>
            </div>

            {/* GRID */}
            <div className="fib-carpeta-grid" style={{ gridTemplateColumns: isStaff ? '240px 1fr' : '1fr' }}>
              {/* LEFT: agent list (Staff only) */}
              {isStaff && (
                <div className="fib-left-panel">
                  <div className="fib-section-label" style={{ marginBottom: '6px' }}>personal</div>
                  <input 
                    className="fib-search-input" 
                    placeholder="Buscar agente..." 
                    value={sidebarSearch}
                    onChange={e => setSidebarSearch(e.target.value)}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '600px', overflowY: 'auto' }}>
                    <div 
                      className={`fib-agent-list-item ${!selectedAgent ? 'active' : ''}`}
                      onClick={() => loadAgentCarpeta(null)}
                    >
                      <div className="fib-av-sm">{user?.nombre?.[0] || 'U'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="fib-ali-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Mi Carpeta</div>
                        <div className="fib-ali-role">Propios datos</div>
                      </div>
                    </div>
                    {filteredAgents.map(a => (
                      <div 
                        key={a.username} 
                        className={`fib-agent-list-item ${selectedAgent?.username === a.username ? 'active' : ''}`}
                        onClick={() => loadAgentCarpeta(a)}
                      >
                        <div className="fib-av-sm">{a.nombre?.[0]}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="fib-ali-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nombre}</div>
                          <div className="fib-ali-role">{a.rango} · #{a.agentNumber}</div>
                        </div>
                        <div className={`fib-dot ${a.activo ? 'fib-dot-on' : 'fib-dot-off'}`} style={{ marginLeft: 'auto' }}></div>
                      </div>
=======
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
>>>>>>> 0b7dbbb7becb6da8c167ff2bbb4ed7f1d2b0b74f
                    ))}
                  </div>
                </div>
              )}

<<<<<<< HEAD
              {/* RIGHT: content */}
              <div>
                <div className="fib-subtabs" id="carpeta-subtabs">
                  <div className={`fib-subtab ${activeSubTab === 'hilos' ? 'active' : ''}`} onClick={() => setActiveSubTab('hilos')}>HILOS</div>
                  <div className={`fib-subtab ${activeSubTab === 'registros' ? 'active' : ''}`} onClick={() => setActiveSubTab('registros')}>REGISTROS</div>
                  <div className={`fib-subtab ${activeSubTab === 'condecoraciones' ? 'active' : ''}`} onClick={() => setActiveSubTab('condecoraciones')}>CONDECORACIONES</div>
                  <div className={`fib-subtab ${activeSubTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveSubTab('chat')}>MENSAJES</div>
                </div>

                {selectedLoading ? (
                  <div className="flex items-center justify-center p-20"><p className="fib-topbar-label">ACCEDIENDO A ARCHIVOS...</p></div>
                ) : (
                  <>
                    {/* HILOS */}
                    {activeSubTab === 'hilos' && (
                      <div id="sub-hilos">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <div className="fib-section-label" style={{ margin: 0 }}>actividad del agente</div>
                          {!selectedAgent && <button className="fib-add-btn" onClick={crearNuevoHilo}>+ NUEVO HILO</button>}
                        </div>
                        <div id="hilos-container">
                          {currentCarpeta?.hilos?.length === 0 ? (
                            <div className="fib-panel-card p-10 text-center opacity-30">
                              <MessageSquare size={32} className="mx-auto mb-2" />
                              <p>Sin hilos de actividad registrados</p>
                            </div>
                          ) : (
                            currentCarpeta?.hilos?.slice().reverse().map((hilo: any) => (
                              <div key={hilo.id}>
                                {expandedHilo === hilo.id ? (
                                  <div className="fib-hilo-expanded">
                                    <div className="fib-hilo-exp-header" onClick={() => setExpandedHilo(null)}>
                                      <div className="fib-hilo-exp-title">
                                        <span className={`fib-hilo-type fib-ht-caso`}>HILO</span> &nbsp;{hilo.titulo}
                                      </div>
                                      <button className="fib-close-x">✕</button>
                                    </div>
                                    <div className="fib-hilo-entries-list">
                                      {(hilo.mensajes || []).map((m: any) => (
                                        <div key={m.id} className="fib-entry-item">
                                          <div className="fib-entry-date">{new Date(m.fecha).toLocaleString('es')} · {m.nombre}</div>
                                          <div className="fib-entry-text">{m.contenido}</div>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="fib-add-entry-row">
                                      <input 
                                        className="fib-entry-input" 
                                        placeholder="Escribe una respuesta o actualización..."
                                        value={threadReply}
                                        onChange={e => setThreadReply(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && responderHilo(hilo.id, selectedAgent?.username)}
                                      />
                                      <button 
                                        className="fib-add-btn" 
                                        onClick={() => responderHilo(hilo.id, selectedAgent?.username)}
                                        disabled={saving || !threadReply.trim()}
                                      >
                                        {saving ? '...' : 'AÑADIR'}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="fib-hilo-item" onClick={() => setExpandedHilo(hilo.id)}>
                                    <div className="fib-hilo-top">
                                      <div className="fib-hilo-title">
                                        {hilo.estado === 'abierto' && <span className="fib-unread-dot"></span>}
                                        <span className={`fib-hilo-type fib-ht-caso`}>HILO</span>
                                        {hilo.titulo}
                                      </div>
                                      <div className="fib-hilo-meta">{new Date(hilo.fecha || Date.now()).toLocaleDateString('es')}</div>
                                    </div>
                                    <div className="fib-hilo-preview">
                                      {hilo.mensajes?.[hilo.mensajes.length - 1]?.contenido || 'Sin mensajes registrados aún.'}
                                    </div>
                                    <div className="fib-hilo-entries">{hilo.mensajes?.length || 0} entradas registradas</div>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* REGISTROS */}
                    {activeSubTab === 'registros' && (
                      <div id="sub-registros">
                        <div className="fib-section-label">anotaciones y documentos operativos</div>
                        <div style={{ overflowX: 'auto' }}>
                          <table className="fib-records-table">
                            <thead>
                              <tr>
                                <th>Tipo</th><th>Título</th><th>Fecha</th><th>Información</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentCarpeta?.anotaciones?.length === 0 && currentCarpeta?.documentos?.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-10 opacity-30">No hay registros asociados</td></tr>
                              ) : (
                                <>
                                  {currentCarpeta?.anotaciones?.map((a: any) => (
                                    <tr key={a.id}>
                                      <td><span className="fib-record-badge fib-rb-informe">Anotación</span></td>
                                      <td>{a.titulo}</td>
                                      <td>{new Date(a.fecha).toLocaleDateString('es')}</td>
                                      <td className="opacity-60">{a.privada ? '🔒 Privada' : '🌐 Pública'}</td>
                                    </tr>
                                  ))}
                                  {currentCarpeta?.documentos?.map((d: any) => (
                                    <tr key={d.id}>
                                      <td><span className="fib-record-badge fib-rb-caso">Documento</span></td>
                                      <td>{d.nombre}</td>
                                      <td>{new Date(d.fecha).toLocaleDateString('es')}</td>
                                      <td className="opacity-60">Referencia externa</td>
                                    </tr>
                                  ))}
                                </>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* CONDECORACIONES */}
                    {activeSubTab === 'condecoraciones' && (
                      <div id="sub-condecoraciones">
                        <div className="fib-section-label">condecoraciones y méritos</div>
                        <div className="fib-panel-card p-10 text-center opacity-30">
                          <Award size={32} className="mx-auto mb-2" />
                          <p>No se han registrado condecoraciones oficiales en este expediente</p>
                        </div>
                      </div>
                    )}

                    {/* CHAT */}
                    {activeSubTab === 'chat' && (
                      <div id="sub-chat">
                        <div className="fib-section-label">mensajes internos del sistema</div>
                        <div className="fib-chat-layout">
                          <div className="fib-chat-list">
                            <div className="fib-chat-list-item active">
                              <div className="fib-av-sm">HQ</div>
                              <div><div className="fib-cli-name">Comunicaciones HQ</div><div className="fib-cli-preview">Sistema automático</div></div>
                            </div>
                          </div>
                          <div className="fib-chat-area">
                            <div className="fib-chat-header">
                              <div className="fib-av-sm">HQ</div>
                              <div><div className="fib-chat-header-name">Comunicaciones HQ</div><div className="fib-chat-header-role">CENTRAL</div></div>
                            </div>
                            <div className="fib-chat-msgs">
                              <div className="fib-msg them">Bienvenido al sistema de mensajería táctica. Utiliza los hilos para comunicaciones específicas.<div className="fib-msg-time">Sistema</div></div>
                            </div>
                            <div className="fib-chat-input-row">
                              <input className="fib-chat-inp" placeholder="Canal de solo lectura..." disabled />
                              <button className="fib-send-btn" disabled>→</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
=======
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
>>>>>>> 0b7dbbb7becb6da8c167ff2bbb4ed7f1d2b0b74f
                  </>
                )}
              </div>
            </div>
<<<<<<< HEAD
          </div>
        )}

        {/* ═══════════════════ SUPERVISORY ═══════════════════ */}
        {activeTab === 'supervisory' && isStaff && (
          <div id="tab-supervisory">
            <div className="fib-section-label">// supervisory area — acceso restringido</div>
            <div className="fib-subtabs" id="sv-subtabs">
              <div className={`fib-subtab ${activeSvSub === 'agentes' ? 'active' : ''}`} onClick={() => setActiveSvSub('agentes')}>AGENTES</div>
              <div className={`fib-subtab ${activeSvSub === 'reportes' ? 'active' : ''}`} onClick={() => setActiveSvSub('reportes')}>REPORTES</div>
              <div className={`fib-subtab ${activeSvSub === 'sanciones' ? 'active' : ''}`} onClick={() => setActiveSvSub('sanciones')}>SANCIONES</div>
            </div>

            {activeSvSub === 'agentes' && (
              <div className="fib-panel-card">
                <div className="fib-panel-card-header">agentes bajo supervisión</div>
                <div className="fib-panel-card-body">
                  {staffAgents.length === 0 ? (
                    <p className="opacity-30 py-4">No hay agentes registrados en la base de datos</p>
                  ) : (
                    staffAgents.map(a => (
                      <div key={a.username} className="fib-agent-row">
                        <div className="fib-av-sm">{a.nombre?.[0]}</div>
                        <div className="fib-ainfo">
                          <div className="fib-aname">{a.nombre}</div>
                          <div className="fib-arole">{a.rango} · #{a.agentNumber}</div>
                        </div>
                        <div className={`fib-dot ${a.activo ? 'fib-dot-on' : 'fib-dot-off'}`}></div>
                        <button className="fib-action-btn" onClick={() => { loadAgentCarpeta(a); setActiveTab('carpeta'); }}>VER CARPETA</button>
                        <button className="fib-action-btn">SANCIONAR</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            
            {activeSvSub === 'reportes' && (
              <div className="fib-panel-card">
                <div className="fib-panel-card-header">reportes operativos pendientes</div>
                <div className="fib-panel-card-body">
                  <div className="fib-agent-row">
                    <div className="fib-ainfo"><div className="fib-aname">Reporte Semanal — Pendiente</div><div className="fib-arole">Sección: Agentes Federales · Fecha: {new Date().toLocaleDateString()}</div></div>
                    <button className="fib-action-btn">REVISAR</button>
                  </div>
                </div>
              </div>
            )}

            {activeSvSub === 'sanciones' && (
              <div className="fib-panel-card">
                <div className="fib-panel-card-header">emitir sanción disciplinaria</div>
                <div className="fib-panel-card-body">
                  <div className="fib-form-grid">
                    <div>
                      <label className="fib-form-label">Agente Destinatario</label>
                      <PersonalSearchDropdown onSelect={(a) => addLog(`Seleccionado agente ${a.nombre} para sanción`)} />
                    </div>
                    <div>
                      <label className="fib-form-label">Gravedad de la Falta</label>
                      <select className="fib-form-ctrl">
                        <option>Advertencia Leve</option>
                        <option>Advertencia Moderada</option>
                        <option>Falta Grave</option>
                        <option>Suspensión de Servicio</option>
                      </select>
                    </div>
                  </div>
                  <div className="fib-mt-12"><label className="fib-form-label">Justificación Detallada</label><textarea className="fib-form-ctrl" rows={3} placeholder="Describa el incidente y la normativa vulnerada..." /></div>
                  <div className="fib-mt-12"><button className="fib-submit-btn">EMITIR SANCIÓN OFICIAL</button></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════ ADMIN ═══════════════════ */}
        {activeTab === 'admin' && isAdmin && (
          <div id="tab-admin">
            <div className="fib-section-label">// administración — command staff</div>
            <div className="fib-subtabs" id="ad-subtabs">
              <div className={`fib-subtab ${activeAdSub === 'personal' ? 'active' : ''}`} onClick={() => setActiveAdSub('personal')}>GESTIÓN PERSONAL</div>
              <div className={`fib-subtab ${activeAdSub === 'sheet' ? 'active' : ''}`} onClick={() => setActiveAdSub('sheet')}>DATOS SPREADSHEET</div>
              <div className={`fib-subtab ${activeAdSub === 'log' ? 'active' : ''}`} onClick={() => setActiveAdSub('log')}>LOG SISTEMA</div>
            </div>

            {activeAdSub === 'personal' && (
              <div className="fib-panel-card">
                <div className="fib-panel-card-header">base de datos de personal</div>
                <div className="fib-panel-card-body">
                  <div style={{ overflowX: 'auto' }}>
                    <table className="fib-records-table">
                      <thead>
                        <tr><th>Agente</th><th>Rango</th><th>Sección</th><th>Estado</th><th>Acciones</th></tr>
                      </thead>
                      <tbody>
                        {staffAgents.map(a => (
                          <tr key={a.username}>
                            <td><strong>{a.nombre}</strong><br/><span className="opacity-60">#{a.agentNumber}</span></td>
                            <td>{a.rango}</td>
                            <td>{a.seccion || '—'}</td>
                            <td><span className={`fib-record-badge ${a.activo ? 'fib-rb-activo' : 'fib-rb-cerrado'}`}>{a.activo ? 'ACTIVO' : 'INACTIVO'}</span></td>
                            <td>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button className="fib-action-btn" onClick={() => loadAgentCarpeta(a)}>VER</button>
                                <button className="fib-action-btn">EDITAR</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeAdSub === 'sheet' && (
              <div className="fib-panel-card">
                <div className="fib-panel-card-header">visualización de datos brutos</div>
                <div className="fib-panel-card-body p-0">
                  <div style={{ overflowX: 'auto' }}>
                    <table className="fib-records-table">
                      <thead>
                        <tr><th>Nombre</th><th>#Placa</th><th>Rango</th><th>Leves</th><th>Mod.</th><th>Graves</th></tr>
                      </thead>
                      <tbody>
                        {staffAgents.map(a => (
                          <tr key={a.username}>
                            <td>{a.nombre}</td>
                            <td>#{a.agentNumber}</td>
                            <td>{a.rango}</td>
                            <td>{a.totalAnotaciones || 0}</td>
                            <td>{a.totalDocumentos || 0}</td>
                            <td>{a.totalHilos || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeAdSub === 'log' && (
              <div className="fib-panel-card">
                <div className="fib-panel-card-header">registro de eventos del terminal</div>
                <div className="fib-panel-card-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {logs.length === 0 ? (
                    <p className="opacity-30">No hay registros en esta sesión</p>
                  ) : (
                    logs.map((l, i) => (
                      <div key={i} className="fib-log-line">
                        <span className="fib-log-ts">[{l.ts}]</span> {l.msg}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
=======
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
>>>>>>> 0b7dbbb7becb6da8c167ff2bbb4ed7f1d2b0b74f
    </div>
  )
}
