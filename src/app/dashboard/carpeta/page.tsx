'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { Plus, Trash2, FileText, StickyNote, Lock, X, CheckCircle, AlertCircle, Search, MessageSquare, RefreshCw, Send, Award, Activity } from 'lucide-react'
import { getCarpeta, getStoredUser, crearAnotacion, borrarCarpetaItem, getAgente, crearHiloCarpeta, enviarMensajeHiloCarpeta, setEstadoHiloCarpeta, subscribeStoredUser, addAgentToCarpeta, removeAgentFromCarpeta, getPersonal, getCarpetasAdmin } from '@/lib/client'
import { uiConfirm } from '@/lib/ui-dialog'
import './carpeta.css'

function formatThreadParticipants(participantes: string[] = []) {
  return participantes.join(', ')
}

function Toast({ msg, ok, onClose }: { msg: string; ok: boolean; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [])
  return (
    <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-2 px-4 py-3 border font-mono text-xs ${ok ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-red-900/40 border-red-700 text-red-300'}`}>
      {ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
      {msg}
    </div>
  )
}

function PersonalSearchDropdown({ onSelect, placeholder = 'Buscar agente...' }: { onSelect: (agente: any) => void; placeholder?: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center gap-2 bg-[#0E1217] border border-[#1B2229] focus-within:border-[#1B6FFF] transition-colors px-3">
        <Search size={12} className="text-[#8A96A3] shrink-0" />
        <input
          className="flex-1 bg-transparent py-2 text-sm text-[#E6ECF2] placeholder-[#8A96A3] focus:outline-none"
          placeholder={placeholder}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
        {loading && <div className="w-3 h-3 border border-[#1B6FFF]/40 border-t-[#1B6FFF] rounded-full animate-spin shrink-0" />}
      </div>
      {open && (query.trim() || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 z-50 bg-[#0A0D10] border border-[#1B2229] shadow-xl mt-1 max-h-52 overflow-y-auto">
          {results.length === 0 && query.trim() && !loading && (
            <p className="px-3 py-2.5 font-mono text-[10px] text-[#8A96A3]">Sin resultados</p>
          )}
          {results.map((a: any) => (
            <button
              key={a.id || a.numero}
              onClick={() => { onSelect(a); setQuery(''); setResults([]); setOpen(false) }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#14191F] transition-colors text-left border-b border-[#1B2229]/50 last:border-0"
            >
              <div className="w-8 h-8 bg-[#1B6FFF]/10 border border-[#1B6FFF]/30 flex items-center justify-center shrink-0 rounded-sm">
                <span className="font-bold text-[#1B6FFF] text-xs uppercase">{a.nombre?.[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#E6ECF2] font-semibold truncate">{a.nombre}</p>
                <p className="font-mono text-[9px] text-[#8A96A3]">{a.rango} · #{a.numero}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CarpetaPage() {
  const [user, setUser] = useState<any>(null)
  const [ownCarpeta, setOwnCarpeta] = useState<any>(null)
  const [ownAgente, setOwnAgente] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const [activeTab, setActiveTab] = useState<'carpeta' | 'supervisory' | 'admin'>('carpeta')
  const [activeSubTab, setActiveSubTab] = useState<'hilos' | 'registros' | 'condecoraciones' | 'chat'>('hilos')
  const [activeSvSub, setActiveSvSub] = useState<'agentes' | 'reportes' | 'sanciones' | 'condecorar'>('agentes')
  const [activeAdSub, setActiveAdSub] = useState<'personal' | 'ascensos' | 'sheet' | 'log'>('personal')

  const [staffAgents, setStaffAgents] = useState<any[]>([])
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<any>(null)
  const [selectedCarpeta, setSelectedCarpeta] = useState<any>(null)
  const [selectedLoading, setSelectedLoading] = useState(false)

  const [threadReply, setThreadReply] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedHilo, setExpandedHilo] = useState<string | null>(null)
  const [logs, setLogs] = useState<{ ts: string; msg: string }[]>([])
  const [showAvatarEdit, setShowAvatarEdit] = useState(false)
  const [newAvatarUrl, setNewAvatarUrl] = useState('')

  const isStaff = ['command_staff', 'supervisory'].includes(user?.rol)
  const isAdmin = user?.rol === 'command_staff'

  function addLog(msg: string) {
    const now = new Date()
    const ts = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    setLogs(prev => [{ ts, msg }, ...prev].slice(0, 50))
  }

  useEffect(() => {
    const parsed = getStoredUser()
    const unsubscribe = subscribeStoredUser(setUser)
    if (parsed) {
      setUser(parsed)
      setNewAvatarUrl(parsed.avatarUrl || '')
      loadOwnData(parsed)
      if (['command_staff', 'supervisory'].includes(parsed.rol)) {
        loadStaffAgents()
      }
      addLog(`Sesión iniciada como ${parsed.nombre || parsed.username}`)

      const lastSync = localStorage.getItem('fib_last_auto_sync')
      const now = Date.now()
      if (!lastSync || now - Number(lastSync) > 10 * 60 * 1000) {
        syncSheet().then(() => {
          localStorage.setItem('fib_last_auto_sync', String(now))
        })
      }
    } else {
      setLoading(false)
    }
    return () => unsubscribe()
  }, [])

  async function updateAvatar() {
    if (!user?.id) return
    setSaving(true)
    try {
      const token = localStorage.getItem('fib_token') || ''
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatarUrl: newAvatarUrl.trim() || null })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al actualizar avatar')

      setToast({ msg: 'Avatar actualizado correctamente', ok: true })
      setShowAvatarEdit(false)
    } catch (e: any) {
      setToast({ msg: e.message, ok: false })
    } finally {
      setSaving(false)
    }
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

  async function responderHilo(hiloId: string) {
    if (!threadReply.trim()) return
    setSaving(true)
    try {
      await enviarMensajeHiloCarpeta(hiloId, threadReply.trim(), selectedAgent?.username)
      addLog(`Respuesta enviada en hilo #${hiloId}`)
      setThreadReply('')
      if (selectedAgent) {
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
    } finally {
      setSaving(false)
    }
  }

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
        {activeTab === 'carpeta' && (
          <div id="tab-carpeta">
            <div className="fib-section-label">// expediente del agente</div>

            <div className="fib-agent-header">
              <div
                className="fib-agent-av"
                style={{
                  backgroundImage: currentAgente?.avatarUrl ? `url(${currentAgente.avatarUrl})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
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
                    <button className="fib-add-btn" onClick={updateAvatar} disabled={saving}>
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

            <div className="fib-carpeta-grid" style={{ gridTemplateColumns: isStaff ? '240px 1fr' : '1fr' }}>
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
                      <div className="fib-av-sm">{user?.nombre?.[0]}</div>
                      <div>
                        <div className="fib-ali-name">Mi Carpeta</div>
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
                        <div>
                          <div className="fib-ali-name">{a.nombre}</div>
                          <div className="fib-ali-role">{a.rango} · #{a.agentNumber}</div>
                        </div>
                        <div className={`fib-dot ${a.activo ? 'fib-dot-on' : 'fib-dot-off'}`} style={{ marginLeft: 'auto' }}></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                                        <span className="fib-hilo-type fib-ht-caso">HILO</span> &nbsp;{hilo.titulo}
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
                                        onKeyDown={e => e.key === 'Enter' && responderHilo(hilo.id)}
                                      />
                                      <button
                                        className="fib-add-btn"
                                        onClick={() => responderHilo(hilo.id)}
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
                                        <span className="fib-hilo-type fib-ht-caso">HILO</span>
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

                    {activeSubTab === 'registros' && (
                      <div id="sub-registros">
                        <div className="fib-section-label">anotaciones y documentos operativos</div>
                        <div style={{ overflowX: 'auto' }}>
                          <table className="fib-records-table">
                            <thead>
                              <tr><th>Tipo</th><th>Título</th><th>Fecha</th><th>Información</th></tr>
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

                    {activeSubTab === 'condecoraciones' && (
                      <div id="sub-condecoraciones">
                        <div className="fib-section-label">condecoraciones y méritos</div>
                        <div className="fib-panel-card p-10 text-center opacity-30">
                          <Award size={32} className="mx-auto mb-2" />
                          <p>No se han registrado condecoraciones oficiales en este expediente</p>
                        </div>
                      </div>
                    )}

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
                  </>
                )}
              </div>
            </div>
          </div>
        )}

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
                        <tr><th>Agente</th><th>Rango</th><th>Ramas</th><th>Estado</th><th>Acciones</th></tr>
                      </thead>
                      <tbody>
                        {staffAgents.map(a => (
                          <tr key={a.username}>
                            <td><strong>{a.nombre}</strong><br /><span className="opacity-60">#{a.agentNumber}</span></td>
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
    </div>
  )
}
