'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, X, CheckCircle, AlertCircle, Send, ChevronRight, Tag, Clock, User } from 'lucide-react'
import { getTickets, getTicket, crearTicket, editarTicket, borrarTicket } from '@/lib/client'
import { Toast, ToastType } from '@/components/Toast'
import { TableSkeleton } from '@/components/Skeleton'

const ESTADO_COLOR: Record<string,string> = {
  abierto:    'border-green-700 bg-green-900/20 text-green-400',
  en_proceso: 'border-blue-700 bg-blue-900/20 text-blue-400',
  resuelto:   'border-gray-600 text-gray-400',
  cerrado:    'border-gray-800 text-gray-600',
}
const PRIORIDAD_DOT: Record<string,string> = {
  baja:    'bg-gray-500',
  media:   'bg-yellow-500',
  alta:    'bg-orange-500',
  urgente: 'bg-red-500',
}

// ── Ticket View (Discord-style chat) ─────────────────────────────────────────
function TicketChat({ ticketId, user, onClose, onUpdate, onError }: { ticketId:string; user:any; onClose:()=>void; onUpdate:(m:string)=>void; onError:(m:string)=>void }) {
  const [ticket,   setTicket]   = useState<any>(null)
  const [loading,  setLoading]  = useState(true)
  const [mensaje,  setMensaje]  = useState('')
  const [interno,  setInterno]  = useState(false)
  const [sending,  setSending]  = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const isSuperv   = ['command_staff','supervisory'].includes(user?.rol)

  const load = useCallback(async () => {
    try { const t = await getTicket(ticketId); setTicket(t) }
    catch {}
    finally { setLoading(false) }
  }, [ticketId])

  useEffect(() => { load() }, [load])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [ticket?.comentarios])

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!mensaje.trim() || sending) return
    setSending(true)
    try {
      await editarTicket(ticketId, { comentario: mensaje.trim(), interno })
      setMensaje('')
      await load()
    } catch {}
    finally { setSending(false) }
  }

  async function cambiarEstado(estado: string) {
    try { await editarTicket(ticketId, { estado }); await load(); onUpdate(`Estado: ${estado}`) }
    catch(e:any) { onError(e.message || 'Error al cambiar estado') }
  }

  if (loading) return (
    <div className="modal-overlay">
      <div className="modal p-8 text-center font-mono text-xs text-tx-muted">Cargando ticket...</div>
    </div>
  )
  if (!ticket) return null

  const comentariosVisibles = ticket.comentarios?.filter((c:any) => !c.interno || isSuperv) || []

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-bg-card border border-bg-border w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-4 py-3 border-b border-bg-border bg-bg-surface shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORIDAD_DOT[ticket.prioridad]||'bg-gray-500'}`}/>
                <span className="font-mono text-[9px] text-accent-blue">{ticket.numeroTicket}</span>
                <span className={`tag border ${ESTADO_COLOR[ticket.estado]||''}`}>{ticket.estado}</span>
                <span className="font-mono text-[8px] text-tx-muted uppercase">{ticket.tipo}</span>
              </div>
              <h2 className="font-display text-sm font-semibold tracking-wider uppercase text-tx-primary leading-tight">{ticket.titulo}</h2>
              <p className="font-mono text-[8px] text-tx-muted mt-0.5">
                Abierto por <span className="text-accent-blue">{ticket.creadoPor}</span> · {new Date(ticket.creadoEn).toLocaleDateString('es')}
                {ticket.asignadoA && ` · Asignado a ${ticket.asignadoA}`}
              </p>
            </div>
            <button onClick={onClose} className="text-tx-muted hover:text-tx-primary shrink-0"><X size={15}/></button>
          </div>

          {/* Acciones */}
          {isSuperv && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {ticket.estado==='abierto'     && <button onClick={()=>cambiarEstado('en_proceso')} className="font-mono text-[8px] tracking-widest uppercase px-2 py-1 border border-blue-700 text-blue-400 hover:bg-blue-900/20 transition-colors">Tomar</button>}
              {['abierto','en_proceso'].includes(ticket.estado) && <button onClick={()=>cambiarEstado('resuelto')} className="font-mono text-[8px] tracking-widest uppercase px-2 py-1 border border-green-700 text-green-400 hover:bg-green-900/20 transition-colors">Resolver</button>}
              {ticket.estado==='resuelto'    && <button onClick={()=>cambiarEstado('cerrado')} className="font-mono text-[8px] tracking-widest uppercase px-2 py-1 border border-gray-700 text-gray-400 hover:bg-gray-800/30 transition-colors">Cerrar</button>}
              {ticket.estado==='resuelto'    && <button onClick={()=>cambiarEstado('abierto')} className="font-mono text-[8px] tracking-widest uppercase px-2 py-1 border border-bg-border text-tx-muted hover:text-tx-secondary transition-colors">Reabrir</button>}
            </div>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {/* Descripción como primer mensaje */}
          {ticket.descripcion && (
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center shrink-0">
                <span className="font-display text-[10px] font-bold text-accent-blue uppercase">{ticket.creadoPor?.[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-display text-xs font-semibold tracking-wider uppercase text-accent-cyan">{ticket.creadoPor}</span>
                  <span className="font-mono text-[8px] text-tx-muted">{new Date(ticket.creadoEn).toLocaleString('es',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
                  <span className="font-mono text-[7px] text-tx-dim uppercase border border-bg-border px-1">descripción</span>
                </div>
                <div className="bg-bg-surface border border-bg-border p-3">
                  <p className="text-sm text-tx-primary leading-relaxed whitespace-pre-wrap">{ticket.descripcion}</p>
                </div>
              </div>
            </div>
          )}

          {/* Comentarios */}
          {comentariosVisibles.map((c:any) => (
            <div key={c.id} className={`flex gap-3 ${c.autor===user?.username?'flex-row-reverse':''}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 flex items-center justify-center shrink-0 ${c.interno?'bg-yellow-900/20 border border-yellow-800/40':'bg-bg-surface border border-bg-border'}`}>
                <span className={`font-display text-[10px] font-bold uppercase ${c.interno?'text-yellow-500':'text-tx-secondary'}`}>{c.autor?.[0]}</span>
              </div>

              <div className={`flex-1 min-w-0 max-w-[80%] ${c.autor===user?.username?'items-end flex flex-col':''}`}>
                <div className={`flex items-baseline gap-2 mb-1 ${c.autor===user?.username?'flex-row-reverse':''}`}>
                  <span className={`font-display text-xs font-semibold tracking-wider uppercase ${c.autor===user?.username?'text-accent-blue':'text-tx-primary'}`}>{c.autor}</span>
                  <span className="font-mono text-[8px] text-tx-muted">{new Date(c.fecha).toLocaleString('es',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
                  {c.interno && <span className="font-mono text-[7px] text-yellow-500 border border-yellow-800/40 px-1 uppercase">interno</span>}
                </div>
                <div className={`p-3 ${c.autor===user?.username
                  ?'bg-accent-blue/10 border border-accent-blue/30'
                  :c.interno
                    ?'bg-yellow-900/10 border border-yellow-800/30'
                    :'bg-bg-surface border border-bg-border'
                }`}>
                  <p className="text-sm text-tx-primary leading-relaxed whitespace-pre-wrap break-words">{c.contenido}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Estado final si está cerrado/resuelto */}
          {['resuelto','cerrado'].includes(ticket.estado) && (
            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-bg-border"/>
              <span className="font-mono text-[9px] text-tx-muted uppercase flex items-center gap-1.5">
                <CheckCircle size={10} className="text-green-400"/>
                Ticket {ticket.estado}
                {ticket.resueltoPor && ` por ${ticket.resueltoPor}`}
              </span>
              <div className="flex-1 h-px bg-bg-border"/>
            </div>
          )}

          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        {!['cerrado'].includes(ticket.estado) && (
          <div className="px-4 py-3 border-t border-bg-border bg-bg-surface shrink-0">
            {isSuperv && (
              <label className="flex items-center gap-2 mb-2 cursor-pointer w-fit">
                <input type="checkbox" checked={interno} onChange={e=>setInterno(e.target.checked)} className="w-3 h-3"/>
                <span className="font-mono text-[8px] text-tx-muted uppercase">Nota interna (solo staff)</span>
              </label>
            )}
            <form onSubmit={enviar} className="flex gap-2">
              <input
                className={`input flex-1 text-sm py-2 ${interno?'border-yellow-800/40 bg-yellow-900/5':''}`}
                placeholder={interno?'Nota interna...':'Escribe un mensaje...'}
                value={mensaje}
                onChange={e=>setMensaje(e.target.value)}
                disabled={sending}
                autoComplete="off"
              />
              <button type="submit" disabled={sending||!mensaje.trim()} className="btn-primary py-2 px-3 disabled:opacity-30">
                <Send size={13}/>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TicketsPage() {
  const [user,    setUser]    = useState<any>(null)
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string|null>(null)
  const [toast,   setToast]   = useState<{msg:string;type:ToastType}|null>(null)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroTipo,   setFiltroTipo]   = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form,    setForm]    = useState({ titulo:'', descripcion:'', tipo:'solicitud', prioridad:'media' })
  const [creating,setCreating]= useState(false)

  useEffect(() => { const u = localStorage.getItem('fib_user'); if (u) setUser(JSON.parse(u)) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p: Record<string,string> = {}
      if (filtroEstado) p.estado = filtroEstado
      if (filtroTipo)   p.tipo   = filtroTipo
      const data = await getTickets(p)
      setTickets(Array.isArray(data)?data:[])
    } catch { setTickets([]) }
    finally { setLoading(false) }
  }, [filtroEstado, filtroTipo])

  useEffect(() => { load() }, [load])

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim()) return
    setCreating(true)
    try { await crearTicket(form); setShowForm(false); load(); setToast({msg:'Ticket creado',type:'success'}) }
    catch(err:any) { setToast({msg:err.message,type:'error'}) }
    finally { setCreating(false) }
  }

  const notify = (msg:string, type:ToastType='success') => { setToast({msg,type}); load() }
  const abiertos = tickets.filter(t=>t.estado==='abierto').length
  const isSuperv = ['command_staff','supervisory'].includes(user?.rol)

  return (
    <div className="max-w-5xl mx-auto">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
      {selectedId && <TicketChat ticketId={selectedId} user={user} onClose={()=>setSelectedId(null)} onUpdate={m=>notify(m)} onError={m=>notify(m,'error')}/>}

      <div className="flex items-center justify-between mb-5">
        <div className="page-header mb-0">
          <span className="section-tag">// Tickets</span>
          <h1 className="font-display text-xl font-semibold tracking-wider uppercase text-tx-primary mt-0.5">
            Sistema de Tickets
            {abiertos>0 && <span className="ml-2 font-mono text-[9px] bg-green-900/30 border border-green-800 text-green-400 px-2 py-0.5">{abiertos} abierto{abiertos>1?'s':''}</span>}
          </h1>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost py-2 px-3 text-[9px]">↺ Actualizar</button>
          <button onClick={()=>setShowForm(p=>!p)} className="btn-primary py-2"><Plus size={12}/>Nuevo Ticket</button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card p-4 mb-4">
          <span className="section-tag block mb-3">// Crear Nuevo Ticket</span>
          <form onSubmit={crear} className="flex flex-col gap-3">
            <input className="input" placeholder="Título del ticket * (requerido)" value={form.titulo} onChange={e=>setForm(p=>({...p,titulo:e.target.value}))} required />
            <textarea className="input text-sm min-h-20 resize-none" placeholder="Descripción detallada del problema o solicitud..." value={form.descripcion} onChange={e=>setForm(p=>({...p,descripcion:e.target.value}))} />
            <div className="flex gap-2">
              <select className="input text-xs py-2 flex-1" value={form.tipo} onChange={e=>setForm(p=>({...p,tipo:e.target.value}))}>
                <option value="solicitud">Solicitud</option>
                <option value="reporte">Reporte de problema</option>
                <option value="consulta">Consulta</option>
                <option value="otro">Otro</option>
              </select>
              <select className="input text-xs py-2 flex-1" value={form.prioridad} onChange={e=>setForm(p=>({...p,prioridad:e.target.value}))}>
                <option value="baja">Prioridad baja</option>
                <option value="media">Prioridad media</option>
                <option value="alta">Prioridad alta</option>
                <option value="urgente">Urgente</option>
              </select>
              <button type="button" onClick={()=>setShowForm(false)} className="btn-ghost py-2 px-3 text-[9px]">Cancelar</button>
              <button type="submit" disabled={creating || !form.titulo.trim()} className="btn-primary py-2 text-[9px] disabled:opacity-50 disabled:cursor-not-allowed">{creating?'Creando...':'Crear Ticket'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <select className="input py-2 text-xs w-auto" value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {['abierto','en_proceso','resuelto','cerrado'].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input py-2 text-xs w-auto" value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          {['solicitud','reporte','consulta','otro'].map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Ticket list */}
      {loading ? <TableSkeleton rows={5} cols={5}/>
      : tickets.length === 0 ? (
        <div className="card p-14 flex flex-col items-center gap-3 text-tx-muted">
          <p className="font-mono text-xs tracking-widest uppercase">Sin tickets</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tickets.map(t => (
            <div key={t.id} onClick={()=>setSelectedId(t.id)}
              className="card hover:bg-bg-hover transition-all cursor-pointer group">
              <div className="px-4 py-3 flex items-center gap-3">
                {/* Prioridad dot */}
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${PRIORIDAD_DOT[t.prioridad]||'bg-gray-500'}`}/>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-mono text-[9px] text-accent-blue">{t.numeroTicket}</span>
                    <span className={`tag border ${ESTADO_COLOR[t.estado]||''}`}>{t.estado}</span>
                    <span className="font-mono text-[8px] text-tx-muted uppercase">{t.tipo}</span>
                    {t.comentarios?.length > 0 && (
                      <span className="font-mono text-[8px] text-tx-muted flex items-center gap-1">
                        💬 {t.comentarios.length}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-tx-primary group-hover:text-accent-blue transition-colors truncate">{t.titulo}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="font-mono text-[8px] text-tx-muted flex items-center gap-1"><User size={8}/>{t.creadoPor}</span>
                    {t.asignadoA && <span className="font-mono text-[8px] text-tx-muted">→ {t.asignadoA}</span>}
                    <span className="font-mono text-[8px] text-tx-muted flex items-center gap-1 ml-auto"><Clock size={8}/>{new Date(t.creadoEn).toLocaleDateString('es')}</span>
                  </div>
                </div>

                <ChevronRight size={14} className="text-tx-muted shrink-0 group-hover:text-accent-blue transition-colors"/>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
