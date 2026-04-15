'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, RefreshCw, X, CheckCircle, AlertCircle, Send, FileText, Check, XCircle, PenTool, Trash2, Pencil, Camera, MapPin, AlertTriangle, Clock, Shield } from 'lucide-react'
import { getAllanamientos, crearAllanamiento, editarAllanamiento, getAllanamiento, getStoredUser, borrarAllanamiento, subscribeStoredUser } from '@/lib/client'
import { uiAlert, uiConfirm, uiPrompt } from '@/lib/ui-dialog'

const ESTADO_CFG: Record<string, { label: string; cls: string; icon: string }> = {
  pendiente:  { label: 'Pendiente',  cls: 'border-yellow-700/60 bg-yellow-900/15 text-yellow-400', icon: '⏳' },
  autorizado: { label: 'Autorizado', cls: 'border-green-700/60 bg-green-900/15 text-green-400',  icon: '✅' },
  denegado:   { label: 'Denegado',   cls: 'border-red-700/60 bg-red-900/15 text-red-400',        icon: '❌' },
  ejecutado:  { label: 'Ejecutado',  cls: 'border-blue-700/60 bg-blue-900/15 text-blue-400',     icon: '⚡' },
}

function EstadoBadge({ estado }: { estado: string }) {
  const cfg = ESTADO_CFG[estado] || { label: estado, cls: 'border-bg-border text-tx-muted', icon: '•' }
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-[9px] tracking-widest uppercase px-2 py-0.5 border ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

function Toast({ msg, ok, onClose }: { msg: string; ok: boolean; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [])
  return (
    <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-2 px-4 py-3 border font-mono text-xs shadow-xl ${ok ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-red-900/40 border-red-700 text-red-300'}`}>
      {ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />} {msg}
    </div>
  )
}

function ModalCrear({ onClose, onSuccess }: { onClose: () => void; onSuccess: (m: string) => void }) {
  const [form, setForm] = useState({ direccion: '', motivacion: '', descripcion: '', sospechoso: '', unidad: 'General' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }))
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try { await crearAllanamiento(form); onSuccess('Solicitud enviada'); onClose() }
    catch (err: any) { setError(err.message) } finally { setLoading(false) }
  }
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal w-full max-w-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-bg-border bg-bg-surface">
          <div>
            <span className="section-tag">// Nueva Solicitud</span>
            <p className="font-display text-sm font-semibold tracking-wider uppercase text-tx-primary mt-0.5">Solicitud de Allanamiento</p>
          </div>
          <button onClick={onClose} className="text-tx-muted hover:text-tx-primary p-1"><X size={15} /></button>
        </div>
        <form onSubmit={submit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="label flex items-center gap-1"><MapPin size={9} /> Dirección / Ubicación *</label>
            <input className="input" value={form.direccion} onChange={set('direccion')} placeholder="Calle 5 #23, Zona Industrial" required />
          </div>
          <div>
            <label className="label">Sospechoso(s)</label>
            <input className="input" value={form.sospechoso} onChange={set('sospechoso')} placeholder="Nombre o descripción" />
          </div>
          <div>
            <label className="label flex items-center gap-1"><AlertTriangle size={9} /> Motivación / Justificación Legal *</label>
            <textarea className="input min-h-24 resize-none text-xs" value={form.motivacion} onChange={set('motivacion')} placeholder="Fundamento legal y evidencias que justifican el allanamiento..." required />
          </div>
          <div>
            <label className="label">Descripción del operativo</label>
            <textarea className="input min-h-16 resize-none text-xs" value={form.descripcion} onChange={set('descripcion')} placeholder="Detalles adicionales..." />
          </div>
          <div>
            <label className="label"><Shield size={9} className="inline mr-1" />Unidad</label>
            <select className="input text-xs py-2" value={form.unidad} onChange={set('unidad')}>
              {['General', 'CIRG', 'ERT', 'RRHH', 'SOG', 'VCTF'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          {error && <p className="font-mono text-xs text-red-400 bg-red-900/10 border border-red-800/40 px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">{loading ? 'Enviando...' : 'Enviar Solicitud'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalAllanamiento({ itemId, user, onClose, onAction }: { itemId: string; user: any; onClose: () => void; onAction: (m: string) => void }) {
  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mensaje, setMensaje] = useState('')
  const [motivo, setMotivo] = useState('')
  const [sending, setSending] = useState(false)
  const [hallazgo, setHallazgo] = useState('')
  const [propiedad, setPropiedad] = useState('')
  const [evidenciaUrl, setEvidenciaUrl] = useState('')
  const [tab, setTab] = useState<'info' | 'chat' | 'pdf'>('info')
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const atBottomRef = useRef(true)
  const isSuperv = ['command_staff', 'supervisory'].includes(user?.rol)
  const isCS = user?.rol === 'command_staff'
  const [editForm, setEditForm] = useState({ numeroSolicitud: '', direccion: '', sospechoso: '', unidad: 'General', motivacion: '', descripcion: '', observaciones: '' })

  function extractImageUrl(raw: string) {
    const match = String(raw || '').match(/https?:\/\/[^\s]+\.(?:png|jpg|jpeg|webp|gif)(?:\?[^\s]*)?/i)
    return match ? match[0] : ''
  }

  const load = useCallback(async () => {
    try {
      const d = await getAllanamiento(itemId)
      setItem(d)
      setEditForm({ numeroSolicitud: d?.numeroSolicitud || '', direccion: d?.direccion || '', sospechoso: d?.sospechoso || '', unidad: d?.unidad || 'General', motivacion: d?.motivacion || '', descripcion: d?.descripcion || '', observaciones: d?.observaciones || '' })
    } catch { }
    finally { setLoading(false) }
  }, [itemId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (atBottomRef.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [item?.mensajes])

  function onChatScroll() {
    const el = scrollRef.current
    if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  async function doAction(accion: string, extra?: any) {
    setSending(true)
    try { await editarAllanamiento(itemId, { accion, motivo, ...extra }); await load(); onAction(`Acción: ${accion}`) }
    catch (e: any) { uiAlert(e?.message || 'No se pudo ejecutar la acción', 'Allanamientos') } finally { setSending(false) }
  }

  async function enviarMensajeChat(e: React.FormEvent) {
    e.preventDefault(); if (!mensaje.trim()) return; setSending(true)
    try { await editarAllanamiento(itemId, { mensaje: mensaje.trim() }); setMensaje(''); await load() }
    catch (e: any) { uiAlert(e?.message || 'No se pudo enviar el mensaje', 'Allanamientos') } finally { setSending(false) }
  }

  async function enviarReporteHallazgo(e: React.FormEvent) {
    e.preventDefault()
    if (!hallazgo.trim() || !propiedad.trim()) return
    setSending(true)
    try {
      await editarAllanamiento(itemId, { accion: 'reporte_hallazgo', hallazgo: hallazgo.trim(), propiedad: propiedad.trim(), evidenciaUrl: evidenciaUrl.trim() })
      setHallazgo(''); setPropiedad(''); setEvidenciaUrl('')
      await load(); onAction('Informe de hallazgo registrado')
    } catch (e: any) { uiAlert(e?.message || 'No se pudo registrar el informe', 'Allanamientos') } finally { setSending(false) }
  }

  async function descargarPDF() {
    if (!item) return; setSending(true)
    try {
      const response = await fetch(`/api/allanamientos/${itemId}/download-pdf`)
      if (!response.ok) throw new Error('Error downloading PDF')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `allanamiento-${item.numeroSolicitud.replace(/[^a-zA-Z0-9-]/g, '-')}.pdf`
      document.body.appendChild(a); a.click()
      window.URL.revokeObjectURL(url); document.body.removeChild(a)
      onAction('PDF descargado')
    } catch (e: any) { uiAlert(e?.message || 'No se pudo descargar el PDF', 'Descarga PDF') } finally { setSending(false) }
  }

  if (loading) return (
    <div className="modal-overlay">
      <div className="modal p-12 text-center">
        <div className="w-5 h-5 border border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="font-mono text-[10px] text-tx-muted uppercase tracking-widest">Cargando expediente…</p>
      </div>
    </div>
  )
  if (!item) return null

  const canChat = isSuperv || (item.solicitadoPor === user?.username && item.estado === 'pendiente')
  const yafirmo = item.firmas?.some((f: any) => f.username === user?.username)

  // Group chat messages
  const grouped = (item.mensajes || []).reduce((acc: any[], msg: any, i: number) => {
    const tiposEspeciales = ['sistema', 'accion', 'documento', 'informe']
    if (tiposEspeciales.includes(msg.tipo)) { acc.push({ ...msg, msgs: [msg] }); return acc }
    const prev = (item.mensajes || [])[i - 1]
    const sameAuthor = prev?.autor === msg.autor
    const closeTime = prev && (new Date(msg.fecha).getTime() - new Date(prev.fecha).getTime()) < 120000
    const prevSpecial = prev && tiposEspeciales.includes(prev.tipo)
    if (sameAuthor && closeTime && !prevSpecial) {
      acc[acc.length - 1].msgs.push(msg)
    } else {
      acc.push({ ...msg, msgs: [msg] })
    }
    return acc
  }, [])

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-bg-card border border-bg-border w-full max-w-2xl h-[92vh] flex flex-col overflow-hidden shadow-2xl">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-bg-border bg-bg-surface shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="font-mono text-[10px] text-accent-blue bg-accent-blue/10 border border-accent-blue/30 px-2 py-0.5">{item.numeroSolicitud}</span>
                <EstadoBadge estado={item.estado} />
                <span className="font-mono text-[9px] text-tx-dim bg-bg-base border border-bg-border px-2 py-0.5">{item.unidad}</span>
              </div>
              <p className="font-display text-base font-semibold tracking-wider uppercase text-tx-primary leading-tight flex items-center gap-2">
                <MapPin size={13} className="text-tx-muted shrink-0" />
                {item.direccion}
              </p>
              <p className="font-mono text-[9px] text-tx-muted mt-1 flex items-center gap-1.5">
                <Clock size={9} />
                {item.nombreSolicitante}{item.callsignSolicitante && ` [${item.callsignSolicitante}]`}
                <span className="text-tx-dim">·</span>
                {new Date(item.fechaSolicitud).toLocaleDateString('es')}
              </p>
            </div>
            <button onClick={onClose} className="text-tx-muted hover:text-tx-primary shrink-0 p-1"><X size={15} /></button>
          </div>

          {/* Supervisor actions */}
          {isSuperv && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {item.estado === 'pendiente' && <>
                <button onClick={() => doAction('autorizar')} disabled={sending} className="btn-success py-1.5 px-3 text-[9px]"><Check size={11} />Autorizar</button>
                <button onClick={async () => { const m = await uiPrompt('Motivo de denegación:', { title: 'Denegar solicitud', placeholder: 'Escribe el motivo...' }); if (m) doAction('denegar', { motivo: m }) }} disabled={sending} className="btn-danger py-1.5 px-3 text-[9px]"><XCircle size={11} />Denegar</button>
              </>}
              {item.estado === 'autorizado' && (
                <button onClick={() => doAction('ejecutar')} disabled={sending} className="btn-primary py-1.5 px-3 text-[9px]">⚡ Ejecutado</button>
              )}
              {isCS && ['autorizado', 'ejecutado'].includes(item.estado) && (
                <button onClick={async () => { if (!await uiConfirm('Esto quitará la autorización, reiniciará firmas y devolverá el estado a pendiente. ¿Continuar?', { title: 'Quitar autorización', tone: 'danger' })) return; await doAction('quitar_autorizacion') }} disabled={sending} className="btn-danger py-1.5 px-3 text-[9px]">
                  <XCircle size={11} />Quitar autorización
                </button>
              )}
              {!yafirmo && item.estado !== 'denegado' && (
                <button onClick={() => doAction('firmar', { tipoFirma: 'supervisor' })} disabled={sending} className="btn-ghost py-1.5 px-3 text-[9px]"><PenTool size={11} />Firmar</button>
              )}
            </div>
          )}
          {isCS && (
            <div className="flex gap-2 mt-2 flex-wrap">
              <button onClick={async () => { if (!await uiConfirm('¿Eliminar esta solicitud de allanamiento? Esta acción no se puede deshacer.', { tone: 'danger', title: 'Eliminar solicitud' })) return; setSending(true); try { await borrarAllanamiento(itemId); onAction('Solicitud eliminada'); onClose() } catch (e: any) { uiAlert(e?.message || 'No se pudo eliminar la solicitud', 'Allanamientos') } finally { setSending(false) } }} disabled={sending} className="btn-danger py-1.5 px-3 text-[9px]">
                <Trash2 size={11} />Eliminar solicitud
              </button>
            </div>
          )}
        </div>

        {/* ── Tabs ─────────────────────────────────────────────── */}
        <div className="flex border-b border-bg-border shrink-0 bg-bg-base">
          {[{ id: 'info', l: 'Expediente' }, { id: 'chat', l: `Chat ${item.mensajes?.length > 0 ? `(${item.mensajes.length})` : ''}` }, { id: 'pdf', l: 'PDF / Firma' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`px-5 py-2.5 font-mono text-[9px] tracking-widest uppercase transition-all border-b-2 -mb-px ${tab === t.id ? 'border-accent-blue text-accent-blue bg-accent-blue/5' : 'border-transparent text-tx-muted hover:text-tx-secondary hover:bg-bg-hover/40'}`}>
              {t.l}
            </button>
          ))}
        </div>

        {/* ── INFO TAB ─────────────────────────────────────────── */}
        {tab === 'info' && (
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
            {isCS && (
              <div className="bg-bg-surface border border-accent-blue/20 p-4 flex flex-col gap-3">
                <p className="font-mono text-[9px] text-accent-blue uppercase tracking-widest flex items-center gap-1"><Pencil size={9} /> Editar (Command Staff)</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="label">N° Solicitud</label><input className="input text-xs py-2" value={editForm.numeroSolicitud} onChange={e => setEditForm(p => ({ ...p, numeroSolicitud: e.target.value }))} /></div>
                  <div><label className="label">Unidad</label><input className="input text-xs py-2" value={editForm.unidad} onChange={e => setEditForm(p => ({ ...p, unidad: e.target.value }))} /></div>
                </div>
                <div><label className="label">Dirección</label><input className="input text-xs py-2" value={editForm.direccion} onChange={e => setEditForm(p => ({ ...p, direccion: e.target.value }))} /></div>
                <div><label className="label">Sospechoso</label><input className="input text-xs py-2" value={editForm.sospechoso} onChange={e => setEditForm(p => ({ ...p, sospechoso: e.target.value }))} /></div>
                <div><label className="label">Motivación</label><textarea className="input min-h-20 resize-none text-xs" value={editForm.motivacion} onChange={e => setEditForm(p => ({ ...p, motivacion: e.target.value }))} /></div>
                <div><label className="label">Descripción</label><textarea className="input min-h-16 resize-none text-xs" value={editForm.descripcion} onChange={e => setEditForm(p => ({ ...p, descripcion: e.target.value }))} /></div>
                <div><label className="label">Observaciones</label><textarea className="input min-h-16 resize-none text-xs" value={editForm.observaciones} onChange={e => setEditForm(p => ({ ...p, observaciones: e.target.value }))} /></div>
                <button onClick={async () => { setSending(true); try { await editarAllanamiento(itemId, { accion: 'editar', ...editForm }); await load(); onAction('Solicitud actualizada') } catch (e: any) { uiAlert(e?.message || 'No se pudo actualizar la solicitud', 'Allanamientos') } finally { setSending(false) } }} disabled={sending} className="btn-primary w-fit py-2 px-3 text-[10px]">
                  <Pencil size={12} />Guardar cambios
                </button>
              </div>
            )}

            {/* Info cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[['Sospechoso', item.sospechoso || '—'], ['Unidad', item.unidad], ['Solicitante', `${item.nombreSolicitante}${item.callsignSolicitante ? ` [${item.callsignSolicitante}]` : ''}`]].map(([k, v]) => (
                <div key={k} className="bg-bg-surface border border-bg-border p-3">
                  <p className="font-mono text-[8px] text-tx-dim uppercase mb-1">{k}</p>
                  <p className="text-xs text-tx-primary font-medium">{v}</p>
                </div>
              ))}
            </div>

            <div className="bg-bg-surface border border-bg-border p-4">
              <p className="font-mono text-[8px] text-tx-dim uppercase mb-2 flex items-center gap-1"><AlertTriangle size={8} /> Motivación legal</p>
              <p className="text-xs text-tx-primary leading-relaxed whitespace-pre-wrap">{item.motivacion}</p>
            </div>

            {item.descripcion && (
              <div className="bg-bg-surface border border-bg-border p-4">
                <p className="font-mono text-[8px] text-tx-dim uppercase mb-2">Descripción del operativo</p>
                <p className="text-xs text-tx-secondary leading-relaxed">{item.descripcion}</p>
              </div>
            )}

            {item.observaciones && (
              <div className="bg-bg-surface border border-bg-border p-4">
                <p className="font-mono text-[8px] text-tx-dim uppercase mb-2">Observaciones</p>
                <p className="text-xs text-tx-secondary leading-relaxed">{item.observaciones}</p>
              </div>
            )}

            {item.motivoDenegacion && (
              <div className="bg-red-900/10 border border-red-800/40 p-4">
                <p className="font-mono text-[8px] text-red-500 uppercase mb-2 flex items-center gap-1"><XCircle size={9} /> Motivo de denegación</p>
                <p className="text-xs text-red-300 leading-relaxed">{item.motivoDenegacion}</p>
              </div>
            )}

            {item.firmas?.length > 0 && (
              <div className="bg-green-900/10 border border-green-800/40 p-4">
                <p className="font-mono text-[8px] text-green-500 uppercase mb-3 flex items-center gap-1"><PenTool size={9} /> Firmas registradas</p>
                <div className="flex flex-col gap-2">
                  {item.firmas.map((f: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 py-1.5 border-b border-green-900/20 last:border-0">
                      <div className="w-7 h-7 flex items-center justify-center bg-green-900/30 border border-green-800/40 font-display text-[10px] font-bold text-green-400 uppercase">
                        {f.nombre?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-green-300 font-medium">{f.nombre}{f.callsign && ` [${f.callsign}]`}</p>
                        <p className="font-mono text-[8px] text-green-600">{f.rol?.replace('_', ' ')}</p>
                      </div>
                      <span className="font-mono text-[8px] text-green-700">{new Date(f.fecha).toLocaleDateString('es')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CHAT TAB ────────────────────────────────────────── */}
        {tab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div ref={scrollRef} onScroll={onChatScroll} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
              {grouped.map((group: any, gi: number) => {
                // System / action messages
                if (group.tipo === 'sistema' || group.tipo === 'accion') {
                  return (
                    <div key={`${group.id}-${gi}`} className="flex justify-center">
                      <span className="font-mono text-[8px] text-tx-dim italic px-3 py-1 bg-bg-surface border border-bg-border/50">
                        {group.msgs[0].contenido}
                      </span>
                    </div>
                  )
                }
                // Document generated
                if (group.tipo === 'documento') {
                  return (
                    <div key={`${group.id}-${gi}`} className="border border-accent-blue/30 bg-accent-blue/5 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText size={13} className="text-accent-blue" />
                        <p className="font-mono text-[9px] uppercase tracking-widest text-accent-blue">Documento de Allanamiento</p>
                      </div>
                      <p className="text-xs text-tx-secondary mb-3">{group.msgs[0].contenido}</p>
                      {group.msgs[0].htmlSnapshot && (
                        <a href={group.msgs[0].htmlSnapshot} target="_blank" rel="noreferrer" className="block border border-bg-border hover:opacity-90 transition-opacity overflow-hidden">
                          <img src={group.msgs[0].htmlSnapshot} alt="Vista previa" className="w-full max-h-56 object-cover" />
                        </a>
                      )}
                      <p className="font-mono text-[8px] text-tx-dim mt-2">{new Date(group.fecha).toLocaleString('es')}</p>
                    </div>
                  )
                }
                // Evidence / informe de hallazgo
                if (group.tipo === 'informe') {
                  const imgUrl = extractImageUrl(group.msgs[0].contenido)
                  return (
                    <div key={`${group.id}-${gi}`} className="border border-cyan-800/50 bg-cyan-900/8 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Camera size={13} className="text-cyan-400" />
                        <p className="font-mono text-[9px] uppercase tracking-widest text-cyan-400">Informe de Hallazgo</p>
                      </div>
                      <p className="text-xs text-tx-primary whitespace-pre-wrap leading-relaxed mb-2">{group.msgs[0].contenido}</p>
                      {imgUrl && (
                        <a href={imgUrl} target="_blank" rel="noreferrer" className="block border border-cyan-800/40 mt-2 overflow-hidden hover:opacity-90 transition-opacity">
                          <img src={imgUrl} alt="Evidencia" className="w-full max-h-72 object-contain bg-black/30" />
                          <div className="px-2 py-1 bg-cyan-900/20 border-t border-cyan-800/30">
                            <p className="font-mono text-[8px] text-cyan-600">🔍 Click para ampliar</p>
                          </div>
                        </a>
                      )}
                      <p className="font-mono text-[8px] text-tx-dim mt-2">{group.msgs[0].nombre} · {new Date(group.fecha).toLocaleString('es')}</p>
                    </div>
                  )
                }
                // Regular chat message group
                const isOwn = group.autor === user?.username
                const accentCol = ({ command_staff: '#ef4444', supervisory: '#1B6FFF', federal_agent: '#2ECC71', visitante: '#8799AE' } as any)[group.rol] || '#8799AE'
                return (
                  <div key={`${group.id}-${gi}`} className="flex gap-2.5 group">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0 mt-0.5 font-display text-[11px] font-bold uppercase border"
                      style={{ backgroundColor: `${accentCol}15`, borderColor: `${accentCol}35`, color: accentCol }}>
                      {group.nombre?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="font-display text-[11px] font-semibold tracking-wider uppercase" style={{ color: accentCol }}>{group.nombre}</span>
                        {group.callsign && <span className="font-mono text-[8px] text-tx-dim border border-bg-border px-1">[{group.callsign}]</span>}
                        <span className="font-mono text-[8px] text-tx-dim opacity-0 group-hover:opacity-100 transition-opacity">
                          {new Date(group.fecha).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {group.msgs.map((m: any) => (
                          <p key={m.id} className="text-sm text-tx-secondary leading-relaxed break-words">{m.contenido}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {canChat && (
              <div className="px-4 py-3 border-t border-bg-border shrink-0 flex flex-col gap-3 bg-bg-card">
                {/* Regular message */}
                <form onSubmit={enviarMensajeChat} className="flex gap-2">
                  <input className="input flex-1 text-sm py-2.5" value={mensaje} onChange={e => setMensaje(e.target.value)} placeholder="Escribe un mensaje..." disabled={sending} />
                  <button type="submit" disabled={sending || !mensaje.trim()} className="btn-primary py-2 px-3 disabled:opacity-30"><Send size={13} /></button>
                </form>
                {/* Evidence report */}
                <form onSubmit={enviarReporteHallazgo} className="border border-cyan-800/30 bg-cyan-900/5 p-3 flex flex-col gap-2">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                    <Camera size={10} /> Informe de captura / hallazgo
                  </p>
                  <input className="input text-xs py-2" value={hallazgo} onChange={e => setHallazgo(e.target.value)} placeholder="¿Qué se encontró? (armas, dinero, documentos...)" disabled={sending} />
                  <input className="input text-xs py-2" value={propiedad} onChange={e => setPropiedad(e.target.value)} placeholder="Propiedad o ubicación asociada" disabled={sending} />
                  <div className="flex gap-2 items-center">
                    <input className="input text-xs py-2 flex-1" value={evidenciaUrl} onChange={e => setEvidenciaUrl(e.target.value)} placeholder="URL de evidencia fotográfica (opcional)" disabled={sending} />
                    <button type="submit" disabled={sending || !hallazgo.trim() || !propiedad.trim()} className="btn-ghost py-2 px-3 text-[10px] whitespace-nowrap disabled:opacity-30">
                      Registrar
                    </button>
                  </div>
                  {evidenciaUrl && extractImageUrl(evidenciaUrl) && (
                    <div className="border border-cyan-800/30 overflow-hidden">
                      <img src={extractImageUrl(evidenciaUrl)} alt="Preview" className="w-full max-h-32 object-contain bg-black/20" onError={e => (e.target as any).style.display = 'none'} />
                    </div>
                  )}
                </form>
              </div>
            )}
            {!canChat && (
              <div className="px-4 py-3 border-t border-bg-border bg-bg-card">
                <p className="font-mono text-[9px] text-tx-muted text-center uppercase">Solo puedes leer este chat</p>
              </div>
            )}
          </div>
        )}

        {/* ── PDF TAB ──────────────────────────────────────────── */}
        {tab === 'pdf' && (
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
            <div className="card p-5">
              <p className="section-tag mb-1">// Documento Oficial</p>
              <p className="font-display text-sm font-semibold uppercase tracking-wider text-tx-primary mb-3">Descargar PDF</p>
              <p className="text-xs text-tx-secondary mb-4 leading-relaxed">Incluye todos los datos de la solicitud, observaciones y las firmas registradas.</p>
              <button onClick={descargarPDF} disabled={sending} className="btn-primary"><FileText size={12} />Descargar PDF oficial</button>
            </div>
            {isSuperv && !yafirmo && item.estado !== 'denegado' && (
              <div className="card p-5">
                <p className="section-tag mb-1">// Firma Digital</p>
                <p className="font-display text-sm font-semibold uppercase tracking-wider text-tx-primary mb-3">Firmar Documento</p>
                <p className="text-xs text-tx-secondary mb-4">Tu firma quedará registrada y aparecerá en el PDF oficial.</p>
                <button onClick={() => doAction('firmar', { tipoFirma: 'supervisor' })} disabled={sending} className="btn-success">
                  <PenTool size={12} />Firmar como {user?.rol?.replace('_', ' ')}
                </button>
              </div>
            )}
            {yafirmo && (
              <div className="card p-4 border-green-800/40 bg-green-900/10">
                <p className="font-mono text-xs text-green-400 flex items-center gap-2"><CheckCircle size={13} /> Ya has firmado este documento</p>
              </div>
            )}
            {!isSuperv && (
              <div className="card p-4">
                <p className="font-mono text-xs text-tx-muted">Las firmas solo pueden ser realizadas por Supervisory y Command Staff.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AllanamientosPage() {
  const [user, setUser] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [viewId, setViewId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [filtro, setFiltro] = useState('activos')

  useEffect(() => {
    setUser(getStoredUser())
    return subscribeStoredUser(setUser)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p: any = {}
      if (filtro && filtro !== 'activos' && filtro !== 'todos') p.estado = filtro
      if (filtro === 'todos') p.includeFinalizados = '1'
      setItems(await getAllanamientos(p) || [])
    } catch { }
    finally { setLoading(false) }
  }, [filtro])

  useEffect(() => { load() }, [load])
  const notify = (msg: string, ok = true) => { setToast({ msg, ok }); load() }
  const pendientes = items.filter(i => i.estado === 'pendiente').length

  return (
    <div className="max-w-5xl mx-auto">
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}
      {showCreate && <ModalCrear onClose={() => setShowCreate(false)} onSuccess={m => notify(m)} />}
      {viewId && <ModalAllanamiento itemId={viewId} user={user} onClose={() => setViewId(null)} onAction={m => notify(m)} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="page-header mb-0">
          <span className="section-tag">// Allanamientos</span>
          <h1 className="font-display text-xl font-semibold tracking-wider uppercase text-tx-primary mt-0.5 flex items-center gap-3">
            Solicitudes
            {pendientes > 0 && (
              <span className="font-mono text-[9px] bg-yellow-900/30 border border-yellow-700 text-yellow-400 px-2 py-0.5 flex items-center gap-1">
                <Clock size={9} /> {pendientes} pendiente{pendientes > 1 ? 's' : ''}
              </span>
            )}
          </h1>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost py-2 px-3" title="Actualizar"><RefreshCw size={12} className={loading ? 'animate-spin' : ''} /></button>
          <button onClick={() => setShowCreate(true)} className="btn-primary py-2"><Plus size={12} />Nueva Solicitud</button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        <select className="input py-2 text-xs w-auto" value={filtro} onChange={e => setFiltro(e.target.value)}>
          <option value="activos">Activos (pendiente / autorizado)</option>
          <option value="todos">Todos los estados</option>
          {['pendiente', 'autorizado', 'denegado', 'ejecutado'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading
        ? <div className="text-center py-12 font-mono text-xs text-tx-muted">Cargando…</div>
        : items.length === 0
          ? (
            <div className="card p-14 flex flex-col items-center gap-3 text-tx-muted">
              <Shield size={28} className="opacity-20" />
              <p className="font-mono text-xs tracking-widest uppercase">Sin solicitudes</p>
            </div>
          )
          : (
            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-bg-border bg-bg-surface">
                    {['N°', 'Dirección', 'Sospechoso', 'Estado', 'Unidad', 'Solicitante', 'Firmas', 'Fecha', ''].map(h => (
                      <th key={h} className="table-head whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(a => (
                    <tr key={a.id} className="table-row cursor-pointer" onClick={() => setViewId(a.id)}>
                      <td className="table-cell font-mono text-[9px] text-accent-blue">{a.numeroSolicitud}</td>
                      <td className="table-cell text-xs text-tx-primary max-w-36 truncate">{a.direccion}</td>
                      <td className="table-cell text-xs text-tx-secondary max-w-24 truncate">{a.sospechoso || '—'}</td>
                      <td className="table-cell"><EstadoBadge estado={a.estado} /></td>
                      <td className="table-cell text-xs text-tx-muted">{a.unidad}</td>
                      <td className="table-cell text-xs text-tx-secondary">{a.nombreSolicitante}{a.callsignSolicitante && ` [${a.callsignSolicitante}]`}</td>
                      <td className="table-cell font-mono text-[9px] text-tx-muted text-center">{a.firmas?.length || 0}</td>
                      <td className="table-cell font-mono text-[9px] text-tx-muted whitespace-nowrap">{new Date(a.fechaSolicitud).toLocaleDateString('es')}</td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-tx-dim">›</span>
                          {user?.rol === 'command_staff' && (
                            <button className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-all"
                              onClick={async e => {
                                e.stopPropagation()
                                if (!await uiConfirm(`¿Eliminar ${a.numeroSolicitud}?`, { tone: 'danger', title: 'Eliminar solicitud' })) return
                                try { await borrarAllanamiento(a.id); notify('Solicitud eliminada') }
                                catch (err: any) { notify(err.message || 'No se pudo eliminar', false) }
                              }}
                              title="Eliminar solicitud">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      }
    </div>
  )
}
