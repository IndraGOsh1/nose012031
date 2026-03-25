'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { Plus, RefreshCw, X, ChevronRight, AlertCircle, CheckCircle, FileText, Clock, Shield, Send, MessageCircle } from 'lucide-react'
import { getCasos, getCaso, crearCaso, editarCaso, borrarCaso } from '@/lib/client'
import { Toast, ToastType } from '@/components/Toast'
import { TableSkeleton } from '@/components/Skeleton'

const ESTADO_TAG: Record<string,string> = {
  abierto:     'tag border-green-700 bg-green-900/20 text-green-400',
  en_progreso: 'tag border-blue-700 bg-blue-900/20 text-blue-400',
  cerrado:     'tag border-gray-700 text-gray-400',
  archivado:   'tag border-gray-800 text-gray-600',
}
const PRIORIDAD_TAG: Record<string,string> = {
  baja:    'tag border-gray-700 text-gray-500',
  media:   'tag border-yellow-700 text-yellow-500',
  alta:    'tag border-orange-700 text-orange-400',
  critica: 'tag border-red-700 bg-red-900/20 text-red-400',
}

// ── Create caso modal — full form ─────────────────────────────────────────
function ModalCrear({ onClose, onSuccess }: { onClose:()=>void; onSuccess:(m:string)=>void }) {
  const [form, setForm] = useState({ titulo:'', descripcion:'', tipo:'Investigación General', prioridad:'media', unidad:'General', clasificacion:'interno' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k:keyof typeof form) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => setForm(p=>({...p,[k]:e.target.value}))
  const TIPOS = ['Investigación General','Crimen Organizado','Homicidio','Tráfico','Cibercrimen','Terrorismo','Fraude','Otro']
  
  // Validation: check required fields
  const isValid = form.titulo.trim().length > 0

  async function submit(e:React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    setError('')
    setLoading(true)
    try { await crearCaso(form); onSuccess('Caso creado'); onClose() }
    catch(err:any) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal w-full max-w-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-bg-border">
          <div><span className="section-tag">// Nueva Investigación</span><p className="font-display text-sm font-semibold tracking-wider uppercase text-tx-primary mt-0.5">Abrir Caso</p></div>
          <button onClick={onClose} className="text-tx-muted hover:text-tx-primary"><X size={15}/></button>
        </div>
        <form onSubmit={submit} className="p-5 flex flex-col gap-3.5">
          <div><label className="label">Título del caso * <span className="text-red-400 text-[10px]">(requerido)</span></label><input className="input" value={form.titulo} onChange={set('titulo')} required placeholder="Ej: Operación Tormenta — Tráfico zona norte"/></div>
          <div><label className="label">Descripción inicial</label><textarea className="input min-h-20 resize-none text-xs" value={form.descripcion} onChange={set('descripcion')} placeholder="Contexto, antecedentes, información relevante..."/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Tipo</label>
              <select className="input text-xs py-2" value={form.tipo} onChange={set('tipo')}>
                {TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="label">Prioridad</label>
              <select className="input text-xs py-2" value={form.prioridad} onChange={set('prioridad')}>
                {['baja','media','alta','critica'].map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div><label className="label">Unidad</label>
              <select className="input text-xs py-2" value={form.unidad} onChange={set('unidad')}>
                {['General','CIRG','ERT','RRHH','SOG','VCTF'].map(u=><option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div><label className="label">Clasificación</label>
              <select className="input text-xs py-2" value={form.clasificacion} onChange={set('clasificacion')}>
                <option value="interno">Interno</option>
                <option value="confidencial">Confidencial</option>
              </select>
            </div>
          </div>
          {error && <p className="font-mono text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={!isValid || loading} className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed">{loading?'Creando...':'Abrir Caso'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Mini forms ─────────────────────────────────────────────────────────────
function SospechosoForm({ onAdd }:{ onAdd:(d:any)=>void }) {
  const [f, setF] = useState({ nombre:'', alias:'', descripcion:'', estado:'buscado' })
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <input className="input text-xs py-1.5" placeholder="Nombre" value={f.nombre} onChange={e=>setF(p=>({...p,nombre:e.target.value}))} />
        <input className="input text-xs py-1.5" placeholder="Alias" value={f.alias} onChange={e=>setF(p=>({...p,alias:e.target.value}))} />
      </div>
      <input className="input text-xs py-1.5" placeholder="Descripción" value={f.descripcion} onChange={e=>setF(p=>({...p,descripcion:e.target.value}))} />
      <select className="input text-xs py-1.5" value={f.estado} onChange={e=>setF(p=>({...p,estado:e.target.value}))}>
        {['buscado','detenido','liberado','prófugo'].map(s=><option key={s} value={s}>{s}</option>)}
      </select>
      <button onClick={()=>{if(f.nombre)onAdd(f)}} className="btn-primary text-[9px] py-1.5 justify-center">Agregar</button>
    </div>
  )
}
function EvidenciaForm({ onAdd }:{ onAdd:(d:any)=>void }) {
  const [f, setF] = useState({ titulo:'', tipo:'imagen', descripcion:'' })
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <input className="input text-xs py-1.5" placeholder="Título" value={f.titulo} onChange={e=>setF(p=>({...p,titulo:e.target.value}))} />
        <select className="input text-xs py-1.5" value={f.tipo} onChange={e=>setF(p=>({...p,tipo:e.target.value}))}>
          {['imagen','documento','video','audio','objeto','digital','otro'].map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <input className="input text-xs py-1.5" placeholder="Descripción" value={f.descripcion} onChange={e=>setF(p=>({...p,descripcion:e.target.value}))} />
      <button onClick={()=>{if(f.titulo)onAdd(f)}} className="btn-primary text-[9px] py-1.5 justify-center">Agregar</button>
    </div>
  )
}
function NotaForm({ onAdd }:{ onAdd:(c:string,p:boolean)=>void }) {
  const [c, setC] = useState(''); const [priv, setPriv] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <textarea className="input text-xs py-1.5 min-h-16 resize-none" placeholder="Nota..." value={c} onChange={e=>setC(e.target.value)} />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={priv} onChange={e=>setPriv(e.target.checked)} className="w-3 h-3" />
          <span className="font-mono text-[9px] text-tx-muted uppercase">Privada (solo CS)</span>
        </label>
        <button onClick={()=>{if(c.trim())onAdd(c,priv)}} className="btn-primary text-[9px] py-1.5 px-3">Agregar Nota</button>
      </div>
    </div>
  )
}
function TimelineForm({ onAdd }:{ onAdd:(a:string,d:string)=>void }) {
  const [a, setA] = useState(''); const [d, setD] = useState('')
  return (
    <div className="flex flex-col gap-2">
      <input className="input text-xs py-1.5" placeholder="Acción (ej: Entrevista realizada)" value={a} onChange={e=>setA(e.target.value)} />
      <input className="input text-xs py-1.5" placeholder="Detalle" value={d} onChange={e=>setD(e.target.value)} />
      <button onClick={()=>{if(a.trim())onAdd(a,d)}} className="btn-primary text-[9px] py-1.5 justify-center">Agregar Entrada</button>
    </div>
  )
}

// ── Case chat — mensaje tipo burbuja ─────────────────────────────────────
function CasoChat({ casoId, user, notas, canEdit, onAddNota }: {
  casoId: string; user: any; notas: any[]; canEdit: boolean; onAddNota: (c:string, p:boolean) => void
}) {
  const [texto, setTexto] = useState('')
  const [privada, setPrivada] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isCS = user?.rol === 'command_staff'

  // Show notes as chat messages
  const visible = notas.filter(n => !n.privada || isCS || n.autor === user?.username)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [notas])

  function send(e: React.FormEvent) {
    e.preventDefault()
    if (!texto.trim()) return
    onAddNota(texto.trim(), privada)
    setTexto('')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 min-h-0">
        {visible.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-8">
              <MessageCircle size={24} className="text-tx-muted opacity-20 mx-auto mb-2"/>
              <p className="font-mono text-xs text-tx-muted">Sin notas aún</p>
              <p className="font-mono text-[8px] text-tx-dim mt-0.5">Las notas del equipo aparecerán aquí</p>
            </div>
          </div>
        )}
        {visible.map((n: any) => {
          const isMe = n.autor === user?.username
          return (
            <div key={n.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-7 h-7 shrink-0 flex items-center justify-center text-[9px] font-bold uppercase mt-0.5 ${isMe ? 'bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan' : 'bg-accent-blue/20 border border-accent-blue/30 text-accent-blue'}`}>
                {n.autor?.[0]}
              </div>
              {/* Bubble */}
              <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                <div className={`flex items-center gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <span className="font-mono text-[8px] text-tx-muted">{n.autor}</span>
                  {n.privada && <span className="font-mono text-[7px] text-yellow-500 border border-yellow-800/40 px-1">privada</span>}
                  <span className="font-mono text-[7px] text-tx-dim">{new Date(n.fecha).toLocaleString('es',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
                </div>
                <div className={`px-3 py-2 text-sm leading-relaxed ${
                  isMe
                    ? 'bg-accent-blue/15 border border-accent-blue/25 text-tx-primary'
                    : n.privada
                    ? 'bg-yellow-900/10 border border-yellow-800/30 text-tx-primary'
                    : 'bg-bg-surface border border-bg-border text-tx-secondary'
                }`}>
                  {n.contenido}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      {canEdit && (
        <div className="px-4 py-3 border-t border-bg-border shrink-0">
          <form onSubmit={send} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-bg-surface border border-bg-border focus-within:border-accent-blue transition-colors">
              <input
                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-tx-primary placeholder-tx-muted focus:outline-none"
                placeholder="Añadir nota al caso..."
                value={texto}
                onChange={e => setTexto(e.target.value)}
                autoComplete="off"
              />
              <button type="submit" disabled={!texto.trim()} className="px-3 py-2.5 text-tx-muted hover:text-accent-blue disabled:opacity-30 transition-colors shrink-0">
                <Send size={13}/>
              </button>
            </div>
            {isCS && (
              <label className="flex items-center gap-2 cursor-pointer self-end">
                <input type="checkbox" checked={privada} onChange={e=>setPrivada(e.target.checked)} className="w-3 h-3"/>
                <span className="font-mono text-[8px] text-tx-muted uppercase">Nota privada (solo CS)</span>
              </label>
            )}
          </form>
        </div>
      )}
    </div>
  )
}

// ── Case modal — tabbed with friendly chat ────────────────────────────────
function ModalCaso({ casoId, user, onClose, onUpdate, onError }: { casoId:string; user:any; onClose:()=>void; onUpdate:(m:string)=>void; onError:(m:string)=>void }) {
  const [caso, setCaso]   = useState<any>(null)
  const [tab,  setTab]    = useState<'chat'|'info'|'sospechosos'|'evidencia'|'timeline'>('chat')
  const [loading, setLoading] = useState(true)
  const isCS    = user?.rol === 'command_staff'
  const isSuperv= ['command_staff','supervisory'].includes(user?.rol)
  const canEdit = isCS || isSuperv || caso?.creadoPor === user?.username

  const loadCaso = useCallback(async () => {
    try { const c = await getCaso(casoId); setCaso(c); setLoading(false) } catch { setLoading(false) }
  }, [casoId])

  useEffect(() => { loadCaso() }, [loadCaso])

  async function action(body:any, msg:string) {
    try { await editarCaso(casoId, body); await loadCaso(); onUpdate(msg) }
    catch(e:any) { onError(e.message || 'Error al actualizar caso') }
  }

  if (loading) return <div className="modal-overlay"><div className="modal p-8 text-center font-mono text-xs text-tx-muted">Cargando caso...</div></div>
  if (!caso) return null

  const TABS = [
    { id:'chat' as const,        label:'💬 Notas', count: caso.notas?.filter((n:any)=>!n.privada||isCS||n.autor===user?.username).length },
    { id:'info' as const,        label:'Información' },
    { id:'sospechosos' as const, label:`Sospechosos (${caso.sospechosos?.length||0})` },
    { id:'evidencia' as const,   label:`Evidencia (${caso.evidencias?.length||0})` },
    { id:'timeline' as const,    label:'Timeline' },
  ]

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal w-full max-w-2xl flex flex-col" style={{ height: '85vh' }}>
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-bg-border shrink-0">
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-[9px] text-accent-blue">{caso.numeroCaso}</span>
              <span className={ESTADO_TAG[caso.estado]||'tag border-bg-border text-tx-muted'}>{caso.estado}</span>
              <span className={PRIORIDAD_TAG[caso.prioridad]||''}>{caso.prioridad}</span>
            </div>
            <h2 className="font-display text-sm font-semibold tracking-wider uppercase text-tx-primary truncate">{caso.titulo}</h2>
            <p className="font-mono text-[8px] text-tx-muted mt-0.5">{caso.tipo} · {caso.unidad} · Lead: {caso.agenteLead}</p>
          </div>
          <button onClick={onClose} className="text-tx-muted hover:text-tx-primary shrink-0 mt-0.5"><X size={15}/></button>
        </div>

        {/* Status change bar (only if canEdit) */}
        {canEdit && (
          <div className="px-5 py-2 border-b border-bg-border bg-bg-surface/50 flex items-center gap-2 shrink-0">
            <span className="font-mono text-[7px] text-tx-dim uppercase tracking-widest shrink-0">Estado:</span>
            <div className="flex gap-1.5 flex-wrap">
              {['abierto','en_progreso','cerrado','archivado'].map(s=>(
                <button key={s} onClick={()=>action({estado:s},`Estado: ${s}`)}
                  className={`font-mono text-[7px] tracking-widest uppercase px-2 py-1 border transition-colors ${caso.estado===s?'border-accent-blue text-accent-blue bg-accent-blue/10':'border-bg-border text-tx-muted hover:border-tx-muted'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-bg-border overflow-x-auto shrink-0">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`px-4 py-2.5 font-mono text-[9px] tracking-widest uppercase transition-all border-b-2 -mb-px whitespace-nowrap flex items-center gap-1.5 ${tab===t.id?'border-accent-blue text-accent-blue':'border-transparent text-tx-muted hover:text-tx-secondary'}`}>
              {t.label}
              {t.count != null && <span className={`text-[8px] px-1 rounded-sm ${tab===t.id?'bg-accent-blue/20':'bg-bg-surface'}`}>{t.count}</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden">

          {/* CHAT TAB — takes full height with scroll inside */}
          {tab==='chat' && (
            <CasoChat
              casoId={casoId}
              user={user}
              notas={caso.notas||[]}
              canEdit={canEdit}
              onAddNota={(contenido, privada) => action({addNota:{contenido,privada}},'Nota añadida')}
            />
          )}

          {/* OTHER TABS — scrollable */}
          {tab!=='chat' && (
            <div className="h-full overflow-y-auto p-5 flex flex-col gap-4">

              {/* INFO */}
              {tab==='info' && (
                <>
                  <p className="text-sm text-tx-secondary leading-relaxed">{caso.descripcion||'Sin descripción.'}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ['Agentes', caso.agentesAsignados?.join(', ')||'—'],
                      ['Apertura', new Date(caso.creadoEn).toLocaleDateString('es')],
                      ['Actualización', new Date(caso.actualizadoEn).toLocaleDateString('es')],
                      ['Clasificación', caso.clasificacion],
                    ].map(([k,v])=>(
                      <div key={k} className="bg-bg-surface border border-bg-border p-2.5">
                        <p className="font-mono text-[8px] text-tx-muted uppercase">{k}</p>
                        <p className="text-xs text-tx-primary mt-0.5">{v}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* SOSPECHOSOS */}
              {tab==='sospechosos' && (
                <>
                  {caso.sospechosos.length===0 && <p className="text-center py-6 font-mono text-xs text-tx-muted">Sin sospechosos registrados</p>}
                  {caso.sospechosos.map((s:any)=>(
                    <div key={s.id} className="bg-bg-surface border border-bg-border p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-display text-sm font-semibold text-tx-primary uppercase">{s.nombre}</p>
                        <span className={`tag border ${s.estado==='detenido'?'border-green-700 text-green-400':s.estado==='prófugo'?'border-red-700 text-red-400':'border-gray-700 text-gray-400'}`}>{s.estado}</span>
                      </div>
                      {s.alias && <p className="font-mono text-[9px] text-accent-blue mb-1">"{s.alias}"</p>}
                      <p className="text-xs text-tx-secondary">{s.descripcion}</p>
                    </div>
                  ))}
                  {canEdit && (
                    <div className="border border-bg-border p-3 mt-1">
                      <p className="section-tag mb-3">// Agregar Sospechoso</p>
                      <SospechosoForm onAdd={data=>action({addSospechoso:data},'Sospechoso agregado')} />
                    </div>
                  )}
                </>
              )}

              {/* EVIDENCIA */}
              {tab==='evidencia' && (
                <>
                  {caso.evidencias.length===0 && <p className="text-center py-6 font-mono text-xs text-tx-muted">Sin evidencias registradas</p>}
                  {caso.evidencias.map((e:any)=>(
                    <div key={e.id} className="bg-bg-surface border border-bg-border p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText size={12} className="text-accent-blue"/>
                        <p className="text-sm font-medium text-tx-primary">{e.titulo}</p>
                        <span className="font-mono text-[8px] text-tx-muted ml-auto">{e.tipo}</span>
                      </div>
                      <p className="text-xs text-tx-secondary">{e.descripcion}</p>
                      <p className="font-mono text-[8px] text-tx-muted mt-1">por {e.subidoPor} · {new Date(e.fecha).toLocaleDateString('es')}</p>
                    </div>
                  ))}
                  {canEdit && (
                    <div className="border border-bg-border p-3 mt-1">
                      <p className="section-tag mb-3">// Agregar Evidencia</p>
                      <EvidenciaForm onAdd={data=>action({addEvidencia:data},'Evidencia agregada')} />
                    </div>
                  )}
                </>
              )}

              {/* TIMELINE */}
              {tab==='timeline' && (
                <>
                  {caso.timeline.slice().reverse().map((t:any)=>(
                    <div key={t.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center mt-1.5">
                        <div className="w-2 h-2 rounded-full bg-accent-blue/60 shrink-0" />
                        <div className="w-px flex-1 bg-bg-border mt-1" />
                      </div>
                      <div className="pb-3 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-[9px] text-accent-blue uppercase">{t.accion}</p>
                          <span className="font-mono text-[8px] text-tx-muted ml-auto whitespace-nowrap">{new Date(t.fecha).toLocaleString('es',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
                        </div>
                        {t.detalle && <p className="text-xs text-tx-secondary mt-0.5">{t.detalle}</p>}
                        <p className="font-mono text-[8px] text-tx-dim mt-0.5">por {t.autor}</p>
                      </div>
                    </div>
                  ))}
                  {canEdit && (
                    <div className="border border-bg-border p-3 mt-2">
                      <TimelineForm onAdd={(accion,detalle)=>action({addTimeline:{accion,detalle}},'Entrada agregada')} />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main list page ────────────────────────────────────────────────────────
export default function CasosPage() {
  const [user,    setUser]    = useState<any>(null)
  const [casos,   setCasos]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedId, setSelectedId] = useState<string|null>(null)
  const [toast,   setToast]   = useState<{msg:string;type:ToastType}|null>(null)
  const [filtroEstado, setFiltroEstado] = useState('')

  useEffect(() => { const u = localStorage.getItem('fib_user'); if (u) setUser(JSON.parse(u)) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p: Record<string,string> = {}
      if (filtroEstado) p.estado = filtroEstado
      const data = await getCasos(p)
      setCasos(Array.isArray(data)?data:[])
    } catch { setCasos([]) }
    finally { setLoading(false) }
  }, [filtroEstado])

  useEffect(() => { load() }, [load])
  const notify = (msg:string, type:ToastType='success') => { setToast({msg,type}); load() }

  return (
    <div className="max-w-6xl mx-auto">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
      {showCreate && <ModalCrear onClose={()=>setShowCreate(false)} onSuccess={m=>notify(m)}/>}
      {selectedId && <ModalCaso casoId={selectedId} user={user} onClose={()=>setSelectedId(null)} onUpdate={m=>notify(m)} onError={m=>notify(m,'error')}/>}

      <div className="flex items-center justify-between mb-5">
        <div className="page-header mb-0">
          <span className="section-tag">// Investigaciones</span>
          <h1 className="font-display text-xl font-semibold tracking-wider uppercase text-tx-primary mt-0.5">Carpetas de Caso</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost py-2 px-3"><RefreshCw size={12} className={loading?'animate-spin':''}/></button>
          <button onClick={()=>setShowCreate(true)} className="btn-primary py-2"><Plus size={12}/>Abrir Caso</button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <select className="input py-2 text-xs w-auto" value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {['abierto','en_progreso','cerrado','archivado'].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <TableSkeleton rows={6} cols={9}/>
      : casos.length===0 ? (
        <div className="card p-14 flex flex-col items-center gap-3 text-tx-muted">
          <Shield size={28} className="opacity-20"/>
          <p className="font-mono text-xs tracking-widest uppercase">Sin casos registrados</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-bg-border">
              {['N° Caso','Título','Tipo','Estado','Prioridad','Unidad','Lead','Notas','Apertura',''].map(h=><th key={h} className="table-head whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {casos.map(c=>(
                <tr key={c.id} className="table-row cursor-pointer" onClick={()=>setSelectedId(c.id)}>
                  <td className="table-cell font-mono text-[10px] text-accent-blue">{c.numeroCaso}</td>
                  <td className="table-cell font-medium text-tx-primary whitespace-nowrap max-w-40 truncate">{c.titulo}</td>
                  <td className="table-cell text-xs text-tx-muted whitespace-nowrap">{c.tipo}</td>
                  <td className="table-cell"><span className={ESTADO_TAG[c.estado]||''}>{c.estado}</span></td>
                  <td className="table-cell"><span className={PRIORIDAD_TAG[c.prioridad]||''}>{c.prioridad}</span></td>
                  <td className="table-cell text-xs text-tx-muted">{c.unidad}</td>
                  <td className="table-cell text-xs text-tx-secondary">{c.agenteLead}</td>
                  <td className="table-cell font-mono text-[9px] text-tx-muted">
                    <div className="flex items-center gap-1">
                      <MessageCircle size={10} className="text-tx-dim"/>
                      {c.notas?.length||0}
                    </div>
                  </td>
                  <td className="table-cell font-mono text-[9px] text-tx-muted whitespace-nowrap">{new Date(c.creadoEn).toLocaleDateString('es')}</td>
                  <td className="table-cell"><ChevronRight size={13} className="text-tx-muted"/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
