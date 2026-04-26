'use client'
import { useEffect, useState, useRef, useCallback } from 'react'

function UtcClock() {
  const [t, setT] = useState('')
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }) + ' UTC')
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])
  return <span className="font-mono text-[9px]" style={{ color: 'var(--fib-text4)', fontFamily: 'Share Tech Mono, monospace' }}>{t}</span>
}
import {
  Plus, RefreshCw, X, Search, Shield, Send, Users, ChevronRight,
  AlertCircle, CheckCircle, Lock, MessageSquare, User, Activity,
  ExternalLink, Camera, FileSearch, Image, Trash2, FileText
} from 'lucide-react'
import {
  getCasos, getCaso, getStoredUser, crearCaso, editarCaso,
  addAgentToCaso, removeAgentFromCaso, subscribeStoredUser,
  getAllanamientos, borrarCaso
} from '@/lib/client'
import '../carpeta/carpeta.css'

function normalizeImgUrl(raw: string) {
  const s = String(raw || '').trim()
  const d = s.match(/^https?:\/\/i\.imgur\.com\/([a-zA-Z0-9]+)(\.(png|jpg|jpeg|webp|gif))?(\?.*)?$/i)
  if (d) return `https://i.imgur.com/${d[1]}.${d[3] || 'png'}`
  const p = s.match(/^https?:\/\/(?:www\.)?imgur\.com\/(?:gallery\/|a\/)?([a-zA-Z0-9]+)(\?.*)?$/i)
  if (p) return `https://i.imgur.com/${p[1]}.png`
  return s
}
function isImgUrl(raw: string) {
  const s = String(raw || '').trim()
  return /^https?:\/\//i.test(s) && /(imgur\.com|\.(png|jpg|jpeg|webp|gif)(\?.*)?)$/i.test(s)
}
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) }
function fmtDT(iso: string) { return new Date(iso).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }

function Toast({ msg, ok, onClose }: { msg: string; ok: boolean; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t) }, [])
  return (
    <div className={`fixed bottom-5 right-5 z-[200] flex items-center gap-2 px-4 py-3 border font-mono text-xs ${ok ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-red-900/40 border-red-700 text-red-300'}`}>
      {ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />}{msg}
    </div>
  )
}

function AgentSearch({ onSelect, placeholder = 'Buscar agente...' }: { onSelect: (a: any) => void; placeholder?: string }) {
  const [q, setQ] = useState(''); const [res, setRes] = useState<any[]>([]); const [open, setOpen] = useState(false); const [load, setLoad] = useState(false)
  const ref = useRef<HTMLDivElement>(null); const deb = useRef<any>()
  const search = useCallback(async (query: string) => {
    if (!query.trim()) { setRes([]); return }
    setLoad(true)
    try { const r = await fetch(`/api/personal?q=${encodeURIComponent(query)}&estado=Activo`, { headers: { Authorization: `Bearer ${localStorage.getItem('fib_token') || ''}` } }); const d = await r.json(); setRes(d.agentes || []) }
    catch { setRes([]) } finally { setLoad(false) }
  }, [])
  useEffect(() => { clearTimeout(deb.current); deb.current = setTimeout(() => search(q), 280); return () => clearTimeout(deb.current) }, [q, search])
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h) }, [])
  return (
    <div ref={ref} className="relative w-full">
      <div className="flex items-center gap-2 px-3" style={{ background: '#0E1217', border: '1px solid #1B2229' }}>
        <Search size={12} style={{ color: '#8A96A3' }} className="shrink-0" />
        <input className="flex-1 bg-transparent py-2 text-sm focus:outline-none" style={{ color: '#E6ECF2' }} placeholder={placeholder} value={q} onChange={e => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} />
        {load && <div className="w-3 h-3 border border-blue-500/40 border-t-blue-500 rounded-full animate-spin shrink-0" />}
      </div>
      {open && (q.trim() || res.length > 0) && (
        <div className="absolute top-full left-0 right-0 z-50 shadow-xl mt-1 max-h-52 overflow-y-auto" style={{ background: '#0A0D10', border: '1px solid #1B2229' }}>
          {res.length === 0 && q.trim() && !load && <p className="px-3 py-2.5 font-mono text-[10px]" style={{ color: '#8A96A3' }}>Sin resultados</p>}
          {res.map((a: any) => (
            <button key={a.id || a.numero} onClick={() => { onSelect(a); setQ(''); setRes([]); setOpen(false) }} className="w-full flex items-center gap-3 px-3 py-2.5 text-left border-b last:border-0 hover:bg-white/5" style={{ borderColor: '#1B2229' }}>
              <div className="w-8 h-8 flex items-center justify-center shrink-0 rounded-sm text-xs font-bold uppercase" style={{ background: 'rgba(27,111,255,0.1)', border: '1px solid rgba(27,111,255,0.3)', color: '#1B6FFF' }}>{a.nombre?.[0]}</div>
              <div className="flex-1 min-w-0"><p className="text-xs font-semibold truncate" style={{ color: '#E6ECF2' }}>{a.nombre}</p><p className="font-mono text-[9px]" style={{ color: '#8A96A3' }}>{a.rango} · #{a.numero}</p></div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const ESTADO_CLS: Record<string, string> = { abierto: 'fib-rb-activo', en_progreso: 'fib-rb-caso', cerrado: 'fib-rb-cerrado', archivado: 'fib-rb-cerrado' }
const PRIORIDAD_CLR: Record<string, string> = { baja: '#8A96A3', media: '#F1C40F', alta: '#FF8C00', critica: '#CC0000' }

function ModalCrear({ onClose, onSuccess }: { onClose: () => void; onSuccess: (m: string) => void }) {
  const [form, setForm] = useState({ titulo: '', descripcion: '', tipo: 'Investigación General', prioridad: 'media', unidad: 'General', clasificacion: 'interno' })
  const [loading, setLoading] = useState(false); const [error, setError] = useState('')
  const set = (k: keyof typeof form) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }))
  const TIPOS = ['Investigación General', 'Crimen Organizado', 'Homicidio', 'Tráfico', 'Cibercrimen', 'Terrorismo', 'Fraude', 'Otro']
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!form.titulo.trim()) return; setError(''); setLoading(true)
    try { await crearCaso(form); onSuccess('Caso abierto'); onClose() } catch (err: any) { setError(err.message) } finally { setLoading(false) }
  }
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#0A0D10', border: '1px solid #1B2229', maxWidth: 560, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #1B2229' }}>
          <div><div className="fib-section-label" style={{ margin: 0 }}>// nueva investigación</div><p className="text-sm font-bold tracking-widest uppercase mt-1" style={{ color: '#E6ECF2' }}>Abrir Caso</p></div>
          <button onClick={onClose} style={{ color: '#8A96A3' }}><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="p-5 flex flex-col gap-3">
          <div><label className="fib-form-label">Título *</label><input className="fib-form-ctrl w-full" value={form.titulo} onChange={set('titulo')} required placeholder="Ej: Operación Tormenta — Red norte" /></div>
          <div><label className="fib-form-label">Descripción inicial</label><textarea className="fib-form-ctrl w-full" rows={3} value={form.descripcion} onChange={set('descripcion')} placeholder="Contexto, antecedentes..." style={{ resize: 'none' }} /></div>
          <div className="fib-form-grid">
            <div><label className="fib-form-label">Tipo</label><select className="fib-form-ctrl w-full" value={form.tipo} onChange={set('tipo')}>{TIPOS.map(t => <option key={t}>{t}</option>)}</select></div>
            <div><label className="fib-form-label">Prioridad</label><select className="fib-form-ctrl w-full" value={form.prioridad} onChange={set('prioridad')}>{['baja', 'media', 'alta', 'critica'].map(p => <option key={p}>{p}</option>)}</select></div>
            <div><label className="fib-form-label">Unidad</label><select className="fib-form-ctrl w-full" value={form.unidad} onChange={set('unidad')}>{['General', 'CIRG', 'ERT', 'RRHH', 'SOG', 'VCTF'].map(u => <option key={u}>{u}</option>)}</select></div>
            <div><label className="fib-form-label">Clasificación</label><select className="fib-form-ctrl w-full" value={form.clasificacion} onChange={set('clasificacion')}><option value="interno">Interno</option><option value="confidencial">Confidencial</option></select></div>
          </div>
          {error && <p className="font-mono text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="fib-action-btn flex-1 py-2">Cancelar</button>
            <button type="submit" disabled={!form.titulo.trim() || loading} className="fib-add-btn flex-1 disabled:opacity-40" style={{ borderRadius: 4, fontSize: 11 }}>{loading ? 'Creando...' : 'ABRIR CASO'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SospechosoForm({ onAdd }: { onAdd: (d: any) => void }) {
  const [f, setF] = useState({ nombre: '', alias: '', descripcion: '', estado: 'buscado' })
  return (
    <div className="flex flex-col gap-2">
      <div className="fib-form-grid">
        <input className="fib-form-ctrl" placeholder="Nombre completo" value={f.nombre} onChange={e => setF(p => ({ ...p, nombre: e.target.value }))} />
        <input className="fib-form-ctrl" placeholder="Alias / apodo" value={f.alias} onChange={e => setF(p => ({ ...p, alias: e.target.value }))} />
      </div>
      <input className="fib-form-ctrl" placeholder="Descripción física / datos" value={f.descripcion} onChange={e => setF(p => ({ ...p, descripcion: e.target.value }))} />
      <select className="fib-form-ctrl" value={f.estado} onChange={e => setF(p => ({ ...p, estado: e.target.value }))}>{['buscado', 'detenido', 'liberado', 'prófugo'].map(s => <option key={s}>{s}</option>)}</select>
      <button onClick={() => { if (f.nombre) { onAdd(f); setF({ nombre: '', alias: '', descripcion: '', estado: 'buscado' }) } }} className="fib-add-btn" style={{ borderRadius: 4, fontSize: 11 }}>AGREGAR SOSPECHOSO</button>
    </div>
  )
}

function HallazgoForm({ onAdd, saving }: { onAdd: (d: any) => void; saving: boolean }) {
  const [hallazgo, setHallazgo] = useState(''); const [propiedad, setPropiedad] = useState(''); const [links, setLinks] = useState([''])
  const setLink = (i: number, v: string) => setLinks(p => { const n = [...p]; n[i] = v; return n })
  return (
    <div className="flex flex-col gap-2">
      <textarea className="fib-form-ctrl" rows={3} placeholder="Describe el hallazgo..." value={hallazgo} onChange={e => setHallazgo(e.target.value)} style={{ resize: 'none' }} />
      <input className="fib-form-ctrl" placeholder="Propiedad / ubicación del hallazgo" value={propiedad} onChange={e => setPropiedad(e.target.value)} />
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="fib-form-label" style={{ margin: 0 }}>Links de evidencia (Imgur / imagen)</label>
          {links.length < 10 && <button onClick={() => setLinks(p => [...p, ''])} className="fib-action-btn" style={{ padding: '2px 8px', fontSize: 9 }}>+ URL</button>}
        </div>
        <div className="flex flex-col gap-1.5">
          {links.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className="fib-form-ctrl flex-1" placeholder="https://i.imgur.com/..." value={l} onChange={e => setLink(i, e.target.value)} />
              {links.length > 1 && <button onClick={() => setLinks(p => p.filter((_, j) => j !== i))} style={{ color: '#CC0000' }}><X size={13} /></button>}
            </div>
          ))}
        </div>
      </div>
      <button onClick={() => { if (!hallazgo.trim() || !propiedad.trim()) return; const urls = links.map(normalizeImgUrl).filter(l => /^https?:\/\//i.test(l)); onAdd({ hallazgo: hallazgo.trim(), propiedad: propiedad.trim(), evidenciaUrls: urls }); setHallazgo(''); setPropiedad(''); setLinks(['']) }} disabled={!hallazgo.trim() || !propiedad.trim() || saving} className="fib-add-btn disabled:opacity-40" style={{ borderRadius: 4, fontSize: 11 }}>{saving ? 'ENVIANDO...' : 'REGISTRAR HALLAZGO'}</button>
    </div>
  )
}

function NotasChat({ notas, user, canEdit, onAdd }: { notas: any[]; user: any; canEdit: boolean; onAdd: (c: string, p: boolean) => void }) {
  const [texto, setTexto] = useState(''); const [privada, setPrivada] = useState(false); const botRef = useRef<HTMLDivElement>(null)
  const isCS = user?.rol === 'command_staff'
  const visible = notas.filter(n => !n.privada || isCS || n.autor === user?.username)
  useEffect(() => { botRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [notas])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
        {visible.length === 0 && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ textAlign: 'center' }}><MessageSquare size={24} style={{ color: '#4A5560', margin: '0 auto 8px' }} /><p className="font-mono text-xs" style={{ color: '#8A96A3' }}>Sin notas aún</p></div></div>}
        {visible.map((n: any) => {
          const isMe = n.autor === user?.username
          return (
            <div key={n.id} style={{ display: 'flex', gap: 8, flexDirection: isMe ? 'row-reverse' : 'row' }}>
              <div style={{ width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', marginTop: 2, background: isMe ? 'rgba(27,111,255,0.15)' : 'rgba(204,0,0,0.15)', border: `1px solid ${isMe ? 'rgba(27,111,255,0.3)' : 'rgba(204,0,0,0.3)'}`, color: isMe ? '#1B6FFF' : '#CC6666' }}>{n.autor?.[0]}</div>
              <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: 2, alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                  <span className="font-mono text-[8px]" style={{ color: '#8A96A3' }}>{n.autor}</span>
                  {n.privada && <span className="font-mono text-[7px] px-1" style={{ color: '#F1C40F', border: '1px solid #665500' }}>privada</span>}
                  <span className="font-mono text-[7px]" style={{ color: '#4A5560' }}>{fmtDT(n.fecha)}</span>
                </div>
                <div className="px-3 py-2 text-sm leading-relaxed" style={{ background: isMe ? 'rgba(27,111,255,0.12)' : n.privada ? 'rgba(241,196,15,0.06)' : '#0E1217', border: `1px solid ${isMe ? 'rgba(27,111,255,0.2)' : n.privada ? 'rgba(241,196,15,0.2)' : '#1B2229'}`, color: '#C8D4E0', whiteSpace: 'pre-wrap' }}>{n.contenido}</div>
              </div>
            </div>
          )
        })}
        <div ref={botRef} />
      </div>
      {canEdit && (
        <div style={{ padding: 12, borderTop: '1px solid #1B2229', flexShrink: 0 }}>
          <form onSubmit={e => { e.preventDefault(); if (!texto.trim()) return; onAdd(texto.trim(), privada); setTexto('') }} className="flex flex-col gap-2">
            <div className="flex items-center gap-2" style={{ background: '#0E1217', border: '1px solid #1B2229' }}>
              <textarea className="flex-1 bg-transparent px-3 py-2.5 text-sm focus:outline-none" rows={1} style={{ color: '#E6ECF2', resize: 'none', maxHeight: 100, overflowY: 'auto', lineHeight: '1.5' }} placeholder="Añadir nota al caso..." value={texto} onChange={e => { setTexto(e.target.value); (e.target as HTMLTextAreaElement).style.height = 'auto'; (e.target as HTMLTextAreaElement).style.height = Math.min(e.target.scrollHeight, 100) + 'px' }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (texto.trim()) { onAdd(texto.trim(), privada); setTexto('') } } }} />
              <button type="submit" disabled={!texto.trim()} className="px-3 py-2.5 disabled:opacity-30 transition-colors shrink-0" style={{ color: '#8A96A3' }}><Send size={13} /></button>
            </div>
            {isCS && <label className="flex items-center gap-2 cursor-pointer self-end"><input type="checkbox" checked={privada} onChange={e => setPrivada(e.target.checked)} className="w-3 h-3" /><span className="font-mono text-[8px] uppercase" style={{ color: '#8A96A3' }}>Nota privada (solo CS)</span></label>}
          </form>
        </div>
      )}
    </div>
  )
}

function ModalCaso({ casoId, user, onClose, onUpdate, onError }: { casoId: string; user: any; onClose: () => void; onUpdate: (m: string) => void; onError: (m: string) => void }) {
  const [caso, setCaso] = useState<any>(null)
  const [tab, setTab] = useState<'notas' | 'info' | 'sospechosos' | 'allanamientos' | 'hallazgos' | 'timeline' | 'evidencias'>('notas')
  const [showAccess, setShowAccess] = useState(false)
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false)
  const [alls, setAlls] = useState<any[]>([])
  const isCS = user?.rol === 'command_staff'
  const isSuperv = ['command_staff', 'supervisory'].includes(user?.rol || '')
  const canEdit = isCS || isSuperv || caso?.creadoPor === user?.username

  const loadCaso = useCallback(async () => { try { const c = await getCaso(casoId); setCaso(c) } catch { } finally { setLoading(false) } }, [casoId])
  const loadAlls = useCallback(async () => {
    try { const d = await getAllanamientos(); const list = Array.isArray(d) ? d : (d.allanamientos || []); setAlls(list.filter((a: any) => a.casoVinculado === casoId)) } catch { }
  }, [casoId])

  useEffect(() => { loadCaso(); loadAlls() }, [loadCaso, loadAlls])

  async function action(body: any, msg: string) {
    setSaving(true)
    try { await editarCaso(casoId, body); await loadCaso(); onUpdate(msg) }
    catch (e: any) { onError(e.message || 'Error') } finally { setSaving(false) }
  }

  async function eliminarCaso() {
    const ok = await import('@/lib/ui-dialog').then(m => m.uiConfirm(
      `¿Eliminar permanentemente el caso ${caso?.numeroCaso}? Esta acción no se puede deshacer.`,
      { title: 'ELIMINAR CASO', confirmText: 'ELIMINAR', tone: 'danger' }
    ))
    if (!ok) return
    setSaving(true)
    try {
      await borrarCaso(casoId)
      onUpdate('Caso eliminado')
      onClose()
    } catch (e: any) { onError(e.message || 'Error al eliminar') }
    finally { setSaving(false) }
  }

  async function registrarHallazgo(allanamientoId: string, d: any) {
    setSaving(true)
    try {
      const token = localStorage.getItem('fib_token') || ''
      const base = { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
      const r = await fetch(`/api/allanamientos/${allanamientoId}`, { ...base, body: JSON.stringify({ accion: 'reporte_hallazgo', hallazgo: d.hallazgo, propiedad: d.propiedad, evidenciaUrl: d.evidenciaUrls?.[0] || '' }) })
      if (!r.ok) { const j = await r.json(); throw new Error(j.error || 'Error') }
      for (const url of (d.evidenciaUrls || []).slice(1)) {
        await fetch(`/api/allanamientos/${allanamientoId}`, { ...base, body: JSON.stringify({ addFoto: url }) })
      }
      await loadAlls(); onUpdate('Hallazgo registrado')
    } catch (e: any) { onError(e.message) } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="fib-panel-card p-8"><p className="fib-section-label" style={{ margin: 0 }}>cargando expediente...</p></div>
    </div>
  )
  if (!caso) return null

  const TABS = [
    { id: 'notas' as const, label: 'Notas', icon: <MessageSquare size={11} />, count: caso.notas?.filter((n: any) => !n.privada || isCS || n.autor === user?.username).length },
    { id: 'info' as const, label: 'Información', icon: <FileSearch size={11} /> },
    { id: 'sospechosos' as const, label: 'Sospechosos', icon: <User size={11} />, count: caso.sospechosos?.length || 0 },
    { id: 'allanamientos' as const, label: 'Allanamientos', icon: <Shield size={11} />, count: alls.length },
    { id: 'hallazgos' as const, label: 'Hallazgos / Álbum', icon: <Camera size={11} /> },
    { id: 'timeline' as const, label: 'Timeline', icon: <Activity size={11} />, count: caso.timeline?.length || 0 },
    { id: 'evidencias' as const, label: 'Evidencias', icon: <FileText size={11} />, count: caso.evidencias?.length || 0 },
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#07090B', border: '1px solid #1B2229', width: '100%', maxWidth: 780, height: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>

        {/* Header */}
        <div style={{ borderBottom: '1px solid #1B2229', padding: '16px 20px', background: '#0A0D10', borderLeft: `4px solid ${PRIORIDAD_CLR[caso.prioridad] || '#1B2229'}` }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-mono text-[10px]" style={{ color: '#1B6FFF' }}>{caso.numeroCaso}</span>
                <span className={`fib-record-badge ${ESTADO_CLS[caso.estado] || ''}`}>{caso.estado}</span>
                <span className="font-mono text-[9px] px-2 py-0.5" style={{ color: PRIORIDAD_CLR[caso.prioridad], border: `1px solid ${PRIORIDAD_CLR[caso.prioridad]}40`, background: `${PRIORIDAD_CLR[caso.prioridad]}10` }}>{caso.prioridad}</span>
                {caso.clasificacion === 'confidencial' && <span className="flex items-center gap-1 font-mono text-[9px]" style={{ color: '#F1C40F' }}><Lock size={9} /> CONFIDENCIAL</span>}
              </div>
              <h2 className="text-sm font-bold tracking-wide uppercase" style={{ color: '#E6ECF2' }}>{caso.titulo}</h2>
              <p className="font-mono text-[9px] mt-0.5" style={{ color: '#8A96A3' }}>{caso.tipo} · {caso.unidad} · Lead: {caso.agenteLead}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isSuperv && <button onClick={() => setShowAccess(true)} className="fib-action-btn" title="Gestionar acceso"><Users size={12} /></button>}
              {isCS && (
                <button
                  onClick={eliminarCaso}
                  disabled={saving}
                  className="fib-action-btn"
                  title="Eliminar caso (Command Staff)"
                  style={{ color: 'var(--fib-red2)', borderColor: 'rgba(192,57,43,0.3)' }}
                >
                  <Trash2 size={12} />
                </button>
              )}
              <button onClick={onClose} className="fib-action-btn"><X size={13} /></button>
            </div>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="font-mono text-[8px] uppercase tracking-widest shrink-0" style={{ color: '#4A5560' }}>Estado:</span>
              {['abierto', 'en_progreso', 'cerrado', 'archivado'].map(s => (
                <button key={s} onClick={() => action({ estado: s }, `Estado → ${s}`)} className="font-mono text-[8px] tracking-widest uppercase px-2 py-1 transition-colors"
                  style={{ border: `1px solid ${caso.estado === s ? '#1B6FFF' : '#1B2229'}`, color: caso.estado === s ? '#1B6FFF' : '#8A96A3', background: caso.estado === s ? 'rgba(27,111,255,0.1)' : 'transparent' }}>{s}</button>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid #1B2229', background: '#0A0D10' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className="flex items-center gap-1.5 px-4 py-3 font-mono text-[9px] tracking-widest uppercase whitespace-nowrap transition-all"
              style={{ borderBottom: `2px solid ${tab === t.id ? '#1B6FFF' : 'transparent'}`, color: tab === t.id ? '#1B6FFF' : '#8A96A3', background: tab === t.id ? 'rgba(27,111,255,0.05)' : 'transparent', marginBottom: -1 }}>
              {t.icon} {t.label}
              {t.count != null && <span className="text-[8px] px-1" style={{ background: tab === t.id ? 'rgba(27,111,255,0.2)' : '#0E1217' }}>{t.count}</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {tab === 'notas' && <NotasChat notas={caso.notas || []} user={user} canEdit={canEdit} onAdd={(c, p) => action({ addNota: { contenido: c, privada: p } }, 'Nota añadida')} />}

          {tab !== 'notas' && (
            <div style={{ height: '100%', overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {tab === 'info' && <>
                {caso.descripcion && <div className="fib-entry-item" style={{ borderLeftColor: '#1B6FFF' }}><p className="text-sm leading-relaxed" style={{ color: '#C8D4E0' }}>{caso.descripcion}</p></div>}
                <div className="fib-form-grid">
                  {[['N° Caso', caso.numeroCaso], ['Tipo', caso.tipo], ['Unidad', caso.unidad], ['Agent Lead', caso.agenteLead], ['Apertura', fmtDate(caso.creadoEn)], ['Actualización', fmtDate(caso.actualizadoEn)], ['Clasificación', caso.clasificacion?.toUpperCase()], ['Agentes asignados', caso.agentesAsignados?.join(', ') || '—']].map(([k, v]) => (
                    <div key={k} className="fib-entry-item" style={{ borderLeftColor: '#1B2229' }}><p className="font-mono text-[8px] uppercase tracking-widest" style={{ color: '#4A5560' }}>{k}</p><p className="text-xs mt-0.5 font-semibold" style={{ color: '#C8D4E0' }}>{v}</p></div>
                  ))}
                </div>
                {canEdit && isSuperv && (
                  <div className="fib-panel-card">
                    <div className="fib-panel-card-header">// asignar agentes</div>
                    <div className="fib-panel-card-body">
                      <AgentSearch onSelect={a => action({ agentesAsignados: [...(caso.agentesAsignados || []), a.username || a.nombre?.toLowerCase()] }, `Agente ${a.nombre} asignado`)} placeholder="Buscar agente para asignar..." />
                      {caso.agentesAsignados?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {caso.agentesAsignados.map((ag: string) => (
                            <div key={ag} className="flex items-center gap-1.5 px-2 py-1 font-mono text-[10px]" style={{ background: 'rgba(27,111,255,0.1)', border: '1px solid rgba(27,111,255,0.3)', color: '#8AB4FF' }}>
                              {ag}<button onClick={() => action({ agentesAsignados: caso.agentesAsignados.filter((x: string) => x !== ag) }, `${ag} removido`)} className="hover:text-red-400 transition-colors"><X size={10} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>}

              {tab === 'sospechosos' && <>
                {caso.sospechosos?.length === 0 && <div className="fib-panel-card p-10 text-center" style={{ opacity: 0.4 }}><User size={28} className="mx-auto mb-2" /><p className="font-mono text-xs">Sin sospechosos registrados</p></div>}
                {caso.sospechosos?.map((s: any) => (
                  <div key={s.id} className="fib-entry-item" style={{ borderLeftColor: s.estado === 'detenido' ? '#2ECC71' : s.estado === 'prófugo' ? '#CC0000' : '#F1C40F' }}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold tracking-wide uppercase text-sm" style={{ color: '#E6ECF2' }}>{s.nombre}</p>
                      <span className={`fib-record-badge ${s.estado === 'detenido' ? 'fib-rb-activo' : s.estado === 'prófugo' ? 'fib-rb-allanamiento' : 'fib-rb-pendiente'}`}>{s.estado}</span>
                    </div>
                    {s.alias && <p className="font-mono text-[9px] mb-1" style={{ color: '#1B6FFF' }}>"{s.alias}"</p>}
                    {s.descripcion && <p className="text-xs" style={{ color: '#8A96A3' }}>{s.descripcion}</p>}
                  </div>
                ))}
                {canEdit && <div className="fib-panel-card"><div className="fib-panel-card-header">// agregar sospechoso</div><div className="fib-panel-card-body"><SospechosoForm onAdd={d => action({ addSospechoso: d }, 'Sospechoso registrado')} /></div></div>}
              </>}

              {tab === 'allanamientos' && <>
                {alls.length === 0 && <div className="fib-panel-card p-10 text-center" style={{ opacity: 0.4 }}><Shield size={28} className="mx-auto mb-2" /><p className="font-mono text-xs">Sin allanamientos vinculados a este caso</p><p className="font-mono text-[9px] mt-1" style={{ color: '#4A5560' }}>Vincula allanamientos desde el módulo de Allanamientos indicando este caso</p></div>}
                {alls.map((a: any) => (
                  <div key={a.id} className="fib-hilo-item">
                    <div className="fib-hilo-top"><div className="fib-hilo-title"><span className="fib-hilo-type fib-ht-allanamiento">ALLANAMIENTO</span>{a.direccion}</div><div className="fib-hilo-meta">{fmtDate(a.fechaSolicitud)}</div></div>
                    <div className="fib-hilo-preview">{a.motivacion?.slice(0, 120)}{a.motivacion?.length > 120 ? '...' : ''}</div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`fib-record-badge ${a.estado === 'autorizado' || a.estado === 'ejecutado' ? 'fib-rb-activo' : a.estado === 'denegado' ? 'fib-rb-allanamiento' : 'fib-rb-pendiente'}`}>{a.estado}</span>
                      <span className="font-mono text-[9px]" style={{ color: '#8A96A3' }}>Solicitud: {a.numeroSolicitud?.split('//').pop()?.trim() || a.numeroSolicitud}</span>
                      {a.firmas?.length > 0 && <span className="font-mono text-[9px]" style={{ color: '#2ECC71' }}>✓ {a.firmas.length} firma(s)</span>}
                    </div>
                  </div>
                ))}
              </>}

              {tab === 'hallazgos' && <>
                {alls.length === 0 && <div className="fib-panel-card p-8 text-center" style={{ opacity: 0.4 }}><Camera size={28} className="mx-auto mb-2" /><p className="font-mono text-xs">Sin allanamientos vinculados — los hallazgos y álbum van aquí</p></div>}
                {alls.map((a: any) => {
                  const hallazgoMsgs = (a.mensajes || []).filter((m: any) => m.tipo === 'informe')
                  const album = a.albumFotos || []
                  return (
                    <div key={a.id} className="fib-panel-card">
                      <div className="fib-panel-card-header">// {a.direccion}</div>
                      <div className="fib-panel-card-body flex flex-col gap-3">
                        {hallazgoMsgs.length === 0 && album.length === 0 && <p className="font-mono text-[9px] opacity-40">Sin hallazgos registrados en este allanamiento</p>}
                        {hallazgoMsgs.map((m: any) => (
                          <div key={m.id} className="fib-entry-item" style={{ borderLeftColor: '#F1C40F' }}>
                            <div className="fib-entry-date">{fmtDT(m.fecha)} · {m.nombre}</div>
                            <pre className="fib-entry-text whitespace-pre-wrap font-sans text-xs">{m.contenido}</pre>
                          </div>
                        ))}
                        {album.length > 0 && (
                          <div>
                            <p className="font-mono text-[9px] uppercase tracking-widest mb-2 flex items-center gap-2" style={{ color: '#1B6FFF' }}><Image size={10} /> Álbum de evidencia ({album.length} fotos)</p>
                            <div className="grid grid-cols-3 gap-2">
                              {album.map((url: string, i: number) => isImgUrl(url) ? (
                                <a key={i} href={normalizeImgUrl(url)} target="_blank" rel="noreferrer" className="block border overflow-hidden hover:opacity-90 transition-opacity" style={{ borderColor: '#1B2229' }}>
                                  <img src={normalizeImgUrl(url)} alt={`Foto ${i + 1}`} className="w-full object-cover" style={{ height: 90, background: '#000' }} />
                                </a>
                              ) : (
                                <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 p-2 font-mono text-[9px] break-all" style={{ border: '1px solid #1B2229', color: '#1B6FFF' }}>
                                  <ExternalLink size={9} className="shrink-0" /> {url.slice(0, 35)}...
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        {canEdit && (
                          <div style={{ borderTop: '1px solid #1B2229', paddingTop: 12, marginTop: 4 }}>
                            <p className="fib-section-label" style={{ margin: '0 0 8px', fontSize: 9 }}>// registrar hallazgo</p>
                            <HallazgoForm saving={saving} onAdd={d => registrarHallazgo(a.id, d)} />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </>}

              {tab === 'timeline' && <>
                {caso.timeline?.slice().reverse().map((t: any) => (
                  <div key={t.id} style={{ position: 'relative', paddingLeft: 24, paddingBottom: 8 }}>
                    <div style={{ position: 'absolute', left: 0, top: 6, width: 10, height: 10, borderRadius: '50%', border: '1px solid rgba(27,111,255,0.6)', background: 'rgba(27,111,255,0.25)' }} />
                    <div style={{ position: 'absolute', left: 5, top: 16, bottom: 0, width: 1, background: 'linear-gradient(to bottom, rgba(27,111,255,0.4), transparent)' }} />
                    <div className="fib-entry-item" style={{ borderLeftColor: '#1B2229', marginLeft: 8 }}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: '#1B6FFF' }}>{t.accion}</p>
                        <span className="font-mono text-[7px] ml-auto whitespace-nowrap" style={{ color: '#4A5560' }}>{fmtDT(t.fecha)}</span>
                      </div>
                      {t.detalle && <p className="text-xs" style={{ color: '#8A96A3' }}>{t.detalle}</p>}
                      <p className="font-mono text-[8px] mt-1" style={{ color: '#4A5560' }}>por {t.autor}</p>
                    </div>
                  </div>
                ))}
                {canEdit && (
                  <div className="fib-panel-card mt-2">
                    <div className="fib-panel-card-header">// agregar entrada al timeline</div>
                    <div className="fib-panel-card-body flex gap-2">
                      <input className="fib-form-ctrl flex-1" id="tl-a" placeholder="Acción (ej: Operativo realizado)" />
                      <input className="fib-form-ctrl flex-1" id="tl-d" placeholder="Detalle" />
                      <button className="fib-add-btn" style={{ borderRadius: 4, fontSize: 11, whiteSpace: 'nowrap' }} onClick={() => {
                        const a = (document.getElementById('tl-a') as HTMLInputElement)?.value?.trim()
                        const d = (document.getElementById('tl-d') as HTMLInputElement)?.value?.trim()
                        if (a) { action({ addTimeline: { accion: a, detalle: d } }, 'Entrada agregada'); (document.getElementById('tl-a') as HTMLInputElement).value = ''; (document.getElementById('tl-d') as HTMLInputElement).value = '' }
                      }}>+ AÑADIR</button>
                    </div>
                  </div>
                )}
              </>}

              {tab === 'evidencias' && <>
                {(caso.evidencias?.length === 0 || !caso.evidencias) && <div className="fib-panel-card p-10 text-center" style={{ opacity: 0.4 }}><FileText size={28} className="mx-auto mb-2" /><p className="font-mono text-xs">Sin evidencias registradas en este caso</p></div>}
                {(caso.evidencias || []).map((ev: any) => (
                  <div key={ev.id} className="fib-entry-item" style={{ borderLeftColor: '#F1C40F' }}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-xs tracking-wide uppercase" style={{ color: '#E6ECF2' }}>{ev.titulo}</p>
                      <span className="font-mono text-[8px] px-2 py-0.5" style={{ border: '1px solid #2A3540', color: '#8A96A3' }}>{ev.tipo}</span>
                    </div>
                    {ev.descripcion && <p className="text-xs mt-1" style={{ color: '#8A96A3', whiteSpace: 'pre-wrap' }}>{ev.descripcion}</p>}
                    <p className="font-mono text-[8px] mt-1" style={{ color: '#4A5560' }}>Subido por {ev.subidoPor}</p>
                    {ev.url && <a href={ev.url} target="_blank" rel="noreferrer" className="font-mono text-[9px] mt-1 flex items-center gap-1" style={{ color: '#1B6FFF' }}><ExternalLink size={9} />{ev.url.length > 60 ? ev.url.slice(0, 60) + '...' : ev.url}</a>}
                  </div>
                ))}
                {canEdit && (
                  <div className="fib-panel-card">
                    <div className="fib-panel-card-header">// registrar evidencia</div>
                    <div className="fib-panel-card-body flex flex-col gap-2">
                      <input className="fib-form-ctrl" id="ev-titulo" placeholder="Título de la evidencia *" />
                      <input className="fib-form-ctrl" id="ev-tipo" placeholder="Tipo (imagen, documento, video, otro...)" />
                      <textarea className="fib-form-ctrl" id="ev-desc" rows={2} placeholder="Descripción del hallazgo o evidencia" style={{ resize: 'none' }} />
                      <input className="fib-form-ctrl" id="ev-url" placeholder="URL (Imgur, Drive, etc.) — opcional" />
                      <button className="fib-add-btn" style={{ borderRadius: 4, fontSize: 11 }} disabled={saving} onClick={() => {
                        const titulo = (document.getElementById('ev-titulo') as HTMLInputElement)?.value?.trim()
                        if (!titulo) return
                        const tipo = (document.getElementById('ev-tipo') as HTMLInputElement)?.value?.trim() || 'otro'
                        const descripcion = (document.getElementById('ev-desc') as HTMLTextAreaElement)?.value?.trim() || ''
                        const url = (document.getElementById('ev-url') as HTMLInputElement)?.value?.trim() || undefined
                        action({ addEvidencia: { titulo, tipo, descripcion, url } }, 'Evidencia registrada');
                        ['ev-titulo','ev-tipo','ev-desc','ev-url'].forEach(id => { const el = document.getElementById(id) as HTMLInputElement; if (el) el.value = '' })
                      }}>{saving ? 'GUARDANDO...' : '+ REGISTRAR EVIDENCIA'}</button>
                    </div>
                  </div>
                )}
              </>}
            </div>
          )}
        </div>
      </div>

      {showAccess && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={e => e.target === e.currentTarget && setShowAccess(false)}>
          <div style={{ background: '#0A0D10', border: '1px solid #1B2229', width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #1B2229' }}>
              <div><div className="fib-section-label" style={{ margin: 0 }}>// control de acceso</div><p className="text-sm font-bold tracking-widest uppercase mt-0.5" style={{ color: '#E6ECF2' }}>Gestionar Acceso</p></div>
              <button onClick={() => setShowAccess(false)} style={{ color: '#8A96A3' }}><X size={15} /></button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div>
                <p className="fib-form-label">Agentes con acceso:</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(caso.agentesAcceso || []).length === 0 && <p className="font-mono text-[9px]" style={{ color: '#8A96A3' }}>Sin agentes</p>}
                  {(caso.agentesAcceso || []).map((ag: string) => (
                    <div key={ag} className="flex items-center gap-1.5 px-2 py-1 font-mono text-[10px]" style={{ background: 'rgba(27,111,255,0.1)', border: '1px solid rgba(27,111,255,0.3)', color: '#8AB4FF' }}>
                      {ag}<button onClick={async () => { await removeAgentFromCaso(casoId, ag); loadCaso() }} className="hover:text-red-400 transition-colors"><X size={10} /></button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="fib-form-label">Agregar agente:</p>
                <AgentSearch onSelect={async a => { const u = a.username || a.nombre?.toLowerCase(); await addAgentToCaso(casoId, u); loadCaso() }} placeholder="Buscar agente..." />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CasosPage() {
  const [user, setUser] = useState<any>(null)
  const [casos, setCasos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => { setUser(getStoredUser()); return subscribeStoredUser(setUser) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try { const p: Record<string, string> = {}; if (filtroEstado) p.estado = filtroEstado; const d = await getCasos(p); setCasos(Array.isArray(d) ? d : []) }
    catch { setCasos([]) } finally { setLoading(false) }
  }, [filtroEstado])

  useEffect(() => { load() }, [load])
  const notify = (msg: string, ok = true) => { setToast({ msg, ok }); load() }

  const filtered = casos.filter(c => !search || c.titulo?.toLowerCase().includes(search.toLowerCase()) || c.numeroCaso?.toLowerCase().includes(search.toLowerCase()) || c.tipo?.toLowerCase().includes(search.toLowerCase()))
  const isSuperv = ['command_staff', 'supervisory'].includes(user?.rol || '')
  const canCreateCaso = !!user  // cualquier agente logueado puede abrir un caso

  return (
    <div className="fib-panel-container">
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}
      {showCreate && <ModalCrear onClose={() => setShowCreate(false)} onSuccess={m => notify(m)} />}
      {selectedId && <ModalCaso casoId={selectedId} user={user} onClose={() => setSelectedId(null)} onUpdate={m => notify(m)} onError={m => notify(m, false)} />}

      <div className="fib-topbar">
        <span className="fib-logo">FIB</span>
        <span className="fib-topbar-sep">|</span>
        <span className="fib-topbar-label">CASOS &amp; INVESTIGACIONES</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <UtcClock />
          <button className="fib-sync-btn" style={{ marginLeft: 0 }} onClick={load}>↻ ACTUALIZAR</button>
        </div>
      </div>

      <div className="fib-main">
        <div className="fib-section-label">// expedientes de investigación</div>

        {/* Summary header */}
        <div className="fib-agent-header" style={{ padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 24 }}>
            <div>
              <div className="fib-agent-main-name" style={{ fontSize: 16 }}>Casos Registrados</div>
              <div className="fib-agent-callsign" style={{ color: '#8A96A3' }}>Sistema de Gestión de Investigaciones</div>
            </div>
            <div className="fib-agent-stats">
              {[['Abiertos', casos.filter(c => c.estado === 'abierto').length, '#2ECC71'], ['En Progreso', casos.filter(c => c.estado === 'en_progreso').length, '#1B6FFF'], ['Cerrados', casos.filter(c => ['cerrado', 'archivado'].includes(c.estado)).length, '#4A5560']].map(([l, n, clr]) => (
                <div key={l as string} className="fib-stat-box"><div className="fib-stat-num" style={{ color: clr as string, fontSize: 18 }}>{n as number}</div><div className="fib-stat-lbl">{l as string}</div></div>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2" style={{ background: '#0E1217', border: '1px solid #1B2229', flex: 1, minWidth: 180, maxWidth: 320 }}>
            <Search size={12} className="ml-3" style={{ color: '#8A96A3' }} />
            <input className="flex-1 bg-transparent py-2 px-2 text-sm focus:outline-none" style={{ color: '#E6ECF2' }} placeholder="Buscar por título, número..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="fib-form-ctrl" style={{ width: 'auto', padding: '8px 12px' }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {['abierto', 'en_progreso', 'cerrado', 'archivado'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={load} className="fib-action-btn py-2 px-3"><RefreshCw size={12} className={loading ? 'animate-spin' : ''} /></button>
          {canCreateCaso && <button onClick={() => setShowCreate(true)} className="fib-add-btn flex items-center gap-2" style={{ borderRadius: 4, fontSize: 11 }}><Plus size={12} /> ABRIR CASO</button>}
        </div>

        {/* Table */}
        {loading ? (
          <div className="fib-panel-card p-10 text-center"><p className="fib-section-label" style={{ margin: 0 }}>cargando expedientes...</p></div>
        ) : filtered.length === 0 ? (
          <div className="fib-panel-card p-14 text-center" style={{ opacity: 0.4 }}><Shield size={32} className="mx-auto mb-3" /><p className="font-mono text-xs tracking-widest uppercase">Sin casos registrados</p></div>
        ) : (
          <div className="fib-panel-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="fib-records-table" style={{ minWidth: 700 }}>
                <thead><tr>{['N° Caso', 'Título', 'Tipo', 'Estado', 'Prioridad', 'Unidad', 'Lead', 'Notas', 'Apertura', ''].map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedId(c.id)}>
                      <td><span className="font-mono text-[10px]" style={{ color: '#1B6FFF' }}>{c.numeroCaso}</span></td>
                      <td style={{ maxWidth: 200 }}>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold truncate" style={{ color: '#E6ECF2' }}>{c.titulo}</span>
                          {c.clasificacion === 'confidencial' && <Lock size={10} style={{ color: '#F1C40F', flexShrink: 0 }} />}
                        </div>
                      </td>
                      <td style={{ color: '#8A96A3', fontSize: 11 }}>{c.tipo}</td>
                      <td><span className={`fib-record-badge ${ESTADO_CLS[c.estado] || ''}`}>{c.estado}</span></td>
                      <td><span className="font-mono text-[9px] px-2 py-0.5" style={{ color: PRIORIDAD_CLR[c.prioridad], border: `1px solid ${PRIORIDAD_CLR[c.prioridad]}40`, background: `${PRIORIDAD_CLR[c.prioridad]}10` }}>{c.prioridad}</span></td>
                      <td style={{ color: '#8A96A3', fontSize: 11 }}>{c.unidad}</td>
                      <td style={{ color: '#C8D4E0', fontSize: 11 }}>{c.agenteLead}</td>
                      <td><div className="flex items-center gap-1 font-mono text-[9px]" style={{ color: '#8A96A3' }}><MessageSquare size={10} style={{ color: '#4A5560' }} />{c.notas?.length || 0}</div></td>
                      <td className="font-mono text-[9px]" style={{ color: '#4A5560', whiteSpace: 'nowrap' }}>{fmtDate(c.creadoEn)}</td>
                      <td><ChevronRight size={13} style={{ color: '#4A5560' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}