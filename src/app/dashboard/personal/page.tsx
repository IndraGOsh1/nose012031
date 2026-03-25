'use client'
import { useEffect, useState, useCallback } from 'react'
import { Search, Plus, RefreshCw, ChevronRight, X, AlertCircle, CheckCircle } from 'lucide-react'
import { getPersonal, crearAgente, editarAgente, sancionar, getConfig } from '@/lib/client'
import { CONFIG, todosLosRangos } from '@/lib/config'

const ESTADO_TAG: Record<string,string> = {
  Activo:    'tag border-green-800 bg-green-900/20 text-green-400',
  Retirado:  'tag border-gray-700 bg-gray-800/40 text-gray-400',
  Expulsado: 'tag border-red-800 bg-red-900/20 text-red-400',
  Vetado:    'tag border-gray-800 bg-black text-gray-500',
}

function Toast({ msg, ok, onClose }: { msg:string; ok:boolean; onClose:()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [])
  return (
    <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-2 px-4 py-3 border font-mono text-xs ${ok ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-red-900/40 border-red-700 text-red-300'}`}>
      {ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
      {msg}
    </div>
  )
}

// ── Modal Registrar ───────────────────────────────────────────────────────────
function ModalRegistrar({ onClose, onSuccess }: { onClose:()=>void; onSuccess:(m:string)=>void }) {
  const [form, setForm] = useState({ nombre:'', apodo:'', rango:'Training Agent', discordId:'', numeroForzado:'' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => setForm(f=>({...f,[k]:e.target.value}))

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await crearAgente({ nombre: form.nombre, apodo: form.apodo, rango: form.rango, discordId: form.discordId, numeroForzado: form.numeroForzado ? parseInt(form.numeroForzado) : undefined })
      onSuccess(`Agente "${form.nombre}" registrado correctamente`)
      onClose()
    } catch(err:any) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div className="flex items-center justify-between px-5 py-4 border-b border-bg-border">
          <div>
            <span className="section-tag">// Registrar Agente</span>
            <p className="font-display text-sm font-semibold tracking-wider uppercase text-tx-primary mt-0.5">Nuevo Agente</p>
          </div>
          <button onClick={onClose} className="text-tx-muted hover:text-tx-primary"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="p-5 flex flex-col gap-3.5">
          <div>
            <label className="label">Nombre y Apellido (IC) *</label>
            <input className="input" value={form.nombre} onChange={set('nombre')} placeholder="Juan García" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Apodo / Callsign</label>
              <input className="input" value={form.apodo} onChange={set('apodo')} placeholder="Alpha" />
            </div>
            <div>
              <label className="label">N° Agente (opcional)</label>
              <input className="input" type="number" value={form.numeroForzado} onChange={set('numeroForzado')} placeholder="Auto" />
            </div>
          </div>
          <div>
            <label className="label">Rango Inicial *</label>
            <select className="input" value={form.rango} onChange={set('rango')}>
              {Object.entries(CONFIG.rangos).map(([sec, rangos]) => (
                <optgroup key={sec} label={sec}>
                  {rangos.map(r => <option key={r} value={r}>{r}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Discord ID (opcional)</label>
            <input className="input" value={form.discordId} onChange={set('discordId')} placeholder="123456789012345678" />
          </div>
          {error && <div className="flex items-center gap-2 p-2.5 bg-red-950/30 border border-red-900/50 text-red-400 text-xs font-mono"><AlertCircle size={12}/>{error}</div>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">{loading ? 'Guardando...' : 'Registrar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal Ficha completa + edición ────────────────────────────────────────────
function ModalFicha({ agente, user, onClose, onSuccess }: { agente:any; user:any; onClose:()=>void; onSuccess:(m:string)=>void }) {
  const [tab, setTab]         = useState<'ficha'|'editar'|'sancionar'|'historial'>('ficha')
  const [edit, setEdit]       = useState({ rango: agente.rango, apodo: agente.apodo, discordId: agente.discordId, especial: agente.especial })
  const [sancion, setSancion] = useState({ tipo:'Leve', motivo:'' })
  const [motivo, setMotivo]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const isCS = user?.rol === 'command_staff'
  const isSuperv = ['command_staff','supervisory'].includes(user?.rol)

  async function guardarEdicion() {
    setLoading(true); setError('')
    try {
      await editarAgente(agente.nombre, edit)
      onSuccess('Agente actualizado'); onClose()
    } catch(e:any) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function cambiarEstado(estado: string) {
    if (!motivo.trim()) { setError('El motivo es requerido'); return }
    setLoading(true); setError('')
    try {
      await editarAgente(agente.nombre, { estado, motivo, reingreso: estado === 'Activo' && agente.estado !== 'Activo' })
      onSuccess(`Agente marcado como ${estado}`); onClose()
    } catch(e:any) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function aplicarSancion() {
    if (!sancion.motivo.trim()) { setError('El motivo es requerido'); return }
    setLoading(true); setError('')
    try {
      const r = await sancionar(agente.nombre, sancion)
      let msg = `Sanción ${sancion.tipo} aplicada`
      if (r.escalado?.length) msg += ` · Escalado: ${r.escalado.join(', ')}`
      if (r.expulsado) msg = '⚠️ EXPULSIÓN AUTOMÁTICA — 2 graves acumuladas'
      onSuccess(msg); onClose()
    } catch(e:any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const TABS = [
    { id:'ficha',     label:'Ficha' },
    { id:'editar',    label:'Editar',    hidden: !isSuperv },
    { id:'sancionar', label:'Sancionar', hidden: !isSuperv },
    { id:'historial', label:'Historial' },
  ].filter(t => !t.hidden)

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal w-full max-w-xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-bg-border">
          <div>
            <p className="font-mono text-[9px] text-accent-blue tracking-widest uppercase">#{agente.numero}</p>
            <p className="font-display text-sm font-semibold tracking-wider uppercase text-tx-primary">{agente.nombre}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={ESTADO_TAG[agente.estado] || 'tag border-bg-border text-tx-muted'}>{agente.estado}</span>
            <button onClick={onClose} className="text-tx-muted hover:text-tx-primary"><X size={15} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-bg-border">
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id as any); setError('') }}
              className={`px-4 py-2.5 font-mono text-[9px] tracking-widest uppercase transition-all border-b-2 -mb-px ${tab===t.id ? 'border-accent-blue text-accent-blue' : 'border-transparent text-tx-muted hover:text-tx-secondary'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* FICHA */}
          {tab === 'ficha' && (
            <div className="grid grid-cols-2 gap-3">
              {[
                ['N° Agente', `#${agente.numero}`],
                ['Rango', agente.rango],
                ['Sección', agente.seccion],
                ['Apodo', agente.apodo || '—'],
                ['Ingreso', agente.fechaIngreso || '—'],
                ['Baja', agente.fechaBaja || '—'],
                ['Reingresos', agente.reingresos || '0'],
                ['Discord', agente.discordId || '—'],
              ].map(([k,v]) => (
                <div key={k} className="bg-bg-surface border border-bg-border p-2.5">
                  <p className="font-mono text-[8px] text-tx-muted tracking-widest uppercase mb-0.5">{k}</p>
                  <p className="text-xs text-tx-primary font-mono truncate">{v}</p>
                </div>
              ))}
              <div className="col-span-2 bg-bg-surface border border-bg-border p-2.5">
                <p className="font-mono text-[8px] text-tx-muted tracking-widest uppercase mb-0.5">Especialidades</p>
                <p className="text-xs text-tx-primary">{agente.especial || '—'}</p>
              </div>
              <div className="col-span-2 bg-bg-surface border border-bg-border p-2.5">
                <p className="font-mono text-[8px] text-tx-muted tracking-widest uppercase mb-1">Sanciones</p>
                <div className="flex gap-4">
                  <span className="font-mono text-[10px] text-yellow-400">🟡 {agente.sLeves} Leves</span>
                  <span className="font-mono text-[10px] text-orange-400">🟠 {agente.sModeradas} Mod.</span>
                  <span className="font-mono text-[10px] text-red-400">🔴 {agente.sGraves} Graves</span>
                </div>
              </div>
              {agente.notas && (
                <div className="col-span-2 bg-bg-surface border border-bg-border p-2.5">
                  <p className="font-mono text-[8px] text-tx-muted tracking-widest uppercase mb-0.5">Notas</p>
                  <p className="text-xs text-tx-secondary whitespace-pre-wrap">{agente.notas}</p>
                </div>
              )}
            </div>
          )}

          {/* EDITAR */}
          {tab === 'editar' && (
            <div className="flex flex-col gap-3.5">
              <div>
                <label className="label">Rango</label>
                <select className="input" value={edit.rango} onChange={e => setEdit(p=>({...p,rango:e.target.value}))}>
                  {Object.entries(CONFIG.rangos).map(([sec,rangos]) => (
                    <optgroup key={sec} label={sec}>
                      {rangos.map(r => <option key={r} value={r}>{r}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Apodo</label>
                  <input className="input" value={edit.apodo} onChange={e => setEdit(p=>({...p,apodo:e.target.value}))} />
                </div>
                <div>
                  <label className="label">Discord ID</label>
                  <input className="input" value={edit.discordId} onChange={e => setEdit(p=>({...p,discordId:e.target.value}))} />
                </div>
              </div>
              <div>
                <label className="label">Especialidades (separadas por coma)</label>
                <input className="input" value={edit.especial} onChange={e => setEdit(p=>({...p,especial:e.target.value}))} placeholder="CIRG: Operator, ERT: Member" />
              </div>

              {/* Estado */}
              <div className="border border-bg-border p-3">
                <label className="label">Cambiar Estado</label>
                <input className="input mb-2" value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Motivo (requerido)" />
                <div className="flex gap-2 flex-wrap">
                  {agente.estado !== 'Activo'    && <button onClick={()=>cambiarEstado('Activo')}    className="btn-success text-[9px] py-1.5 px-3">Activar</button>}
                  {agente.estado === 'Activo'    && <button onClick={()=>cambiarEstado('Retirado')}  className="btn-ghost   text-[9px] py-1.5 px-3">Dar de Baja</button>}
                  {agente.estado !== 'Vetado'    && isCS   && <button onClick={()=>cambiarEstado('Vetado')}    className="btn-danger text-[9px] py-1.5 px-3">VETAR</button>}
                </div>
              </div>

              {error && <p className="font-mono text-xs text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
                <button onClick={guardarEdicion} disabled={loading} className="btn-primary flex-1 justify-center">{loading?'Guardando...':'Guardar'}</button>
              </div>
            </div>
          )}

          {/* SANCIONAR */}
          {tab === 'sancionar' && (
            <div className="flex flex-col gap-3.5">
              <div className="bg-bg-surface border border-bg-border p-3 font-mono text-xs">
                <div className="flex gap-4">
                  <span className="text-yellow-400">🟡 {agente.sLeves} Leves</span>
                  <span className="text-orange-400">🟠 {agente.sModeradas} Moderadas</span>
                  <span className="text-red-400">🔴 {agente.sGraves} Graves</span>
                </div>
                <p className="text-tx-muted text-[9px] mt-1.5">Escalado: 3L→Mod · 3M→Grave · 2G→Expulsión</p>
              </div>
              <div>
                <label className="label">Tipo de Sanción</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Leve','Moderada','Grave'].map(t => (
                    <button key={t} onClick={()=>setSancion(p=>({...p,tipo:t}))}
                      className={`py-2 font-mono text-[9px] tracking-widest uppercase border transition-all ${sancion.tipo===t ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' : 'border-bg-border text-tx-muted hover:border-tx-muted'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Motivo *</label>
                <input className="input" value={sancion.motivo} onChange={e=>setSancion(p=>({...p,motivo:e.target.value}))} placeholder="Describe el motivo de la sanción" required />
              </div>
              {error && <p className="font-mono text-xs text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
                <button onClick={aplicarSancion} disabled={loading} className="btn-danger flex-1 justify-center">{loading?'Aplicando...':'Aplicar Sanción'}</button>
              </div>
            </div>
          )}

          {/* HISTORIAL */}
          {tab === 'historial' && (
            <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto">
              {agente.historial?.length ? agente.historial.map((h: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-2.5 bg-bg-surface border border-bg-border">
                  <span className="font-mono text-[8px] text-tx-muted shrink-0 mt-0.5">{h.fecha}</span>
                  <div className="min-w-0">
                    <p className="font-mono text-[9px] text-accent-blue uppercase">{h.accion}</p>
                    <p className="text-xs text-tx-secondary truncate">{h.detalle}</p>
                    <p className="font-mono text-[8px] text-tx-muted">por {h.responsable}</p>
                  </div>
                </div>
              )) : <p className="text-center py-8 font-mono text-xs text-tx-muted">Sin historial</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Página Principal ──────────────────────────────────────────────────────────
export default function PersonalPage() {
  const [user,    setUser]    = useState<any>(null)
  const [agentes, setAgentes] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [toast,   setToast]   = useState<{msg:string;ok:boolean}|null>(null)
  const [search,  setSearch]  = useState('')
  const [filtroEstado,  setFiltroEstado]  = useState('')
  const [filtroSeccion, setFiltroSeccion] = useState('')

  useEffect(() => {
    const u = localStorage.getItem('fib_user')
    if (u) setUser(JSON.parse(u))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p: Record<string,string> = {}
      if (filtroEstado)  p.estado  = filtroEstado
      if (filtroSeccion) p.seccion = filtroSeccion
      if (search)        p.q       = search
      const d = await getPersonal(p)
      setAgentes(d.agentes || [])
    } catch {}
    finally { setLoading(false) }
  }, [filtroEstado, filtroSeccion, search])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const interval = setInterval(() => {
      load()
    }, 35_000)
    return () => clearInterval(interval)
  }, [load])

  async function openFicha(a: any) {
    try {
      const { getAgente } = await import('@/lib/client')
      const full = await getAgente(a.nombre)
      setSelected(full)
    } catch { setSelected(a) }
  }

  const notify = (msg: string, ok=true) => { setToast({msg,ok}); load() }
  const isSuperv = ['command_staff','supervisory'].includes(user?.rol)

  return (
    <div className="max-w-6xl mx-auto">
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={()=>setToast(null)} />}
      {showCreate && <ModalRegistrar onClose={()=>setShowCreate(false)} onSuccess={m=>notify(m)} />}
      {selected   && <ModalFicha agente={selected} user={user} onClose={()=>setSelected(null)} onSuccess={m=>notify(m)} />}

      <div className="flex items-center justify-between mb-5">
        <div className="page-header mb-0">
          <span className="section-tag">// Personal</span>
          <h1 className="font-display text-xl font-semibold tracking-wider uppercase text-tx-primary mt-0.5">Tabla de Agentes</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost py-2 px-3"><RefreshCw size={12} className={loading?'animate-spin':''} /></button>
          {isSuperv && <button onClick={()=>setShowCreate(true)} className="btn-primary py-2"><Plus size={12} />Registrar</button>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx-muted" />
          <input className="input pl-8 py-2 text-xs" placeholder="Nombre, apodo o número..." value={search} onChange={e=>{setSearch(e.target.value)}} />
        </div>
        <select className="input py-2 text-xs w-auto" value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {['Activo','Retirado','Expulsado','Vetado'].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input py-2 text-xs w-auto" value={filtroSeccion} onChange={e=>setFiltroSeccion(e.target.value)}>
          <option value="">Todas las secciones</option>
          {Object.keys(CONFIG.rangos).map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bg-border">
              {['#','Nombre','Apodo','Sección','Rango','Estado','Especialidades','Ingreso',''].map(h=>(
                <th key={h} className="table-head whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12 font-mono text-xs text-tx-muted">Cargando...</td></tr>
            ) : agentes.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 font-mono text-xs text-tx-muted">Sin resultados</td></tr>
            ) : agentes.map(a => (
              <tr key={a.numero} className="table-row cursor-pointer" onClick={()=>openFicha(a)}>
                <td className="table-cell font-mono text-xs text-accent-blue">#{a.numero}</td>
                <td className="table-cell font-medium text-tx-primary whitespace-nowrap">{a.nombre}</td>
                <td className="table-cell text-tx-secondary text-xs">{a.apodo||'—'}</td>
                <td className="table-cell text-tx-muted text-xs whitespace-nowrap">{a.seccion}</td>
                <td className="table-cell text-tx-secondary text-xs whitespace-nowrap">{a.rango}</td>
                <td className="table-cell"><span className={ESTADO_TAG[a.estado]||'tag border-bg-border text-tx-muted'}>{a.estado}</span></td>
                <td className="table-cell text-tx-muted text-xs max-w-32 truncate">{a.especial||'—'}</td>
                <td className="table-cell font-mono text-[10px] text-tx-muted whitespace-nowrap">{a.fechaIngreso}</td>
                <td className="table-cell"><ChevronRight size={13} className="text-tx-muted" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && (
          <div className="px-4 py-2 border-t border-bg-border">
            <span className="font-mono text-[8px] text-tx-muted tracking-widest">{agentes.length} agente{agentes.length!==1?'s':''} encontrado{agentes.length!==1?'s':''}</span>
          </div>
        )}
      </div>
    </div>
  )
}
