'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, RefreshCw, X, CheckCircle, AlertCircle, Send, FileText, Check, XCircle, PenTool, Trash2, Pencil } from 'lucide-react'
import { getAllanamientos, crearAllanamiento, editarAllanamiento, getAllanamiento, getStoredUser, borrarAllanamiento, subscribeStoredUser } from '@/lib/client'
import { uiAlert, uiConfirm, uiPrompt } from '@/lib/ui-dialog'

const ESTADO_TAG: Record<string,string> = {
  pendiente:  'tag border-yellow-700 bg-yellow-900/20 text-yellow-400',
  autorizado: 'tag border-green-700 bg-green-900/20 text-green-400',
  denegado:   'tag border-red-700 bg-red-900/20 text-red-400',
  ejecutado:  'tag border-blue-700 bg-blue-900/20 text-blue-400',
}

function Toast({ msg, ok, onClose }: { msg:string;ok:boolean;onClose:()=>void }) {
  useEffect(()=>{ const t=setTimeout(onClose,3500);return()=>clearTimeout(t) },[])
  return (
    <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-2 px-4 py-3 border font-mono text-xs ${ok?'bg-green-900/40 border-green-700 text-green-300':'bg-red-900/40 border-red-700 text-red-300'}`}>
      {ok?<CheckCircle size={13}/>:<AlertCircle size={13}/>}{msg}
    </div>
  )
}

function ModalCrear({ onClose, onSuccess }: { onClose:()=>void;onSuccess:(m:string)=>void }) {
  const [form, setForm] = useState({ direccion:'', motivacion:'', descripcion:'', sospechoso:'', unidad:'General' })
  const [loading, setLoading] = useState(false); const [error, setError] = useState('')
  const set = (k:keyof typeof form) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => setForm(p=>({...p,[k]:e.target.value}))
  async function submit(e:React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try { await crearAllanamiento(form); onSuccess('Solicitud enviada'); onClose() }
    catch(err:any) { setError(err.message) } finally { setLoading(false) }
  }
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal w-full max-w-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-bg-border">
          <div><span className="section-tag">// Nueva Solicitud</span><p className="font-display text-sm font-semibold tracking-wider uppercase text-tx-primary mt-0.5">Solicitud de Allanamiento</p></div>
          <button onClick={onClose} className="text-tx-muted hover:text-tx-primary"><X size={15}/></button>
        </div>
        <form onSubmit={submit} className="p-5 flex flex-col gap-3.5">
          <div><label className="label">Dirección / Ubicación *</label><input className="input" value={form.direccion} onChange={set('direccion')} placeholder="Calle 5 #23, Zona Industrial" required/></div>
          <div><label className="label">Sospechoso(s)</label><input className="input" value={form.sospechoso} onChange={set('sospechoso')} placeholder="Nombre o descripción"/></div>
          <div><label className="label">Motivación / Justificación Legal *</label>
            <textarea className="input min-h-24 resize-none text-xs" value={form.motivacion} onChange={set('motivacion')} placeholder="Fundamento legal y evidencias que justifican el allanamiento..." required/>
          </div>
          <div><label className="label">Descripción del operativo</label>
            <textarea className="input min-h-16 resize-none text-xs" value={form.descripcion} onChange={set('descripcion')} placeholder="Detalles adicionales..."/>
          </div>
          <div><label className="label">Unidad</label>
            <select className="input text-xs py-2" value={form.unidad} onChange={set('unidad')}>
              {['General','CIRG','ERT','RRHH','SOG','VCTF'].map(u=><option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          {error && <p className="font-mono text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">{loading?'Enviando...':'Enviar Solicitud'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalAllanamiento({ itemId, user, onClose, onAction }: { itemId:string;user:any;onClose:()=>void;onAction:(m:string)=>void }) {
  const [item,    setItem]    = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mensaje, setMensaje] = useState('')
  const [motivo,  setMotivo]  = useState('')
  const [sending, setSending] = useState(false)
  const [hallazgo, setHallazgo] = useState('')
  const [propiedad, setPropiedad] = useState('')
  const [evidenciaUrl, setEvidenciaUrl] = useState('')
  const [tab,     setTab]     = useState<'info'|'chat'|'pdf'>('info')
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const atBottomRef = useRef(true)
  const isSuperv = ['command_staff','supervisory'].includes(user?.rol)
  const isCS = user?.rol === 'command_staff'
  const [editForm, setEditForm] = useState({
    numeroSolicitud: '',
    direccion: '',
    sospechoso: '',
    unidad: 'General',
    motivacion: '',
    descripcion: '',
    observaciones: '',
  })

  function extractImageUrl(raw: string) {
    const match = String(raw || '').match(/https?:\/\/[^\s]+\.(?:png|jpg|jpeg|webp|gif)(?:\?[^\s]*)?/i)
    return match ? match[0] : ''
  }

  const load = useCallback(async()=>{
    try {
      const d = await getAllanamiento(itemId)
      setItem(d)
      setEditForm({
        numeroSolicitud: d?.numeroSolicitud || '',
        direccion: d?.direccion || '',
        sospechoso: d?.sospechoso || '',
        unidad: d?.unidad || 'General',
        motivacion: d?.motivacion || '',
        descripcion: d?.descripcion || '',
        observaciones: d?.observaciones || '',
      })
    } catch {}
    finally { setLoading(false) }
  },[itemId])
  useEffect(()=>{ load() },[load])

  // Smart scroll: only auto-scroll if user is pinned to bottom
  useEffect(()=>{
    if (atBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  },[item?.mensajes])

  function onChatScroll() {
    const el = scrollRef.current
    if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  async function doAction(accion:string,extra?:any) {
    setSending(true)
    try { await editarAllanamiento(itemId,{accion,motivo,...extra}); await load(); onAction(`Acción: ${accion}`) }
    catch(e:any) { uiAlert(e?.message || 'No se pudo ejecutar la acción', 'Allanamientos') } finally { setSending(false) }
  }

  async function enviarMensaje(e:React.FormEvent) {
    e.preventDefault(); if (!mensaje.trim()) return; setSending(true)
    try { await editarAllanamiento(itemId,{mensaje:mensaje.trim()}); setMensaje(''); await load() }
    catch(e:any) { uiAlert(e?.message || 'No se pudo enviar el mensaje', 'Allanamientos') } finally { setSending(false) }
  }

  async function enviarReporteHallazgo(e: React.FormEvent) {
    e.preventDefault()
    if (!hallazgo.trim() || !propiedad.trim()) return
    setSending(true)
    try {
      await editarAllanamiento(itemId, {
        accion: 'reporte_hallazgo',
        hallazgo: hallazgo.trim(),
        propiedad: propiedad.trim(),
        evidenciaUrl: evidenciaUrl.trim(),
      })
      setHallazgo('')
      setPropiedad('')
      setEvidenciaUrl('')
      await load()
      onAction('Informe de hallazgo registrado')
    } catch (e: any) {
      uiAlert(e?.message || 'No se pudo registrar el informe', 'Allanamientos')
    } finally {
      setSending(false)
    }
  }

  async function descargarPDF() {
    if (!item) return
    setSending(true)
    try {
      const response = await fetch(`/api/allanamientos/${itemId}/download-pdf`)
      if (!response.ok) throw new Error('Error downloading PDF')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `allanamiento-${item.numeroSolicitud.replace(/[^a-zA-Z0-9-]/g, '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      onAction('PDF descargado')
    } catch (e: any) {
      uiAlert(e?.message || 'No se pudo descargar el PDF', 'Descarga PDF')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="modal-overlay"><div className="modal p-8 text-center font-mono text-xs text-tx-muted">Cargando...</div></div>
  if (!item) return null

  const canChat = isSuperv || (item.solicitadoPor===user?.username && item.estado==='pendiente')
  const yafirmo = item.firmas?.some((f:any)=>f.username===user?.username)

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-bg-card border border-bg-border w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-bg-border bg-bg-surface shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-mono text-[9px] text-accent-blue">{item.numeroSolicitud}</span>
                <span className={ESTADO_TAG[item.estado]||''}>{item.estado}</span>
                <span className="font-mono text-[8px] text-tx-muted">{item.unidad}</span>
              </div>
              <p className="font-display text-sm font-semibold tracking-wider uppercase text-tx-primary leading-tight">{item.direccion}</p>
              <p className="font-mono text-[8px] text-tx-muted mt-0.5">
                {item.nombreSolicitante}{item.callsignSolicitante&&` [${item.callsignSolicitante}]`} · {new Date(item.fechaSolicitud).toLocaleDateString('es')}
              </p>
            </div>
            <button onClick={onClose} className="text-tx-muted hover:text-tx-primary shrink-0"><X size={15}/></button>
          </div>

          {/* Actions */}
          {isSuperv && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {item.estado==='pendiente' && <>
                <button onClick={()=>doAction('autorizar')} disabled={sending} className="btn-success py-1.5 px-3 text-[9px]"><Check size={11}/>Autorizar</button>
                <button
                  onClick={async()=>{
                    const m = await uiPrompt('Motivo de denegación:', { title: 'Denegar solicitud', placeholder: 'Escribe el motivo...' })
                    if (m) doAction('denegar',{motivo:m})
                  }}
                  disabled={sending}
                  className="btn-danger py-1.5 px-3 text-[9px]"
                ><XCircle size={11}/>Denegar</button>
              </>}
              {item.estado==='autorizado' && <button onClick={()=>doAction('ejecutar')} disabled={sending} className="btn-primary py-1.5 px-3 text-[9px]">✅ Ejecutado</button>}
              {isCS && ['autorizado','ejecutado'].includes(item.estado) && (
                <button
                  onClick={async()=>{
                    if (!await uiConfirm('Esto quitara la autorizacion, reiniciara firmas y devolvera el estado a pendiente. ¿Continuar?', { title: 'Quitar autorizacion', tone: 'danger' })) return
                    await doAction('quitar_autorizacion')
                  }}
                  disabled={sending}
                  className="btn-danger py-1.5 px-3 text-[9px]"
                >
                  <XCircle size={11}/>Quitar autorizacion
                </button>
              )}
              {!yafirmo && item.estado!=='denegado' && <button onClick={()=>doAction('firmar',{tipoFirma:'supervisor'})} disabled={sending} className="btn-ghost py-1.5 px-3 text-[9px]"><PenTool size={11}/>Firmar</button>}
            </div>
          )}
          {isCS && (
            <div className="flex gap-2 mt-2 flex-wrap">
              <button
                onClick={async()=>{
                  if (!await uiConfirm('¿Eliminar esta solicitud de allanamiento? Esta acción no se puede deshacer.', { tone: 'danger', title: 'Eliminar solicitud' })) return
                  setSending(true)
                  try {
                    await borrarAllanamiento(itemId)
                    onAction('Solicitud eliminada')
                    onClose()
                  } catch (e:any) {
                    uiAlert(e?.message || 'No se pudo eliminar la solicitud', 'Allanamientos')
                  } finally {
                    setSending(false)
                  }
                }}
                disabled={sending}
                className="btn-danger py-1.5 px-3 text-[9px]"
              >
                <Trash2 size={11}/>Eliminar solicitud
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-bg-border shrink-0">
          {[{id:'info',l:'Información'},{id:'chat',l:`Chat (${item.mensajes?.length||0})`},{id:'pdf',l:'PDF / Firma'}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id as any)} className={`px-4 py-2.5 font-mono text-[9px] tracking-widest uppercase transition-all border-b-2 -mb-px ${tab===t.id?'border-accent-blue text-accent-blue':'border-transparent text-tx-muted hover:text-tx-secondary'}`}>{t.l}</button>
          ))}
        </div>

        {/* INFO */}
        {tab==='info' && (
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
            {isCS && (
              <div className="bg-bg-surface border border-bg-border p-3 flex flex-col gap-2">
                <p className="font-mono text-[8px] text-accent-blue uppercase tracking-widest">Editar solicitud (Command Staff)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="label">N° Solicitud</label>
                    <input className="input text-xs py-2" value={editForm.numeroSolicitud} onChange={e=>setEditForm(p=>({...p, numeroSolicitud:e.target.value}))} />
                  </div>
                  <div>
                    <label className="label">Unidad</label>
                    <input className="input text-xs py-2" value={editForm.unidad} onChange={e=>setEditForm(p=>({...p, unidad:e.target.value}))} />
                  </div>
                </div>
                <div>
                  <label className="label">Dirección</label>
                  <input className="input text-xs py-2" value={editForm.direccion} onChange={e=>setEditForm(p=>({...p, direccion:e.target.value}))} />
                </div>
                <div>
                  <label className="label">Sospechoso</label>
                  <input className="input text-xs py-2" value={editForm.sospechoso} onChange={e=>setEditForm(p=>({...p, sospechoso:e.target.value}))} />
                </div>
                <div>
                  <label className="label">Motivación</label>
                  <textarea className="input min-h-20 resize-none text-xs" value={editForm.motivacion} onChange={e=>setEditForm(p=>({...p, motivacion:e.target.value}))} />
                </div>
                <div>
                  <label className="label">Descripción</label>
                  <textarea className="input min-h-16 resize-none text-xs" value={editForm.descripcion} onChange={e=>setEditForm(p=>({...p, descripcion:e.target.value}))} />
                </div>
                <div>
                  <label className="label">Observaciones</label>
                  <textarea className="input min-h-16 resize-none text-xs" value={editForm.observaciones} onChange={e=>setEditForm(p=>({...p, observaciones:e.target.value}))} />
                </div>
                <button
                  onClick={async()=>{
                    setSending(true)
                    try {
                      await editarAllanamiento(itemId, { accion:'editar', ...editForm })
                      await load()
                      onAction('Solicitud actualizada')
                    } catch (e:any) {
                      uiAlert(e?.message || 'No se pudo actualizar la solicitud', 'Allanamientos')
                    } finally {
                      setSending(false)
                    }
                  }}
                  disabled={sending}
                  className="btn-primary w-fit py-2 px-3 text-[10px]"
                >
                  <Pencil size={12}/>Guardar cambios
                </button>
              </div>
            )}
            {[['Sospechoso',item.sospechoso||'—'],['Unidad',item.unidad],['Solicitante',`${item.nombreSolicitante}${item.callsignSolicitante?` [${item.callsignSolicitante}]`:''}`]].map(([k,v])=>(
              <div key={k} className="bg-bg-surface border border-bg-border p-3">
                <p className="font-mono text-[8px] text-tx-muted uppercase mb-0.5">{k}</p>
                <p className="text-xs text-tx-primary">{v}</p>
              </div>
            ))}
            <div className="bg-bg-surface border border-bg-border p-3">
              <p className="font-mono text-[8px] text-tx-muted uppercase mb-1">Motivación</p>
              <p className="text-xs text-tx-primary leading-relaxed whitespace-pre-wrap">{item.motivacion}</p>
            </div>
            {item.descripcion && <div className="bg-bg-surface border border-bg-border p-3"><p className="font-mono text-[8px] text-tx-muted uppercase mb-1">Descripción</p><p className="text-xs text-tx-secondary">{item.descripcion}</p></div>}
            {item.motivoDenegacion && <div className="bg-red-900/10 border border-red-800/40 p-3"><p className="font-mono text-[8px] text-red-500 uppercase mb-1">Motivo de Denegación</p><p className="text-xs text-red-400">{item.motivoDenegacion}</p></div>}
            {item.firmas?.length>0 && (
              <div className="bg-green-900/10 border border-green-800/40 p-3">
                <p className="font-mono text-[8px] text-green-500 uppercase mb-2">Firmas</p>
                {item.firmas.map((f:any,i:number)=>(
                  <div key={i} className="flex items-center gap-2 py-1 border-b border-green-900/20 last:border-0">
                    <PenTool size={10} className="text-green-400 shrink-0"/>
                    <span className="text-xs text-green-300">{f.nombre}{f.callsign&&` [${f.callsign}]`}</span>
                    <span className="font-mono text-[8px] text-green-600 ml-auto">{f.rol.replace('_',' ')} · {new Date(f.fecha).toLocaleDateString('es')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CHAT */}
        {tab==='chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div ref={scrollRef} onScroll={onChatScroll} className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {item.mensajes?.map((m:any)=>(
                <div key={m.id} className={`${m.tipo==='sistema'||m.tipo==='accion'||m.tipo==='documento'?'flex justify-center':'flex gap-2.5'}`}>
                  {m.tipo==='sistema'||m.tipo==='accion' ? (
                    <div className="font-mono text-[8px] text-tx-muted italic py-0.5 px-3 bg-bg-surface border border-bg-border flex items-center gap-2">
                      <span>{m.contenido}</span>
                    </div>
                  ) : m.tipo === 'documento' ? (
                    <div className="w-full border border-accent-blue/40 bg-accent-blue/10 p-3">
                      <p className="font-mono text-[8px] uppercase tracking-widest text-accent-blue mb-1">Documento de Allanamiento</p>
                      <p className="text-xs text-tx-secondary mb-2">{m.contenido}</p>
                      {m.htmlSnapshot && (
                        <a href={m.htmlSnapshot} target="_blank" rel="noreferrer" className="block border border-bg-border hover:opacity-90 transition-opacity">
                          <img src={m.htmlSnapshot} alt="Vista previa del allanamiento" className="w-full max-h-72 object-cover" />
                        </a>
                      )}
                      <p className="font-mono text-[8px] text-tx-muted mt-2">{new Date(m.fecha).toLocaleString('es')}</p>
                    </div>
                  ) : m.tipo === 'informe' ? (
                    <div className="w-full border border-cyan-800/50 bg-cyan-900/10 p-3">
                      <p className="font-mono text-[8px] uppercase tracking-widest text-cyan-400 mb-1">Informe de Hallazgo</p>
                      <p className="text-xs text-tx-primary whitespace-pre-wrap">{m.contenido}</p>
                      {extractImageUrl(m.contenido) && (
                        <a href={extractImageUrl(m.contenido)} target="_blank" rel="noreferrer" className="block border border-cyan-800/30 mt-2">
                          <img src={extractImageUrl(m.contenido)} alt="Evidencia" className="w-full max-h-72 object-contain bg-black/20" />
                        </a>
                      )}
                      <p className="font-mono text-[8px] text-tx-muted mt-2">{m.nombre} · {new Date(m.fecha).toLocaleString('es')}</p>
                    </div>
                  ) : (
                    <>
                      <div className={`w-7 h-7 flex items-center justify-center shrink-0 ${m.autor===user?.username?'bg-accent-blue/20 border-accent-blue/30':'bg-bg-surface border-bg-border'} border`}>
                        <span className="font-display text-[9px] font-bold uppercase text-tx-secondary">{m.nombre?.[0]}</span>
                      </div>
                      <div className={`flex-1 min-w-0 ${m.autor===user?.username?'items-end flex flex-col':''}`}>
                        <div className={`flex items-baseline gap-2 mb-0.5 ${m.autor===user?.username?'flex-row-reverse':''}`}>
                          <span className="font-display text-xs font-semibold tracking-wider uppercase text-tx-primary">{m.nombre}</span>
                          <span className="font-mono text-[7px] text-tx-muted">{new Date(m.fecha).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})}</span>
                        </div>
                        <div className={`p-2.5 border text-sm text-tx-primary max-w-[80%] ${m.autor===user?.username?'bg-accent-blue/10 border-accent-blue/30':'bg-bg-surface border-bg-border'}`}>
                          {m.contenido}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
              <div ref={bottomRef}/>
            </div>
            {canChat && (
              <div className="px-4 py-3 border-t border-bg-border shrink-0 flex flex-col gap-3">
                <form onSubmit={enviarMensaje} className="flex gap-2">
                  <input className="input flex-1 text-sm py-2" value={mensaje} onChange={e=>setMensaje(e.target.value)} placeholder="Escribe un mensaje..." disabled={sending}/>
                  <button type="submit" disabled={sending||!mensaje.trim()} className="btn-primary py-2 px-3 disabled:opacity-30"><Send size={13}/></button>
                </form>

                <form onSubmit={enviarReporteHallazgo} className="border border-bg-border bg-bg-surface p-3 flex flex-col gap-2">
                  <p className="font-mono text-[8px] uppercase tracking-widest text-accent-cyan">Informe de captura / hallazgo</p>
                  <input className="input text-xs py-2" value={hallazgo} onChange={e=>setHallazgo(e.target.value)} placeholder="Que se encontro (armas, dinero, documentos...)" disabled={sending} />
                  <input className="input text-xs py-2" value={propiedad} onChange={e=>setPropiedad(e.target.value)} placeholder="Propiedad o ubicacion asociada" disabled={sending} />
                  <input className="input text-xs py-2" value={evidenciaUrl} onChange={e=>setEvidenciaUrl(e.target.value)} placeholder="URL evidencia (Imgur o PNG/JPG)" disabled={sending} />
                  <button type="submit" disabled={sending || !hallazgo.trim() || !propiedad.trim()} className="btn-ghost py-2 text-[10px]">Registrar informe</button>
                </form>
              </div>
            )}
            {!canChat && (
              <div className="px-4 py-3 border-t border-bg-border">
                <p className="font-mono text-[9px] text-tx-muted text-center uppercase">Solo puedes leer este chat</p>
              </div>
            )}
          </div>
        )}

        {/* PDF */}
        {tab==='pdf' && (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="card p-5 mb-4">
              <p className="section-tag mb-3">// Descargar Documento Oficial</p>
              <p className="text-xs text-tx-secondary mb-4 leading-relaxed">Descarga el PDF oficial que incluye todos los datos de la solicitud, observaciones y las firmas registradas de Supervisory / Command Staff.</p>
              <button onClick={descargarPDF} disabled={sending} className="btn-primary"><FileText size={12}/>Descargar PDF</button>
            </div>
            {isSuperv && !yafirmo && item.estado!=='denegado' && (
              <div className="card p-5">
                <p className="section-tag mb-3">// Firmar Documento</p>
                <p className="text-xs text-tx-secondary mb-4">Tu firma quedará registrada y aparecerá en el PDF.</p>
                <button onClick={()=>doAction('firmar',{tipoFirma:'supervisor'})} disabled={sending} className="btn-success">
                  <PenTool size={12}/>Firmar como {user?.rol?.replace('_',' ')}
                </button>
              </div>
            )}
            {yafirmo && (
              <div className="card p-4 border-green-800/40 bg-green-900/10">
                <p className="font-mono text-xs text-green-400">✅ Ya has firmado este documento.</p>
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
  const [user,    setUser]    = useState<any>(null)
  const [items,   setItems]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [viewId,     setViewId]     = useState<string|null>(null)
  const [toast,   setToast]   = useState<{msg:string;ok:boolean}|null>(null)
  const [filtro,  setFiltro]  = useState('activos')

  useEffect(() => {
    setUser(getStoredUser())
    return subscribeStoredUser(setUser)
  }, [])
  const load = useCallback(async()=>{
    setLoading(true)
    try {
      const p:any = {}
      if (filtro && filtro !== 'activos' && filtro !== 'todos') p.estado = filtro
      if (filtro === 'todos') p.includeFinalizados = '1'
      setItems(await getAllanamientos(p) || [])
    } catch {}
    finally { setLoading(false) }
  },[filtro])
  useEffect(()=>{ load() },[load])
  const notify = (msg:string,ok=true) => { setToast({msg,ok}); load() }
  const pendientes = items.filter(i=>i.estado==='pendiente').length

  return (
    <div className="max-w-5xl mx-auto">
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={()=>setToast(null)}/>}
      {showCreate && <ModalCrear onClose={()=>setShowCreate(false)} onSuccess={m=>notify(m)}/>}
      {viewId     && <ModalAllanamiento itemId={viewId} user={user} onClose={()=>setViewId(null)} onAction={m=>notify(m)}/>}

      <div className="flex items-center justify-between mb-5">
        <div className="page-header mb-0">
          <span className="section-tag">// Allanamientos</span>
          <h1 className="font-display text-xl font-semibold tracking-wider uppercase text-tx-primary mt-0.5">
            Solicitudes{pendientes>0&&<span className="ml-2 font-mono text-[9px] bg-yellow-900/30 border border-yellow-700 text-yellow-400 px-2 py-0.5">{pendientes} pendiente{pendientes>1?'s':''}</span>}
          </h1>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost py-2 px-3"><RefreshCw size={12} className={loading?'animate-spin':''}/></button>
          <button onClick={()=>setShowCreate(true)} className="btn-primary py-2"><Plus size={12}/>Nueva Solicitud</button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <select className="input py-2 text-xs w-auto" value={filtro} onChange={e=>setFiltro(e.target.value)}>
          <option value="activos">Activos (pendiente/autorizado)</option>
          <option value="todos">Todos los estados</option>
          {['pendiente','autorizado','denegado','ejecutado'].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <div className="text-center py-12 font-mono text-xs text-tx-muted">Cargando...</div>
      : items.length===0 ? <div className="card p-14 flex flex-col items-center gap-3 text-tx-muted"><p className="font-mono text-xs tracking-widest uppercase">Sin solicitudes</p></div>
      : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-bg-border">
              {['N°','Dirección','Sospechoso','Estado','Unidad','Solicitante','Firmas','Fecha',''].map(h=><th key={h} className="table-head whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {items.map(a=>(
                <tr key={a.id} className="table-row cursor-pointer" onClick={()=>setViewId(a.id)}>
                  <td className="table-cell font-mono text-[9px] text-accent-blue">{a.numeroSolicitud}</td>
                  <td className="table-cell text-xs text-tx-primary max-w-36 truncate">{a.direccion}</td>
                  <td className="table-cell text-xs text-tx-secondary max-w-24 truncate">{a.sospechoso||'—'}</td>
                  <td className="table-cell"><span className={ESTADO_TAG[a.estado]||''}>{a.estado}</span></td>
                  <td className="table-cell text-xs text-tx-muted">{a.unidad}</td>
                  <td className="table-cell text-xs text-tx-secondary">{a.nombreSolicitante}{a.callsignSolicitante&&` [${a.callsignSolicitante}]`}</td>
                  <td className="table-cell font-mono text-[9px] text-tx-muted">{a.firmas?.length||0}</td>
                  <td className="table-cell font-mono text-[9px] text-tx-muted whitespace-nowrap">{new Date(a.fechaSolicitud).toLocaleDateString('es')}</td>
                  <td className="table-cell text-tx-muted">
                    <div className="flex items-center justify-end gap-2">
                      <span>›</span>
                      {user?.rol === 'command_staff' && (
                        <button
                          className="text-red-400 hover:text-red-300"
                          onClick={async (e)=>{
                            e.stopPropagation()
                            if (!await uiConfirm(`¿Eliminar ${a.numeroSolicitud}?`, { tone: 'danger', title: 'Eliminar solicitud' })) return
                            try {
                              await borrarAllanamiento(a.id)
                              notify('Solicitud eliminada')
                            } catch (err:any) {
                              notify(err.message || 'No se pudo eliminar', false)
                            }
                          }}
                          title="Eliminar solicitud"
                        >
                          <Trash2 size={12}/>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
