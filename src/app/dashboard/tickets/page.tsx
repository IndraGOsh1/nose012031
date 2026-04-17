'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Plus, X, Send, RefreshCw, ChevronRight, Users, Trash2,
  MessageSquare, AlertCircle, CheckCircle, Clock,
  Ticket as TicketIcon, UserCheck, Lock
} from 'lucide-react'
import { getTickets, getTicket, getStoredUser, crearTicket, editarTicket, borrarTicket, subscribeStoredUser } from '@/lib/client'
import '../carpeta/carpeta.css'

/* ── helpers ─────────────────────────────────────────────────── */
function uiAlert(msg: string, title = 'Tickets') { window.alert(`[${title}] ${msg}`) }
function useUtcClock() {
  const [t, setT] = useState('')
  useEffect(() => {
    const tick = () => setT(new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC')
    tick(); const i = setInterval(tick, 1000); return () => clearInterval(i)
  }, [])
  return t
}

/* ── constants ───────────────────────────────────────────────── */
const CATEGORIAS = [
  {
    key: 'contacto_supervisory',
    label: 'Contacto con Supervisory',
    icon: '📋',
    desc: 'Comunicaciones generales con el equipo supervisory. Visible para todos los supervisory staff.',
    color: 'var(--fib-cyan)',
    bg: 'rgba(0,200,200,0.05)',
  },
  {
    key: 'contacto_directiva',
    label: 'Contacto con Directiva',
    icon: '🔒',
    desc: 'Canal directo con command staff. Acceso restringido — CS puede habilitar supervisory específicos.',
    color: 'var(--fib-gold)',
    bg: 'rgba(200,160,0,0.05)',
  },
  {
    key: 'quejas_denuncia',
    label: 'Quejas / Denuncia',
    icon: '⚠️',
    desc: 'Quejas formales y denuncias internas. Acceso restringido igual que Directiva.',
    color: '#e05a5a',
    bg: 'rgba(200,50,50,0.05)',
  },
] as const
type CatKey = typeof CATEGORIAS[number]['key']

const ESTADO_BADGE: Record<string, { label: string; color: string }> = {
  abierto:    { label: 'ABIERTO',     color: '#3ddc84' },
  en_proceso: { label: 'EN PROCESO',  color: '#7AABFF' },
  resuelto:   { label: 'RESUELTO',    color: 'var(--fib-text3)' },
  cerrado:    { label: 'CERRADO',     color: 'var(--fib-text4)' },
}
const PRIORIDAD_COLOR: Record<string, string> = {
  baja:    'var(--fib-text4)',
  media:   '#d4a017',
  alta:    '#e07a2f',
  urgente: 'var(--fib-red2)',
}

/* ── Toast ───────────────────────────────────────────────────── */
function Toast({ msg, ok, onClose }: { msg: string; ok: boolean; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 300,
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 16px', border: `1px solid ${ok ? '#3ddc84' : 'var(--fib-red2)'}`,
      background: ok ? 'rgba(61,220,132,0.08)' : 'rgba(192,57,43,0.12)',
      fontFamily: 'Share Tech Mono, monospace', fontSize: 11,
      color: ok ? '#3ddc84' : 'var(--fib-red2)', letterSpacing: 1,
    }}>
      {ok ? <CheckCircle size={12} /> : <AlertCircle size={12} />}{msg}
    </div>
  )
}

/* ── Render text with clickable links ────────────────────────── */
function renderWithLinks(text: string) {
  const urlRe = /https?:\/\/[^\s<>"']+/g
  const parts: React.ReactNode[] = []
  let last = 0, m: RegExpExecArray | null
  while ((m = urlRe.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push(
      <a key={m.index} href={m[0]} target="_blank" rel="noreferrer"
        style={{ color: '#7AABFF', textDecoration: 'underline', wordBreak: 'break-all' }}>
        {m[0]}
      </a>
    )
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}

/* ── ModalTicket ─────────────────────────────────────────────── */
function ModalTicket({ ticketId, user, onClose, onAction }: {
  ticketId: string; user: any; onClose: () => void; onAction: (m: string) => void
}) {
  const [ticket,     setTicket]     = useState<any>(null)
  const [loading,    setLoading]    = useState(true)
  const [mensaje,    setMensaje]    = useState('')
  const [interno,    setInterno]    = useState(false)
  const [sending,    setSending]    = useState(false)
  const [showAcceso, setShowAcceso] = useState(false)
  const [grantUser,  setGrantUser]  = useState('')
  const bottomRef  = useRef<HTMLDivElement>(null)
  const atBottomRef = useRef(true)
  const scrollRef  = useRef<HTMLDivElement>(null)

  const isCS     = user?.rol === 'command_staff'
  const isSuperv = ['command_staff','supervisory'].includes(user?.rol)

  const load = useCallback(async () => {
    try { const t = await getTicket(ticketId); setTicket(t) }
    catch { } finally { setLoading(false) }
  }, [ticketId])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (atBottomRef.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ticket?.comentarios?.length])

  function onScrollChat() {
    const el = scrollRef.current; if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  async function enviar() {
    if (!mensaje.trim() || sending) return
    setSending(true)
    try { await editarTicket(ticketId, { comentario: mensaje.trim(), interno }); setMensaje(''); await load() }
    catch (e: any) { uiAlert(e.message || 'Error') }
    finally { setSending(false) }
  }

  async function cambiarEstado(estado: string) {
    setSending(true)
    try { await editarTicket(ticketId, { estado }); await load(); onAction(`Estado: ${estado}`) }
    catch (e: any) { uiAlert(e.message || 'Error') } finally { setSending(false) }
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar el ticket ${ticket?.numeroTicket} permanentemente?`)) return
    setSending(true)
    try { await borrarTicket(ticketId); onAction('Ticket eliminado'); onClose() }
    catch (e: any) { uiAlert(e.message || 'Error') } finally { setSending(false) }
  }

  async function doGrant() {
    if (!grantUser.trim()) return
    setSending(true)
    try { await editarTicket(ticketId, { grantAcceso: grantUser.trim() }); setGrantUser(''); await load() }
    catch (e: any) { uiAlert(e.message || 'Error') } finally { setSending(false) }
  }

  async function doRevoke(username: string) {
    setSending(true)
    try { await editarTicket(ticketId, { revokeAcceso: username }); await load() }
    catch (e: any) { uiAlert(e.message || 'Error') } finally { setSending(false) }
  }

  if (loading) return (
    <div className="fib-modal-overlay">
      <div className="fib-modal-container" style={{ maxWidth: 680, height: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="fib-section-label" style={{ margin: 0 }}>cargando ticket...</p>
      </div>
    </div>
  )
  if (!ticket) return null

  const comentariosVisibles = (ticket.comentarios || []).filter((c: any) => !c.interno || isSuperv)
  const cat      = CATEGORIAS.find(c => c.key === ticket.categoria) || CATEGORIAS[0]
  const badge    = ESTADO_BADGE[ticket.estado] || { label: ticket.estado, color: 'var(--fib-text3)' }
  const isRestricted = ['contacto_directiva','quejas_denuncia'].includes(ticket.categoria)
  const acceso: string[] = ticket.accesoGrantado || []

  return (
    <div className="fib-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="fib-modal-container" style={{ maxWidth: 680, height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div className="fib-modal-header" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                <span className="fib-number-badge">{ticket.numeroTicket}</span>
                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: cat.color, border: `1px solid ${cat.color}40`, padding: '1px 5px', letterSpacing: 1 }}>
                  {cat.icon} {cat.label.toUpperCase()}
                </span>
                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: badge.color, border: `1px solid ${badge.color}50`, padding: '1px 5px' }}>
                  {badge.label}
                </span>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: PRIORIDAD_COLOR[ticket.prioridad] || 'var(--fib-text4)', flexShrink: 0 }} />
                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'var(--fib-text4)', textTransform: 'uppercase' }}>{ticket.prioridad}</span>
              </div>
              <h2 className="fib-modal-title" style={{ fontSize: 13 }}>{ticket.titulo}</h2>
              <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'var(--fib-text4)', marginTop: 2 }}>
                {ticket.creadoPor} · {new Date(ticket.creadoEn).toLocaleString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                {ticket.asignadoA && ` · asignado: ${ticket.asignadoA}`}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              {isCS && isRestricted && (
                <button onClick={() => setShowAcceso(p => !p)} className="fib-action-btn" title="Gestionar acceso">
                  <Users size={12} />
                </button>
              )}
              {isCS && (
                <button onClick={eliminar} disabled={sending} className="fib-action-btn"
                  title="Eliminar ticket"
                  style={{ color: 'var(--fib-red2)', borderColor: 'rgba(192,57,43,0.3)' }}>
                  <Trash2 size={12} />
                </button>
              )}
              <button onClick={onClose} className="fib-action-btn"><X size={13} /></button>
            </div>
          </div>

          {/* Acciones estado */}
          {isSuperv && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {ticket.estado === 'abierto'     && <button onClick={() => cambiarEstado('en_proceso')} className="fib-action-btn" style={{ fontSize: 9 }}>▶ Tomar</button>}
              {['abierto','en_proceso'].includes(ticket.estado) && <button onClick={() => cambiarEstado('resuelto')} className="fib-action-btn" style={{ fontSize: 9, color: '#3ddc84', borderColor: 'rgba(61,220,132,0.3)' }}>✓ Resolver</button>}
              {ticket.estado === 'resuelto'    && <button onClick={() => cambiarEstado('cerrado')} className="fib-action-btn" style={{ fontSize: 9 }}>⊘ Cerrar</button>}
              {ticket.estado === 'resuelto'    && <button onClick={() => cambiarEstado('abierto')} className="fib-action-btn" style={{ fontSize: 9 }}>↩ Reabrir</button>}
            </div>
          )}

          {/* Panel acceso restringido */}
          {showAcceso && isCS && (
            <div className="fib-panel-card" style={{ marginTop: 10 }}>
              <div className="fib-panel-card-header">// acceso supervisory · {ticket.categoria}</div>
              <div className="fib-panel-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'var(--fib-text4)', lineHeight: 1.5 }}>
                  Los usuarios listados pueden ver y responder este ticket. Solo command_staff puede modificar.
                </p>
                {acceso.length === 0 && (
                  <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'var(--fib-text4)', opacity: 0.5 }}>Sin acceso habilitado.</p>
                )}
                {acceso.map((u: string) => (
                  <div key={u} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', border: '1px solid var(--fib-border)' }}>
                    <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'var(--fib-cyan)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <UserCheck size={9} />{u}
                    </span>
                    <button onClick={() => doRevoke(u)} style={{ color: 'var(--fib-red2)', fontSize: 9 }}>✕ Revocar</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 6 }}>
                  <input className="fib-form-ctrl flex-1" style={{ fontSize: 11 }}
                    placeholder="Username del supervisory..."
                    value={grantUser} onChange={e => setGrantUser(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && doGrant()} />
                  <button onClick={doGrant} disabled={sending || !grantUser.trim()} className="fib-add-btn" style={{ borderRadius: 3, fontSize: 9 }}>+ Dar acceso</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat */}
        <div ref={scrollRef} onScroll={onScrollChat}
          style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {ticket.descripcion && (
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ width: 30, height: 30, background: 'rgba(0,200,200,0.1)', border: '1px solid rgba(0,200,200,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'var(--fib-cyan)', fontWeight: 'bold', textTransform: 'uppercase' }}>{ticket.creadoPor?.[0]}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'var(--fib-cyan)', textTransform: 'uppercase', letterSpacing: 1 }}>{ticket.creadoPor}</span>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'var(--fib-text4)' }}>
                    {new Date(ticket.creadoEn).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'var(--fib-text4)', border: '1px solid var(--fib-border)', padding: '0 4px', letterSpacing: 1 }}>DESCRIPCIÓN</span>
                </div>
                <div className="fib-panel-card" style={{ padding: '10px 14px' }}>
                  <p style={{ fontSize: 12, color: 'var(--fib-text1)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{renderWithLinks(ticket.descripcion)}</p>
                </div>
              </div>
            </div>
          )}

          {comentariosVisibles.map((c: any) => {
            const isOwn = c.autor === user?.username
            return (
              <div key={c.id} style={{ display: 'flex', flexDirection: isOwn ? 'row-reverse' : 'row', gap: 10 }}>
                <div style={{
                  width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: c.interno ? 'rgba(212,160,23,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${c.interno ? 'rgba(212,160,23,0.3)' : 'var(--fib-border)'}`,
                }}>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', color: c.interno ? '#d4a017' : 'var(--fib-text3)' }}>{c.autor?.[0]}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0, maxWidth: '80%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4, flexDirection: isOwn ? 'row-reverse' : 'row', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: isOwn ? '#7AABFF' : 'var(--fib-text2)', textTransform: 'uppercase', letterSpacing: 1 }}>{c.autor}</span>
                    <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'var(--fib-text4)' }}>
                      {new Date(c.fecha).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {c.interno && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: '#d4a017', border: '1px solid rgba(212,160,23,0.3)', padding: '0 4px', letterSpacing: 1 }}>INTERNO</span>}
                  </div>
                  <div style={{
                    padding: '10px 14px',
                    border: `1px solid ${isOwn ? 'rgba(122,171,255,0.25)' : c.interno ? 'rgba(212,160,23,0.2)' : 'var(--fib-border)'}`,
                    background: isOwn ? 'rgba(122,171,255,0.06)' : c.interno ? 'rgba(212,160,23,0.04)' : 'rgba(255,255,255,0.02)',
                  }}>
                    <p style={{ fontSize: 12, color: 'var(--fib-text1)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{renderWithLinks(c.contenido)}</p>
                  </div>
                </div>
              </div>
            )
          })}

          {['resuelto','cerrado'].includes(ticket.estado) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--fib-border)' }} />
              <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#3ddc84', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle size={9} />TICKET {ticket.estado.toUpperCase()}{ticket.resueltoPor ? ` · ${ticket.resueltoPor}` : ''}
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--fib-border)' }} />
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {ticket.estado !== 'cerrado' && (
          <div style={{ borderTop: '1px solid var(--fib-border)', padding: '12px 18px', background: 'var(--fib-surface)', flexShrink: 0 }}>
            {isSuperv && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, cursor: 'pointer', width: 'fit-content' }}>
                <input type="checkbox" checked={interno} onChange={e => setInterno(e.target.checked)} style={{ width: 11, height: 11 }} />
                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: interno ? '#d4a017' : 'var(--fib-text4)', letterSpacing: 1, textTransform: 'uppercase' }}>
                  Nota interna (solo staff)
                </span>
              </label>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea className="fib-form-ctrl flex-1" rows={2}
                placeholder={interno ? 'Nota interna...' : 'Escribe un mensaje... (links clickeables automáticamente)'}
                value={mensaje} onChange={e => setMensaje(e.target.value)} disabled={sending}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
                style={{ resize: 'none', fontSize: 12, border: interno ? '1px solid rgba(212,160,23,0.35)' : undefined }} />
              <button onClick={enviar} disabled={sending || !mensaje.trim()} className="fib-add-btn"
                style={{ borderRadius: 3, alignSelf: 'flex-end', padding: '8px 14px' }}>
                <Send size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── CreateForm ──────────────────────────────────────────────── */
function CreateForm({ onCreated, onCancel }: { onCreated: (m: string) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ titulo: '', descripcion: '', tipo: 'solicitud', prioridad: 'media', categoria: 'contacto_supervisory' as CatKey })
  const [creating, setCreating] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))
  const selectedCat = CATEGORIAS.find(c => c.key === form.categoria)!

  async function crear() {
    if (!form.titulo.trim()) return
    setCreating(true)
    try { await crearTicket(form); onCreated('Ticket creado') }
    catch (e: any) { uiAlert(e.message || 'Error al crear') }
    finally { setCreating(false) }
  }

  return (
    <div className="fib-panel-card" style={{ marginBottom: 16 }}>
      <div className="fib-panel-card-header">// nuevo ticket</div>
      <div className="fib-panel-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        <div>
          <label className="fib-form-label">Categoría *</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {CATEGORIAS.map(cat => (
              <label key={cat.key} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                border: `1px solid ${form.categoria === cat.key ? cat.color + '60' : 'var(--fib-border)'}`,
                background: form.categoria === cat.key ? cat.bg : 'transparent',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <input type="radio" name="categoria" value={cat.key} checked={form.categoria === cat.key}
                  onChange={() => setForm(p => ({ ...p, categoria: cat.key }))} style={{ marginTop: 2 }} />
                <div>
                  <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: form.categoria === cat.key ? cat.color : 'var(--fib-text2)', letterSpacing: 1, marginBottom: 2 }}>
                    {cat.icon} {cat.label.toUpperCase()}
                  </p>
                  <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'var(--fib-text4)', lineHeight: 1.4 }}>{cat.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="fib-form-label">Título *</label>
          <input className="fib-form-ctrl w-full" placeholder="Resumen breve del asunto..." value={form.titulo} onChange={set('titulo')} />
        </div>

        <div>
          <label className="fib-form-label">Descripción</label>
          <textarea className="fib-form-ctrl w-full" rows={4}
            placeholder="Detalla tu solicitud, queja o consulta. Puedes incluir links — se volverán clickeables automáticamente."
            value={form.descripcion} onChange={set('descripcion')} style={{ resize: 'none', fontSize: 12 }} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label className="fib-form-label">Tipo</label>
            <select className="fib-form-ctrl w-full" value={form.tipo} onChange={set('tipo')}>
              <option value="solicitud">Solicitud</option>
              <option value="reporte">Reporte de problema</option>
              <option value="consulta">Consulta</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="fib-form-label">Prioridad</label>
            <select className="fib-form-ctrl w-full" value={form.prioridad} onChange={set('prioridad')}>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} className="fib-action-btn" style={{ fontSize: 10 }}>Cancelar</button>
          <button onClick={crear} disabled={creating || !form.titulo.trim()} className="fib-add-btn" style={{ borderRadius: 3, fontSize: 10 }}>
            {creating ? 'Creando...' : 'Crear Ticket'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── TicketCard ──────────────────────────────────────────────── */
function TicketCard({ t, onClick }: { t: any; onClick: () => void }) {
  const cat   = CATEGORIAS.find(c => c.key === t.categoria) || CATEGORIAS[0]
  const badge = ESTADO_BADGE[t.estado] || { label: t.estado, color: 'var(--fib-text4)' }
  return (
    <div onClick={onClick} className="fib-entry-item" style={{ cursor: 'pointer', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORIDAD_COLOR[t.prioridad] || 'var(--fib-text4)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, flexWrap: 'wrap' }}>
          <span className="fib-number-badge" style={{ fontSize: 8 }}>{t.numeroTicket}</span>
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: badge.color, border: `1px solid ${badge.color}50`, padding: '0 4px' }}>{badge.label}</span>
          {t.comentarios?.length > 0 && (
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'var(--fib-text4)', display: 'flex', alignItems: 'center', gap: 2 }}>
              <MessageSquare size={7} />{t.comentarios.length}
            </span>
          )}
        </div>
        <p style={{ fontSize: 12, color: 'var(--fib-text1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titulo}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'var(--fib-text4)' }}>{t.creadoPor}</span>
          {t.asignadoA && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'var(--fib-text4)' }}>→ {t.asignadoA}</span>}
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'var(--fib-text4)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Clock size={7} />{new Date(t.creadoEn).toLocaleDateString('es')}
          </span>
        </div>
      </div>
      <ChevronRight size={13} style={{ color: 'var(--fib-text4)', flexShrink: 0 }} />
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────────── */
export default function TicketsPage() {
  const [user,       setUser]       = useState<any>(null)
  const [tickets,    setTickets]    = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null)
  const [showForm,   setShowForm]   = useState(false)
  const [filtroEstado,    setFiltroEstado]    = useState('activos')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const clock = useUtcClock()

  useEffect(() => {
    setUser(getStoredUser())
    return subscribeStoredUser(setUser)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p: Record<string, string> = {}
      if (filtroEstado === 'todos') p.includeFinalizados = '1'
      else if (filtroEstado !== 'activos') p.estado = filtroEstado
      if (filtroCategoria) p.categoria = filtroCategoria
      const data = await getTickets(p)
      setTickets(Array.isArray(data) ? data : [])
    } catch { setTickets([]) }
    finally { setLoading(false) }
  }, [filtroEstado, filtroCategoria])

  useEffect(() => { load() }, [load])

  const notify = (msg: string, ok = true) => { setToast({ msg, ok }); load() }
  const isCS = user?.rol === 'command_staff'
  const abiertos = tickets.filter(t => t.estado === 'abierto').length

  const grouped = CATEGORIAS.map(cat => ({
    cat, items: tickets.filter(t => t.categoria === cat.key),
  })).filter(g => g.items.length > 0)

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}
      {selectedId && (
        <ModalTicket ticketId={selectedId} user={user}
          onClose={() => setSelectedId(null)}
          onAction={m => notify(m)} />
      )}

      {/* Page header */}
      <div className="fib-page-header">
        <div>
          <div className="fib-clock">{clock}</div>
          <div className="fib-section-label">// Sistema de Tickets</div>
          <h1 className="fib-page-title">
            TICKETS
            {abiertos > 0 && (
              <span style={{ marginLeft: 10, fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#3ddc84', border: '1px solid rgba(61,220,132,0.3)', padding: '2px 8px', letterSpacing: 1 }}>
                {abiertos} ABIERTO{abiertos > 1 ? 'S' : ''}
              </span>
            )}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={load} className="fib-action-btn" title="Actualizar"><RefreshCw size={12} /></button>
          <button onClick={() => setShowForm(p => !p)} className="fib-add-btn" style={{ borderRadius: 3 }}>
            <Plus size={12} /> NUEVO TICKET
          </button>
        </div>
      </div>

      {/* Info cards categorías (solo CS, sin form) */}
      {!showForm && isCS && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
          {CATEGORIAS.map(cat => (
            <div key={cat.key} className="fib-panel-card" style={{ padding: '10px 14px', borderColor: cat.color + '30', background: cat.bg }}>
              <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: cat.color, letterSpacing: 1, marginBottom: 4 }}>{cat.icon} {cat.label.toUpperCase()}</p>
              <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'var(--fib-text4)', lineHeight: 1.5 }}>{cat.desc}</p>
              {['contacto_directiva','quejas_denuncia'].includes(cat.key) && (
                <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'var(--fib-gold-dim)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Lock size={7} /> Acceso por invitación
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create form */}
      {showForm && <CreateForm onCreated={m => { notify(m); setShowForm(false) }} onCancel={() => setShowForm(false)} />}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <select className="fib-form-ctrl" style={{ width: 'auto', fontSize: 10 }}
          value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="activos">Activos (abierto / en proceso)</option>
          <option value="todos">Todos los estados</option>
          <option value="abierto">Abierto</option>
          <option value="en_proceso">En proceso</option>
          <option value="resuelto">Resuelto</option>
          <option value="cerrado">Cerrado</option>
        </select>
        <select className="fib-form-ctrl" style={{ width: 'auto', fontSize: 10 }}
          value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="fib-panel-card" style={{ padding: '40px 0', textAlign: 'center' }}>
          <p className="fib-section-label" style={{ margin: 0 }}>cargando tickets...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="fib-panel-card" style={{ padding: '60px 0', textAlign: 'center', opacity: 0.4 }}>
          <TicketIcon size={28} style={{ margin: '0 auto 10px', display: 'block' }} />
          <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, letterSpacing: 1 }}>Sin tickets</p>
        </div>
      ) : filtroCategoria ? (
        <div className="fib-panel-card">
          {tickets.map(t => <TicketCard key={t.id} t={t} onClick={() => setSelectedId(t.id)} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {grouped.map(({ cat, items }) => (
            <div key={cat.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div className="fib-section-label" style={{ margin: 0, color: cat.color }}>
                  {cat.icon} {cat.label.toUpperCase()}
                </div>
                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'var(--fib-text4)' }}>· {items.length}</span>
                {['contacto_directiva','quejas_denuncia'].includes(cat.key) && (
                  <Lock size={9} style={{ color: 'var(--fib-text4)', marginLeft: 2 }} />
                )}
              </div>
              <div className="fib-panel-card">
                {items.map(t => <TicketCard key={t.id} t={t} onClick={() => setSelectedId(t.id)} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
