'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { Plus, Trash2, FileText, StickyNote, Lock, X, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Search, User, MessageSquare } from 'lucide-react'
import { getCarpeta, crearAnotacion, borrarCarpetaItem, getAgente, crearHiloCarpeta, enviarMensajeHiloCarpeta, setEstadoHiloCarpeta } from '@/lib/client'

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

// ── Carpeta de otro agente (para roles superiores) ─────────────────────
function CarpetaExterna({ agente, onClose }: { agente: any; onClose: () => void }) {
  const [carpeta, setCarpeta] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'ficha'|'anotaciones'|'documentos'|'hilos'>('ficha')
  const [threadText, setThreadText] = useState('')
  const [threadBusy, setThreadBusy] = useState(false)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)

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
          <button onClick={onClose} className="text-tx-muted hover:text-tx-primary"><X size={15}/></button>
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
  const [saving,   setSaving]   = useState(false)
  const [expanded, setExpanded] = useState<string|null>(null)
  // For command/supervisory: viewing another agent's carpeta
  const [carpetaExterna, setCarpetaExterna] = useState<any>(null)
  const [generalSections, setGeneralSections] = useState<any[]>([])
  const [generalLoading, setGeneralLoading] = useState(false)
  const [generalActive, setGeneralActive] = useState<any>(null)
  const [generalReply, setGeneralReply] = useState('')

  const isSuperv = ['command_staff','supervisory'].includes(user?.rol)
  const activeThread = carpeta?.hilos?.find((hilo: any) => hilo.id === activeThreadId) || carpeta?.hilos?.[0]

  useEffect(() => {
    const u = localStorage.getItem('fib_user')
    if (u) {
      const parsed = JSON.parse(u)
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
    if (!confirm('¿Eliminar esta entrada?')) return
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

  async function cargarGeneralPorSeccion(prefer?: { hiloId?: string; ownerUsername?: string }) {
    if (!isSuperv) return
    setGeneralLoading(true)
    try {
      const token = localStorage.getItem('fib_token') || ''
      const res = await fetch('/api/carpeta?scope=general', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json().catch(() => ({ sections: [] }))
      if (!res.ok) throw new Error(data?.error || 'No se pudo cargar la vista general')
      const sections = Array.isArray(data?.sections) ? data.sections : []
      setGeneralSections(sections)

      const flat = sections.flatMap((section: any) =>
        (Array.isArray(section?.hilos) ? section.hilos : []).map((hilo: any) => ({
          ...hilo,
          section: sectionLabel(section?.section),
        }))
      )
      if (prefer?.hiloId && prefer?.ownerUsername) {
        const same = flat.find((h: any) => h.id === prefer.hiloId && h.ownerUsername === prefer.ownerUsername)
        setGeneralActive(same || flat[0] || null)
      } else {
        setGeneralActive((prev: any) => {
          if (!prev) return flat[0] || null
          return flat.find((h: any) => h.id === prev.id && h.ownerUsername === prev.ownerUsername) || flat[0] || null
        })
      }
    } catch (err: any) {
      setToast({ msg: err.message || 'Error cargando hilos por sección', ok: false })
    } finally {
      setGeneralLoading(false)
    }
  }

  async function responderGeneral() {
    if (!generalActive?.id || !generalActive?.ownerUsername || !generalReply.trim() || saving) return
    setSaving(true)
    try {
      await enviarMensajeHiloCarpeta(generalActive.id, generalReply.trim(), generalActive.ownerUsername)
      setGeneralReply('')
      await cargarGeneralPorSeccion({ hiloId: generalActive.id, ownerUsername: generalActive.ownerUsername })
      setToast({ msg: 'Mensaje enviado en hilo general', ok: true })
    } catch (err: any) {
      setToast({ msg: err.message, ok: false })
    } finally {
      setSaving(false)
    }
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

  useEffect(() => {
    if (isSuperv) {
      void cargarGeneralPorSeccion()
    } else {
      setGeneralSections([])
      setGeneralActive(null)
    }
  }, [isSuperv])

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

      {/* Supervisory/CS: search other agents' carpetas */}
      {isSuperv && (
        <div className="card p-4 mb-5">
          <p className="font-mono text-[9px] uppercase tracking-widest text-accent-blue mb-2">Ver carpeta de otro agente</p>
          <PersonalSearchDropdown
            placeholder="Buscar por nombre, apodo o número..."
            onSelect={a => setCarpetaExterna(a)}
          />
          <p className="font-mono text-[8px] text-tx-dim mt-1.5">Solo se muestran anotaciones públicas de otros agentes</p>
        </div>
      )}

      {isSuperv && (
        <div className="card p-4 mb-5">
          <div className="flex items-center justify-between mb-3 gap-3">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-accent-blue">Carpetas generales por sección</p>
              <p className="font-mono text-[8px] text-tx-dim mt-1">Mini chat consolidado de hilos para supervisión transversal</p>
            </div>
            <button onClick={() => cargarGeneralPorSeccion()} className="btn-ghost py-1.5 px-3 text-[9px]" disabled={generalLoading}>
              {generalLoading ? 'Cargando...' : 'Recargar'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-3">
            <div className="border border-bg-border bg-bg-surface max-h-96 overflow-y-auto">
              {generalLoading && generalSections.length === 0 ? (
                <p className="px-3 py-6 font-mono text-[10px] text-tx-muted text-center">Cargando secciones...</p>
              ) : generalSections.length === 0 ? (
                <p className="px-3 py-6 font-mono text-[10px] text-tx-muted text-center">Sin hilos generales detectados</p>
              ) : (
                generalSections.map((section: any) => (
                  <div key={section.section} className="border-b border-bg-border last:border-0">
                    <p className="px-3 py-2 font-mono text-[8px] uppercase tracking-widest text-tx-muted bg-bg-card">
                      {sectionLabel(section.section)} · {Array.isArray(section.hilos) ? section.hilos.length : 0}
                    </p>
                    {(Array.isArray(section.hilos) ? section.hilos : []).map((hilo: any) => {
                      const selected = generalActive?.id === hilo.id && generalActive?.ownerUsername === hilo.ownerUsername
                      return (
                        <button
                          key={`${hilo.ownerUsername}-${hilo.id}`}
                          onClick={() => setGeneralActive({ ...hilo, section: sectionLabel(section.section) })}
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

            <div className="border border-bg-border bg-bg-surface min-h-80 flex flex-col">
              {!generalActive ? (
                <div className="flex-1 flex items-center justify-center px-4 text-center">
                  <p className="font-mono text-xs text-tx-muted uppercase tracking-widest">Selecciona un hilo de sección</p>
                </div>
              ) : (
                <>
                  <div className="px-4 py-3 border-b border-bg-border bg-bg-card">
                    <p className="font-display text-sm font-semibold tracking-wider uppercase text-tx-primary">{generalActive.titulo}</p>
                    <p className="font-mono text-[8px] text-tx-muted mt-1">
                      Sección: {sectionLabel(generalActive.section)} · Carpeta: {generalActive.ownerNombre || generalActive.ownerUsername}
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                    {(generalActive.mensajes || []).map((mensaje: any) => (
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
                      value={generalReply}
                      onChange={(e) => setGeneralReply(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && responderGeneral()}
                      placeholder={generalActive.estado === 'cerrado' ? 'Hilo cerrado' : 'Responder en el mini chat por sección'}
                      disabled={saving || generalActive.estado === 'cerrado'}
                    />
                    <button
                      onClick={responderGeneral}
                      disabled={saving || !generalReply.trim() || generalActive.estado === 'cerrado'}
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
    </div>
  )
}
