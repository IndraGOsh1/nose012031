'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Plus, RefreshCw, X, CheckCircle, AlertCircle, Send,
  FileText, Check, XCircle, PenTool, Trash2, Pencil,
  Image as ImageIcon, ExternalLink, Camera, Shield, Link2
} from 'lucide-react'
import {
  getAllanamientos, crearAllanamiento, editarAllanamiento,
  getAllanamiento, getStoredUser, borrarAllanamiento,
  subscribeStoredUser, getCasos
} from '@/lib/client'
import { uiAlert, uiConfirm, uiPrompt } from '@/lib/ui-dialog'
import '../carpeta/carpeta.css'

/* ── Helpers ──────────────────────────────────────────────────── */
function normalizeImgUrl(raw: string) {
  const s = String(raw || '').trim()
  const d = s.match(/^https?:\/\/i\.imgur\.com\/([a-zA-Z0-9]+)(\.(png|jpg|jpeg|webp|gif))?(\?.*)?$/i)
  if (d) return `https://i.imgur.com/${d[1]}.${d[3] || 'png'}`
  const p = s.match(/^https?:\/\/(?:www\.)?imgur\.com\/(?:gallery\/|a\/)?([a-zA-Z0-9]+)(\?.*)?$/i)
  if (p) return `https://i.imgur.com/${p[1]}.png`
  return s
}
function isImgUrl(raw: string) {
  const s = normalizeImgUrl(String(raw || '').trim())
  return /^https?:\/\//i.test(s) && /(imgur\.com|\.(png|jpg|jpeg|webp|gif)(\?.*)?)$/i.test(s)
}
function extractImgFromText(text: string) {
  const m = String(text || '').match(/https?:\/\/[^\s]+\.(?:png|jpg|jpeg|webp|gif)(?:\?[^\s]*)?/i)
    || String(text || '').match(/https?:\/\/(?:i\.)?imgur\.com\/[^\s]+/i)
  return m ? m[0] : ''
}
// UTC clock synced
function useUtcClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }) + ' UTC')
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return time
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtDT(iso: string) {
  return new Date(iso).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const ESTADO_STYLE: Record<string, string> = {
  pendiente:  'fib-rb-pendiente',
  autorizado: 'fib-rb-activo',
  denegado:   'fib-rb-allanamiento',
  ejecutado:  'fib-rb-caso',
}

function Toast({ msg, ok, onClose }: { msg: string; ok: boolean; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [])
  return (
    <div className={`fixed bottom-5 right-5 z-[200] flex items-center gap-2 px-4 py-3 border font-mono text-xs ${ok ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-red-900/40 border-red-700 text-red-300'}`}>
      {ok ? <CheckCircle size={13} /> : <AlertCircle size={13} />}{msg}
    </div>
  )
}

/* ── ModalCrear ────────────────────────────────────────────────── */
function ModalCrear({ user, onClose, onSuccess }: { user: any; onClose: () => void; onSuccess: (m: string) => void }) {
  const [form, setForm] = useState({ direccion: '', motivacion: '', descripcion: '', sospechoso: '', unidad: 'General', casoVinculado: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [misCasos, setMisCasos] = useState<any[]>([])

  useEffect(() => {
    getCasos().then((d: any) => {
      const list = Array.isArray(d) ? d : []
      // Solo casos donde el usuario es agente asignado o lead
      setMisCasos(list.filter((c: any) =>
        c.agenteLead === user?.username ||
        (c.agentesAsignados || []).includes(user?.username)
      ))
    }).catch(() => {})
  }, [user])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await crearAllanamiento({ ...form, casoVinculado: form.casoVinculado || null })
      onSuccess('Solicitud enviada'); onClose()
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'rgba(8,11,15,0.97)', border: '1px solid rgba(201,168,76,0.25)', maxWidth: 560, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 40px rgba(201,168,76,0.05)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(201,168,76,0.15)', background: 'rgba(5,7,10,0.5)' }}>
          <div>
            <div className="fib-section-label" style={{ margin: 0 }}>// nueva solicitud</div>
            <p className="text-sm font-bold tracking-widest uppercase mt-1" style={{ color: '#E8EEF5', fontFamily: 'Oswald, sans-serif' }}>Solicitud de Allanamiento</p>
          </div>
          <button onClick={onClose} style={{ color: '#6B7F93' }}><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="p-5 flex flex-col gap-3">
          <div>
            <label className="fib-form-label">Dirección / Ubicación *</label>
            <input className="fib-form-ctrl w-full" value={form.direccion} onChange={set('direccion')} placeholder="Calle 5 #23, Zona Industrial" required />
          </div>
          <div>
            <label className="fib-form-label">Sospechoso(s)</label>
            <input className="fib-form-ctrl w-full" value={form.sospechoso} onChange={set('sospechoso')} placeholder="Nombre o descripción" />
          </div>
          <div>
            <label className="fib-form-label">Motivación / Justificación Legal *</label>
            <textarea className="fib-form-ctrl w-full" style={{ minHeight: 88, resize: 'none', fontSize: 12 }} value={form.motivacion} onChange={set('motivacion')} placeholder="Fundamento legal y evidencias que justifican el allanamiento..." required />
          </div>
          <div>
            <label className="fib-form-label">Descripción del operativo</label>
            <textarea className="fib-form-ctrl w-full" style={{ minHeight: 60, resize: 'none', fontSize: 12 }} value={form.descripcion} onChange={set('descripcion')} placeholder="Detalles adicionales..." />
          </div>
          <div className="fib-form-grid">
            <div>
              <label className="fib-form-label">Unidad</label>
              <select className="fib-form-ctrl" value={form.unidad} onChange={set('unidad')}>
                {['General', 'CIRG', 'ERT', 'RRHH', 'SOG', 'VCTF'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="fib-form-label flex items-center gap-1"><Link2 size={9} />Caso Vinculado (propio)</label>
              <select className="fib-form-ctrl" value={form.casoVinculado} onChange={set('casoVinculado')}>
                <option value="">— Sin caso vinculado —</option>
                {misCasos.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.numeroCaso} · {c.titulo?.slice(0, 28)}</option>
                ))}
              </select>
            </div>
          </div>
          {error && <p className="font-mono text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="fib-action-btn flex-1 py-2">Cancelar</button>
            <button type="submit" disabled={loading} className="fib-add-btn flex-1" style={{ borderRadius: 3, fontSize: 11 }}>
              {loading ? 'Enviando...' : 'ENVIAR SOLICITUD'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── ModalAllanamiento ─────────────────────────────────────────── */
function ModalAllanamiento({ itemId, user, onClose, onAction }: { itemId: string; user: any; onClose: () => void; onAction: (m: string) => void }) {
  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mensaje, setMensaje] = useState('')
  const [motivo, setMotivo] = useState('')
  const [sending, setSending] = useState(false)
  const [hallazgo, setHallazgo] = useState('')
  const [propiedad, setPropiedad] = useState('')
  const [evidLinks, setEvidLinks] = useState([''])
  const [tab, setTab] = useState<'info' | 'chat' | 'album' | 'pdf'>('info')
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const atBottomRef = useRef(true)
  const isSuperv = ['command_staff', 'supervisory'].includes(user?.rol)
  const isCS = user?.rol === 'command_staff'

  const [editForm, setEditForm] = useState({
    numeroSolicitud: '', direccion: '', sospechoso: '', unidad: 'General',
    motivacion: '', descripcion: '', observaciones: '',
  })

  const load = useCallback(async () => {
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
    } catch { }
    finally { setLoading(false) }
  }, [itemId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (tab === 'chat' && atBottomRef.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [item?.mensajes, tab])

  function onChatScroll() {
    const el = scrollRef.current
    if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  async function doAction(accion: string, extra?: any) {
    setSending(true)
    try { await editarAllanamiento(itemId, { accion, motivo, ...extra }); await load(); onAction(`Acción: ${accion}`) }
    catch (e: any) { uiAlert(e?.message || 'Error al ejecutar acción', 'Allanamientos') }
    finally { setSending(false) }
  }

  async function enviarMsg(e: React.FormEvent) {
    e.preventDefault(); if (!mensaje.trim()) return; setSending(true)
    try { await editarAllanamiento(itemId, { mensaje: mensaje.trim() }); setMensaje(''); await load() }
    catch (e: any) { uiAlert(e?.message || 'No se pudo enviar', 'Allanamientos') }
    finally { setSending(false) }
  }

  async function registrarHallazgo(e: React.FormEvent) {
    e.preventDefault()
    if (!hallazgo.trim() || !propiedad.trim()) return
    setSending(true)
    const urls = evidLinks.map(normalizeImgUrl).filter(l => /^https?:\/\//i.test(l))
    try {
      await editarAllanamiento(itemId, {
        accion: 'reporte_hallazgo',
        hallazgo: hallazgo.trim(),
        propiedad: propiedad.trim(),
        evidenciaUrl: urls[0] || '',
      })
      // Additional photos to album
      for (const url of urls.slice(1)) {
        await editarAllanamiento(itemId, { addFoto: url })
      }
      setHallazgo(''); setPropiedad(''); setEvidLinks([''])
      await load(); onAction('Hallazgo registrado')
    } catch (e: any) { uiAlert(e?.message || 'Error', 'Allanamientos') }
    finally { setSending(false) }
  }

  async function addFotoToAlbum(urls: string[], descripcion: string) {
    const validUrls = urls.map(u => normalizeImgUrl(u.trim())).filter(u => /^https?:\/\//i.test(u))
    if (validUrls.length === 0) { uiAlert('URL inválida', 'Álbum'); return }
    setSending(true)
    try {
      for (const u of validUrls) {
        await editarAllanamiento(itemId, { addFoto: u, fotoDescripcion: descripcion.trim() || undefined })
      }
      await load(); onAction(`${validUrls.length} foto(s) añadida(s)`)
    }
    catch (e: any) { uiAlert(e?.message || 'Error', 'Álbum') }
    finally { setSending(false) }
  }

  async function descargarPDF() {
    if (!item) return; setSending(true)
    try {
      const res = await fetch(`/api/allanamientos/${itemId}/download-pdf`)
      if (!res.ok) throw new Error('Error descargando PDF')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `allanamiento-${item.numeroSolicitud?.replace(/[^a-zA-Z0-9-]/g, '-')}.pdf`
      document.body.appendChild(a); a.click()
      window.URL.revokeObjectURL(url); document.body.removeChild(a)
      onAction('PDF descargado')
    } catch (e: any) { uiAlert(e?.message || 'Error', 'PDF') }
    finally { setSending(false) }
  }

  if (loading) return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div className="fib-panel-card p-8"><p className="fib-section-label" style={{ margin: 0 }}>cargando expediente...</p></div>
    </div>
  )
  if (!item) return null

  const canChat = isSuperv || (item.solicitadoPor === user?.username && item.estado === 'pendiente')
  const yafirmo = item.firmas?.some((f: any) => f.username === user?.username)
  // Álbum: soporte retrocompatible — string o {url, descripcion, fecha}
  const albumRaw: any[] = item.albumFotos || []
  const album: { url: string; descripcion?: string; fecha?: string }[] = albumRaw.map((e: any) =>
    typeof e === 'string' ? { url: e } : e
  )

  const TABS = [
    { id: 'info' as const,  label: 'Información' },
    { id: 'chat' as const,  label: `Chat (${item.mensajes?.length || 0})` },
    { id: 'album' as const, label: `Álbum (${album.length})` },
    { id: 'pdf' as const,   label: 'PDF / Firma' },
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(5px)' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'rgba(5,7,10,0.97)', border: '1px solid rgba(201,168,76,0.2)', width: '100%', maxWidth: 760, height: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 28px 80px rgba(0,0,0,0.7), 0 0 50px rgba(201,168,76,0.04)' }}>

        {/* Header */}
        <div style={{ borderBottom: '1px solid rgba(201,168,76,0.15)', padding: '14px 20px', background: 'rgba(8,11,15,0.6)', borderLeft: `3px solid ${item.estado === 'autorizado' ? 'var(--fib-green)' : item.estado === 'denegado' ? 'var(--fib-red)' : 'var(--fib-gold)'}` }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-mono text-[10px]" style={{ color: 'var(--fib-gold)', fontFamily: 'Share Tech Mono, monospace' }}>{item.numeroSolicitud}</span>
                <span className={`fib-record-badge ${ESTADO_STYLE[item.estado] || ''}`}>{item.estado}</span>
                <span className="font-mono text-[9px]" style={{ color: 'var(--fib-text4)' }}>{item.unidad}</span>
                {item.casoVinculado && <span className="fib-record-badge fib-rb-caso" style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Link2 size={8} /> CASO VINCULADO</span>}
              </div>
              <p className="text-sm font-bold tracking-wide uppercase" style={{ color: '#E8EEF5', fontFamily: 'Oswald, sans-serif' }}>{item.direccion}</p>
              <p className="font-mono text-[9px] mt-0.5" style={{ color: 'var(--fib-text3)' }}>
                {item.nombreSolicitante}{item.callsignSolicitante && ` [${item.callsignSolicitante}]`} · {fmtDate(item.fechaSolicitud)}
              </p>
            </div>
            <button onClick={onClose} style={{ color: 'var(--fib-text3)' }}><X size={15} /></button>
          </div>

          {/* Supervisor actions */}
          {isSuperv && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {item.estado === 'pendiente' && <>
                <button onClick={() => doAction('autorizar')} disabled={sending} className="fib-add-btn flex items-center gap-1.5" style={{ borderRadius: 3, fontSize: 10 }}><Check size={11} />Autorizar</button>
                <button onClick={async () => { const m = await uiPrompt('Motivo de denegación:', { title: 'Denegar', placeholder: 'Escribe el motivo...' }); if (m) doAction('denegar', { motivo: m }) }} disabled={sending} className="fib-action-btn" style={{ border: '1px solid rgba(192,57,43,0.5)', color: '#FF8B7A' }}><XCircle size={11} /> Denegar</button>
              </>}
              {item.estado === 'autorizado' && <button onClick={() => doAction('ejecutar')} disabled={sending} className="fib-add-btn" style={{ borderRadius: 3, fontSize: 10 }}>✅ Ejecutado</button>}
              {isCS && ['autorizado', 'ejecutado'].includes(item.estado) && (
                <button onClick={async () => { if (!await uiConfirm('¿Quitar autorización y devolver a pendiente?', { title: 'Quitar autorización', tone: 'danger' })) return; doAction('quitar_autorizacion') }} disabled={sending} className="fib-action-btn" style={{ border: '1px solid rgba(192,57,43,0.4)', color: '#FF8B7A' }}><XCircle size={11} /> Quitar autorizacion</button>
              )}
              {!yafirmo && item.estado !== 'denegado' && <button onClick={() => doAction('firmar', { tipoFirma: 'supervisor' })} disabled={sending} className="fib-action-btn"><PenTool size={11} /> Firmar</button>}
            </div>
          )}
          {isCS && (
            <div className="flex gap-2 mt-2">
              <button onClick={async () => { if (!await uiConfirm('¿Eliminar esta solicitud? No se puede deshacer.', { tone: 'danger', title: 'Eliminar' })) return; setSending(true); try { await borrarAllanamiento(itemId); onAction('Solicitud eliminada'); onClose() } catch (e: any) { uiAlert(e?.message || 'Error', 'Allanamientos') } finally { setSending(false) } }} disabled={sending} className="fib-action-btn" style={{ border: '1px solid rgba(192,57,43,0.35)', color: '#FF8B7A' }}><Trash2 size={11} /> Eliminar solicitud</button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--fib-border)', background: 'rgba(8,11,15,0.5)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className="px-4 py-3 font-mono text-[9px] tracking-widest uppercase whitespace-nowrap transition-all"
              style={{ borderBottom: `2px solid ${tab === t.id ? 'var(--fib-gold)' : 'transparent'}`, color: tab === t.id ? 'var(--fib-gold)' : 'var(--fib-text3)', background: tab === t.id ? 'rgba(201,168,76,0.05)' : 'transparent', marginBottom: -1 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>

          {/* INFO */}
          {tab === 'info' && (
            <div style={{ height: '100%', overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {isCS && (
                <div className="fib-panel-card">
                  <div className="fib-panel-card-header">// editar solicitud (command staff)</div>
                  <div className="fib-panel-card-body flex flex-col gap-2">
                    <div className="fib-form-grid">
                      <div><label className="fib-form-label">N° Solicitud</label><input className="fib-form-ctrl" value={editForm.numeroSolicitud} onChange={e => setEditForm(p => ({ ...p, numeroSolicitud: e.target.value }))} /></div>
                      <div><label className="fib-form-label">Unidad</label><input className="fib-form-ctrl" value={editForm.unidad} onChange={e => setEditForm(p => ({ ...p, unidad: e.target.value }))} /></div>
                    </div>
                    <div><label className="fib-form-label">Dirección</label><input className="fib-form-ctrl w-full" value={editForm.direccion} onChange={e => setEditForm(p => ({ ...p, direccion: e.target.value }))} /></div>
                    <div><label className="fib-form-label">Sospechoso</label><input className="fib-form-ctrl w-full" value={editForm.sospechoso} onChange={e => setEditForm(p => ({ ...p, sospechoso: e.target.value }))} /></div>
                    <div><label className="fib-form-label">Motivación</label><textarea className="fib-form-ctrl w-full" value={editForm.motivacion} onChange={e => setEditForm(p => ({ ...p, motivacion: e.target.value }))} /></div>
                    <div><label className="fib-form-label">Observaciones</label><textarea className="fib-form-ctrl w-full" style={{ minHeight: 60 }} value={editForm.observaciones} onChange={e => setEditForm(p => ({ ...p, observaciones: e.target.value }))} /></div>
                    <button onClick={async () => { setSending(true); try { await editarAllanamiento(itemId, { accion: 'editar', ...editForm }); await load(); onAction('Solicitud actualizada') } catch (e: any) { uiAlert(e?.message || 'Error', 'Allanamientos') } finally { setSending(false) } }} disabled={sending} className="fib-add-btn w-fit flex items-center gap-1.5" style={{ borderRadius: 3, fontSize: 10 }}><Pencil size={11} />Guardar cambios</button>
                  </div>
                </div>
              )}
              {[
                ['Sospechoso', item.sospechoso || '—'],
                ['Unidad', item.unidad],
                ['Solicitante', `${item.nombreSolicitante}${item.callsignSolicitante ? ` [${item.callsignSolicitante}]` : ''}`],
              ].map(([k, v]) => (
                <div key={k} className="fib-entry-item">
                  <p className="fib-entry-date">{k}</p>
                  <p style={{ fontSize: 13, color: 'var(--fib-text)' }}>{v}</p>
                </div>
              ))}
              <div className="fib-entry-item">
                <p className="fib-entry-date">Motivación</p>
                <p style={{ fontSize: 12, color: 'var(--fib-text2)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginTop: 4 }}>{item.motivacion}</p>
              </div>
              {item.descripcion && <div className="fib-entry-item"><p className="fib-entry-date">Descripción</p><p style={{ fontSize: 12, color: 'var(--fib-text2)', marginTop: 4 }}>{item.descripcion}</p></div>}
              {item.motivoDenegacion && <div className="fib-entry-item" style={{ borderLeftColor: 'var(--fib-red)' }}><p className="fib-entry-date" style={{ color: 'var(--fib-red2)' }}>Motivo de denegación</p><p style={{ fontSize: 12, color: '#FF8B7A', marginTop: 4 }}>{item.motivoDenegacion}</p></div>}
              {item.firmas?.length > 0 && (
                <div className="fib-entry-item" style={{ borderLeftColor: 'var(--fib-green)' }}>
                  <p className="fib-entry-date" style={{ color: 'var(--fib-green)' }}>Firmas ({item.firmas.length})</p>
                  {item.firmas.map((f: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 mt-1.5">
                      <PenTool size={10} style={{ color: 'var(--fib-green)', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#7FD49D' }}>{f.nombre}{f.callsign && ` [${f.callsign}]`}</span>
                      <span className="font-mono text-[8px] ml-auto" style={{ color: 'var(--fib-text4)' }}>{f.rol?.replace('_', ' ')} · {fmtDate(f.fecha)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CHAT */}
          {tab === 'chat' && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div ref={scrollRef} onScroll={onChatScroll} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(item.mensajes || []).map((m: any) => {
                  if (m.tipo === 'sistema' || m.tipo === 'accion') return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'center' }}>
                      <div className="font-mono text-[8px] italic py-1 px-3" style={{ background: 'rgba(8,11,15,0.7)', border: '1px solid var(--fib-border)', color: 'var(--fib-text4)' }}>
                        {m.contenido} · <span style={{ color: 'var(--fib-text4)' }}>{fmtDT(m.fecha)}</span>
                      </div>
                    </div>
                  )
                  if (m.tipo === 'documento') return (
                    <div key={m.id} style={{ border: '1px solid rgba(36,96,200,0.35)', background: 'rgba(36,96,200,0.07)', padding: 12 }}>
                      <p className="font-mono text-[8px] uppercase tracking-widest mb-1" style={{ color: '#7AABFF' }}>Documento de Allanamiento</p>
                      <p style={{ fontSize: 12, color: 'var(--fib-text2)', marginBottom: 8 }}>{m.contenido}</p>
                      {m.htmlSnapshot && <a href={m.htmlSnapshot} target="_blank" rel="noreferrer" style={{ display: 'block', border: '1px solid var(--fib-border)' }}><img src={m.htmlSnapshot} alt="Preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover' }} /></a>}
                      <p className="font-mono text-[8px] mt-2" style={{ color: 'var(--fib-text4)' }}>{fmtDT(m.fecha)}</p>
                    </div>
                  )
                  if (m.tipo === 'informe') {
                    const imgUrl = extractImgFromText(m.contenido)
                    const normalizedImg = imgUrl ? normalizeImgUrl(imgUrl) : ''
                    return (
                      <div key={m.id} style={{ border: '1px solid rgba(26,188,156,0.3)', background: 'rgba(26,188,156,0.06)', padding: 12 }}>
                        <p className="font-mono text-[8px] uppercase tracking-widest mb-1" style={{ color: 'var(--fib-cyan)' }}>Informe de Hallazgo</p>
                        <p style={{ fontSize: 12, color: 'var(--fib-text)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{m.contenido}</p>
                        {normalizedImg && isImgUrl(normalizedImg) && (
                          <a href={normalizedImg} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 8, border: '1px solid rgba(26,188,156,0.25)' }}>
                            <img src={normalizedImg} alt="Evidencia" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', background: 'rgba(0,0,0,0.3)' }} />
                          </a>
                        )}
                        <p className="font-mono text-[8px] mt-2" style={{ color: 'var(--fib-text4)' }}>{m.nombre} · {fmtDT(m.fecha)}</p>
                      </div>
                    )
                  }
                  // Normal message
                  const isMe = m.autor === user?.username
                  return (
                    <div key={m.id} style={{ display: 'flex', gap: 8, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                      <div style={{ width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, fontFamily: 'Oswald, sans-serif', marginTop: 2, background: isMe ? 'rgba(201,168,76,0.15)' : 'rgba(26,37,52,0.6)', border: `1px solid ${isMe ? 'var(--fib-gold-dim)' : 'var(--fib-border)'}`, color: isMe ? 'var(--fib-gold)' : 'var(--fib-text3)' }}>{m.nombre?.[0]}</div>
                      <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 2, alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexDirection: isMe ? 'row-reverse' : 'row' }}>
                          <span className="font-mono text-[9px]" style={{ color: isMe ? 'var(--fib-gold-dim)' : 'var(--fib-text3)' }}>{m.nombre}</span>
                          <span className="font-mono text-[8px]" style={{ color: 'var(--fib-text4)' }}>{fmtDT(m.fecha)}</span>
                        </div>
                        <div className={`fib-msg ${isMe ? 'me' : 'them'}`}>{m.contenido}</div>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {canChat && (
                <div style={{ padding: 12, borderTop: '1px solid var(--fib-border)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <form onSubmit={enviarMsg} style={{ display: 'flex', gap: 8 }}>
                    <input className="fib-chat-inp" value={mensaje} onChange={e => setMensaje(e.target.value)} placeholder="Escribe un mensaje..." disabled={sending} />
                    <button type="submit" disabled={sending || !mensaje.trim()} className="fib-send-btn"><Send size={13} /></button>
                  </form>
                  <form onSubmit={registrarHallazgo} style={{ border: '1px solid rgba(26,188,156,0.25)', background: 'rgba(26,188,156,0.04)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p className="font-mono text-[8px] uppercase tracking-widest" style={{ color: 'var(--fib-cyan)' }}>// Informe de captura / hallazgo</p>
                    <input className="fib-form-ctrl" style={{ fontSize: 12 }} value={hallazgo} onChange={e => setHallazgo(e.target.value)} placeholder="¿Qué se encontró? (armas, dinero, documentos...)" disabled={sending} />
                    <input className="fib-form-ctrl" style={{ fontSize: 12 }} value={propiedad} onChange={e => setPropiedad(e.target.value)} placeholder="Propiedad o ubicación" disabled={sending} />
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="fib-form-label" style={{ margin: 0 }}>Links evidencia (Imgur / imagen)</label>
                        {evidLinks.length < 8 && <button type="button" onClick={() => setEvidLinks(p => [...p, ''])} className="fib-action-btn" style={{ padding: '2px 8px', fontSize: 9 }}>+ URL</button>}
                      </div>
                      {evidLinks.map((l, i) => (
                        <div key={i} className="flex items-center gap-2 mb-1">
                          <input className="fib-form-ctrl flex-1" style={{ fontSize: 11 }} placeholder="https://i.imgur.com/..." value={l} onChange={e => setEvidLinks(p => { const n = [...p]; n[i] = e.target.value; return n })} />
                          {l && isImgUrl(l) && <img src={normalizeImgUrl(l)} alt="" style={{ width: 28, height: 28, objectFit: 'cover', border: '1px solid var(--fib-border)', flexShrink: 0 }} />}
                          {evidLinks.length > 1 && <button type="button" onClick={() => setEvidLinks(p => p.filter((_, j) => j !== i))} style={{ color: 'var(--fib-red2)', flexShrink: 0 }}><X size={13} /></button>}
                        </div>
                      ))}
                    </div>
                    <button type="submit" disabled={sending || !hallazgo.trim() || !propiedad.trim()} className="fib-action-btn" style={{ fontSize: 10, padding: '6px 14px' }}>{sending ? 'Registrando...' : 'REGISTRAR INFORME'}</button>
                  </form>
                </div>
              )}
              {!canChat && <div style={{ padding: 12, borderTop: '1px solid var(--fib-border)' }}><p className="font-mono text-[9px] text-center uppercase" style={{ color: 'var(--fib-text4)' }}>Solo lectura</p></div>}
            </div>
          )}

          {/* ÁLBUM */}
          {tab === 'album' && (
            <div style={{ height: '100%', overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="flex items-center justify-between">
                <div className="fib-section-label" style={{ margin: 0 }}>// álbum de evidencia fotográfica</div>
                <span className="font-mono text-[9px]" style={{ color: 'var(--fib-text4)' }}>{album.length}/20 entradas</span>
              </div>

              {album.length === 0 && (
                <div className="fib-panel-card p-10 text-center" style={{ opacity: 0.4 }}>
                  <Camera size={28} className="mx-auto mb-2" />
                  <p className="font-mono text-xs">Sin fotos en el álbum</p>
                </div>
              )}

              {album.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {album.map((entry, i: number) => {
                    const normalized = normalizeImgUrl(entry.url)
                    const isImg = isImgUrl(entry.url)
                    return (
                      <div key={i} className="fib-panel-card" style={{ overflow: 'hidden' }}>
                        {isImg ? (
                          <a href={normalized} target="_blank" rel="noreferrer" style={{ display: 'block', borderBottom: entry.descripcion ? '1px solid var(--fib-border)' : 'none' }}>
                            <img src={normalized} alt={`Foto ${i + 1}`}
                              style={{ width: '100%', maxHeight: 260, objectFit: 'contain', background: '#000', display: 'block' }}
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          </a>
                        ) : (
                          <a href={entry.url} target="_blank" rel="noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderBottom: entry.descripcion ? '1px solid var(--fib-border)' : 'none', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#7AABFF' }}>
                            <ExternalLink size={11} style={{ flexShrink: 0 }} />
                            <span style={{ wordBreak: 'break-all' }}>{entry.url}</span>
                          </a>
                        )}
                        {entry.descripcion && (
                          <div style={{ padding: '8px 14px', background: 'rgba(5,7,10,0.5)' }}>
                            <p style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'var(--fib-gold-dim)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>descripción</p>
                            <p style={{ fontSize: 12, color: 'var(--fib-text2)', lineHeight: 1.5 }}>{entry.descripcion}</p>
                          </div>
                        )}
                        <div style={{ padding: '4px 14px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'var(--fib-text4)' }}>FOTO {i + 1}</span>
                          {entry.fecha && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'var(--fib-text4)' }}>· {new Date(entry.fecha).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                          {isSuperv && (
                            <button onClick={() => editarAllanamiento(itemId, { removeFoto: entry.url }).then(() => load())}
                              style={{ marginLeft: 'auto', color: 'var(--fib-red2)', opacity: 0.6, fontSize: 9 }}
                              title="Eliminar foto">✕</button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {(isSuperv || item.solicitadoPor === user?.username) && album.length < 20 && (
                <div className="fib-panel-card">
                  <div className="fib-panel-card-header">// añadir evidencia al álbum</div>
                  <div className="fib-panel-card-body">
                    <AddFotoForm onAdd={addFotoToAlbum} saving={sending} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PDF */}
          {tab === 'pdf' && (
            <div style={{ height: '100%', overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="fib-panel-card">
                <div className="fib-panel-card-header">// descargar documento oficial</div>
                <div className="fib-panel-card-body flex flex-col gap-3">
                  <p style={{ fontSize: 12, color: 'var(--fib-text2)', lineHeight: 1.6 }}>Descarga el PDF oficial con todos los datos, observaciones y firmas registradas.</p>
                  <button onClick={descargarPDF} disabled={sending} className="fib-add-btn w-fit flex items-center gap-1.5" style={{ borderRadius: 3, fontSize: 11 }}><FileText size={12} />Descargar PDF</button>
                </div>
              </div>
              {isSuperv && !yafirmo && item.estado !== 'denegado' && (
                <div className="fib-panel-card">
                  <div className="fib-panel-card-header">// firmar documento</div>
                  <div className="fib-panel-card-body flex flex-col gap-2">
                    <p style={{ fontSize: 12, color: 'var(--fib-text2)' }}>Tu firma quedará registrada en el PDF.</p>
                    <button onClick={() => doAction('firmar', { tipoFirma: 'supervisor' })} disabled={sending} className="fib-add-btn w-fit flex items-center gap-1.5" style={{ borderRadius: 3, fontSize: 11 }}><PenTool size={12} />Firmar como {user?.rol?.replace('_', ' ')}</button>
                  </div>
                </div>
              )}
              {yafirmo && <div className="fib-entry-item" style={{ borderLeftColor: 'var(--fib-green)' }}><p style={{ fontSize: 12, color: '#7FD49D' }}>✅ Ya has firmado este documento.</p></div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AddFotoForm({ onAdd, saving }: { onAdd: (urls: string[], descripcion: string) => void; saving: boolean }) {
  const [urls, setUrls] = useState([''])
  const [descripcion, setDescripcion] = useState('')

  function setUrl(i: number, v: string) { setUrls(p => { const n = [...p]; n[i] = v; return n }) }
  function addUrl() { if (urls.length < 8) setUrls(p => [...p, '']) }
  function removeUrl(i: number) { setUrls(p => p.filter((_, j) => j !== i)) }

  const validUrls = urls.filter(u => u.trim() && /^https?:\/\//i.test(normalizeImgUrl(u.trim())))
  const canSubmit = validUrls.length > 0 && !saving

  function submit() {
    if (!canSubmit) return
    onAdd(urls, descripcion)
    setUrls([''])
    setDescripcion('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* URLs */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <label className="fib-form-label" style={{ margin: 0 }}>URL(s) de imagen / evidencia</label>
          {urls.length < 8 && (
            <button type="button" onClick={addUrl} className="fib-action-btn" style={{ padding: '2px 8px', fontSize: 9 }}>+ URL</button>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {urls.map((u, i) => {
            const normalized = normalizeImgUrl(u)
            const isImg = u && isImgUrl(u)
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    className="fib-form-ctrl flex-1"
                    style={{ fontSize: 11 }}
                    placeholder="https://i.imgur.com/... o link directo"
                    value={u}
                    onChange={e => setUrl(i, e.target.value)}
                  />
                  {urls.length > 1 && (
                    <button type="button" onClick={() => removeUrl(i)} style={{ color: 'var(--fib-red2)', flexShrink: 0 }}>
                      <X size={13} />
                    </button>
                  )}
                </div>
                {isImg && (
                  <img src={normalized} alt="Preview"
                    style={{ maxHeight: 100, objectFit: 'contain', border: '1px solid var(--fib-border)', background: 'rgba(0,0,0,0.3)', borderRadius: 2 }}
                    onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label className="fib-form-label">Descripción breve (opcional)</label>
        <textarea
          className="fib-form-ctrl w-full"
          rows={2}
          placeholder="¿Qué muestra esta evidencia? (ej: Arma incautada en dormitorio principal)"
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          style={{ resize: 'none', fontSize: 12 }}
        />
      </div>

      <button
        onClick={submit}
        disabled={!canSubmit}
        className="fib-add-btn w-fit"
        style={{ borderRadius: 3, fontSize: 10 }}
      >
        {saving ? 'AÑADIENDO...' : `AÑADIR AL ÁLBUM${validUrls.length > 1 ? ` (${validUrls.length} fotos)` : ''}`}
      </button>
    </div>
  )
}

/* ── Main page ─────────────────────────────────────────────────── */
export default function AllanamientosPage() {
  const [user, setUser] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [viewId, setViewId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [filtro, setFiltro] = useState('activos')
  const clock = useUtcClock()

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
    <div className="fib-panel-container">
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}
      {showCreate && user && <ModalCrear user={user} onClose={() => setShowCreate(false)} onSuccess={m => notify(m)} />}
      {viewId && <ModalAllanamiento itemId={viewId} user={user} onClose={() => setViewId(null)} onAction={m => notify(m)} />}

      {/* Topbar */}
      <div className="fib-topbar">
        <span className="fib-logo">FIB</span>
        <span className="fib-topbar-sep">|</span>
        <span className="fib-topbar-label">ALLANAMIENTOS</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="font-mono text-[9px]" style={{ color: 'var(--fib-text4)', fontFamily: 'Share Tech Mono, monospace' }}>{clock}</span>
          <button className="fib-sync-btn" onClick={load} style={{ marginLeft: 0 }}>↻ ACTUALIZAR</button>
          <button onClick={() => setShowCreate(true)} className="fib-add-btn" style={{ borderRadius: 3, fontSize: 10 }}>+ NUEVA SOLICITUD</button>
        </div>
      </div>

      <div className="fib-main">
        <div className="fib-section-label">// solicitudes de allanamiento</div>

        {/* Stats */}
        <div className="fib-agent-header" style={{ padding: '14px 20px', marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <div className="fib-agent-main-name" style={{ fontSize: 15 }}>Solicitudes de Allanamiento</div>
            <div className="fib-agent-callsign">Sistema de Gestión Operativa</div>
          </div>
          <div className="fib-agent-stats">
            {[
              ['Pendientes', items.filter(i => i.estado === 'pendiente').length, 'var(--fib-amber)'],
              ['Autorizados', items.filter(i => i.estado === 'autorizado').length, 'var(--fib-green)'],
              ['Ejecutados', items.filter(i => i.estado === 'ejecutado').length, '#7AABFF'],
              ['Denegados', items.filter(i => i.estado === 'denegado').length, 'var(--fib-red2)'],
            ].map(([l, n, c]) => (
              <div key={l as string} className="fib-stat-box">
                <div className="fib-stat-num" style={{ color: c as string, fontSize: 18 }}>{n as number}</div>
                <div className="fib-stat-lbl">{l as string}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <select className="fib-form-ctrl" style={{ width: 'auto', padding: '7px 12px' }} value={filtro} onChange={e => setFiltro(e.target.value)}>
            <option value="activos">Activos (pendiente/autorizado)</option>
            <option value="todos">Todos los estados</option>
            {['pendiente', 'autorizado', 'denegado', 'ejecutado'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={load} className="fib-action-btn py-2 px-3"><RefreshCw size={12} className={loading ? 'animate-spin' : ''} /></button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="fib-panel-card p-10 text-center"><p className="fib-section-label" style={{ margin: 0 }}>cargando solicitudes...</p></div>
        ) : items.length === 0 ? (
          <div className="fib-panel-card p-14 text-center" style={{ opacity: 0.4 }}>
            <Shield size={32} className="mx-auto mb-3" style={{ color: 'var(--fib-gold)' }} />
            <p className="font-mono text-xs tracking-widest uppercase">Sin solicitudes</p>
          </div>
        ) : (
          <div className="fib-panel-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="fib-records-table" style={{ minWidth: 720 }}>
                <thead>
                  <tr>{['N°', 'Dirección', 'Sospechoso', 'Estado', 'Unidad', 'Solicitante', 'Firmas', 'Fecha', ''].map(h => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {items.map(a => (
                    <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => setViewId(a.id)}>
                      <td><span className="font-mono text-[9px]" style={{ color: 'var(--fib-gold)' }}>{a.numeroSolicitud}</span></td>
                      <td style={{ maxWidth: 160 }}><span style={{ color: 'var(--fib-text)', fontWeight: 600 }} className="truncate block">{a.direccion}</span></td>
                      <td style={{ color: 'var(--fib-text3)', fontSize: 11, maxWidth: 100 }} className="truncate">{a.sospechoso || '—'}</td>
                      <td><span className={`fib-record-badge ${ESTADO_STYLE[a.estado] || ''}`}>{a.estado}</span></td>
                      <td style={{ color: 'var(--fib-text3)', fontSize: 11 }}>{a.unidad}</td>
                      <td style={{ color: 'var(--fib-text2)', fontSize: 11 }}>{a.nombreSolicitante}{a.callsignSolicitante && ` [${a.callsignSolicitante}]`}</td>
                      <td><span className="font-mono text-[9px]" style={{ color: 'var(--fib-text4)' }}>{a.firmas?.length || 0}</span></td>
                      <td><span className="font-mono text-[9px]" style={{ color: 'var(--fib-text4)', whiteSpace: 'nowrap' }}>{fmtDate(a.fechaSolicitud)}</span></td>
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          <span style={{ color: 'var(--fib-gold-dim)' }}>›</span>
                          {user?.rol === 'command_staff' && (
                            <button className="fib-action-btn" style={{ border: '1px solid rgba(192,57,43,0.3)', color: '#FF8B7A', padding: '2px 6px' }}
                              onClick={async (e) => {
                                e.stopPropagation()
                                if (!await uiConfirm(`¿Eliminar ${a.numeroSolicitud}?`, { tone: 'danger', title: 'Eliminar' })) return
                                try { await borrarAllanamiento(a.id); notify('Solicitud eliminada') }
                                catch (err: any) { notify(err.message || 'Error', false) }
                              }}
                              title="Eliminar">
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </td>
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
